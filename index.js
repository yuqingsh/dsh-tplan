const name = "tplan";
const inject = ["connection"];
function apply(ctx) {
    const getCredentials = () => ctx.get('credentials')
    const getTokenMeter = () => ctx.get('tokenMeter')

    const PLANS = {
      deepseek: { label: 'DeepSeek', ref: 'DEEPSEEK_API_KEY', kind: 'balance', baseURL: 'https://api.deepseek.com', quotaPath: '/user/balance', unit: '¥' },
      minimax: { label: 'MiniMax Token Plan', ref: 'MINIMAX_CN_API_KEY', kind: 'token-plan', baseURL: 'https://api.minimaxi.com', quotaPath: '/v1/token_plan/remains', unit: 'tokens' },
      kimi: { label: 'Kimi For Coding', ref: 'KIMI_API_KEY', kind: 'none', baseURL: '', quotaPath: '', unit: 'tokens' },
    }
    const ROUTE_HINT = { deepseek: /deepseek/i, minimax: /minimax/i, kimi: /kimi|moonshot/i }

    const usage = {}
    const quotaCache = {}
    const manualTotals = {}

    function ensure(key) {
      return usage[key] || (usage[key] = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, calls: 0, estimated: 0, models: {} })
    }
    function planFor(provider) {
      for (const key of Object.keys(PLANS)) {
        if (ROUTE_HINT[key].test(provider)) return key
      }
      return null
    }

    ctx.on('llm/stream', (options, next) => {
      const provider = String((options && options.provider) || '')
      const model = String((options && options.model) || '')
      let seen = null
      let ok = null
      const src = next()
      return (async function* () {
        try {
          for await (const chunk of src) {
            if (chunk && chunk.type === 'usage' && chunk.usage) seen = chunk.usage
            if (chunk && chunk.type === 'finish' && chunk.reason) {
              ok = chunk.reason.kind === 'stop' || chunk.reason.kind === 'tool-calls'
            }
            yield chunk
          }
        } finally {
          if (seen !== null || ok === true) {
            const key = planFor(provider)
            const entry = ensure(key === null ? 'other:' + provider : key)
            entry.calls += 1
            if (seen !== null) {
              entry.input += Number(seen.inputTokens) || 0
              entry.output += Number(seen.outputTokens) || 0
              entry.cacheRead += Number(seen.cacheReadTokens) || 0
              entry.cacheWrite += Number(seen.cacheWriteTokens) || 0
              entry.reasoning += Number(seen.reasoningTokens) || 0
            } else if (ok === true && options && Array.isArray(options.messages)) {
              const tokenMeter = getTokenMeter()
              if (tokenMeter !== undefined) {
                let est = 0
                for (const m of options.messages) {
                  try { est += Number(tokenMeter.estimateMessage(m)) || 0 } catch (e) { /* ignore */ }
                }
                entry.input += est
                entry.estimated += 1
              }
            }
            entry.models[model] = (entry.models[model] || 0) + 1
          }
        }
      })()
    })

    function parseDeepSeek(data) {
      const infos = data && Array.isArray(data.balance_infos) ? data.balance_infos : []
      if (infos.length === 0) return { ok: false, message: '响应中无余额数据' }
      let total = 0, granted = 0, topped = 0
      for (const b of infos) {
        total += Number(b.total_balance) || 0
        granted += Number(b.granted_balance) || 0
        topped += Number(b.topped_up_balance) || 0
      }
      return { ok: true, value: total, unit: '¥', detail: '赠送 ' + granted.toFixed(2) + ' + 充值 ' + topped.toFixed(2) }
    }

    function parseMiniMax(data) {
      const d = data && data.data && typeof data.data === 'object' ? data.data : data
      const remainRaw = d && typeof d === 'object' && d.remain !== undefined ? Number(d.remain) : null
      if (remainRaw !== null && Number.isFinite(remainRaw)) {
        return { ok: true, value: remainRaw, unit: 'tokens', detail: '套餐剩余 tokens' }
      }
      const list = d && typeof d === 'object' && Array.isArray(d.model_remains) ? d.model_remains
        : (data && Array.isArray(data.model_remains) ? data.model_remains : null)
      if (list !== null && list.length > 0) {
        let total = 0, used = 0, remainSum = null, percent = null
        const parts = []
        for (const m of list) {
          const t = Number(m.current_interval_total_count) || 0
          const u = Number(m.current_interval_usage_count) || 0
          const name = m.model_name ? String(m.model_name) : null
          if (t > 0) { total += t; used += u }
          const rc = m.current_interval_remaining_count !== undefined ? Number(m.current_interval_remaining_count)
            : (m.current_interval_remains_count !== undefined ? Number(m.current_interval_remains_count) : null)
          if (rc !== null && Number.isFinite(rc)) remainSum = (remainSum === null ? 0 : remainSum) + rc
          const rp = m.current_interval_remaining_percent !== undefined ? Number(m.current_interval_remaining_percent) : null
          if (rp !== null && Number.isFinite(rp)) {
            if (percent === null) percent = rp
            if (name !== null) parts.push(name + ' ' + Math.round(rp) + '%')
          }
        }
        if (total > 0) {
          const rem = remainSum !== null ? remainSum : (total - used)
          return { ok: true, value: rem, total: total, unit: 'tokens',
            percent: percent !== null ? percent : Math.max(0, Math.min(100, rem / total * 100)),
            detail: '套餐剩余 tokens' + (parts.length > 0 ? ' · ' + parts.join(', ') : '') }
        }
        if (percent !== null) {
          return { ok: true, value: null, unit: '%', percent: percent,
            detail: parts.length > 0 ? '剩余比例 ' + parts.join(', ') : '套餐剩余比例' }
        }
      }
      const msg = data && data.base_resp && data.base_resp.status_msg ? String(data.base_resp.status_msg) : ''
      return { ok: false, message: '无法识别的 MiniMax 响应结构' + (msg ? ' (' + msg + ')' : '') }
    }

    function plainQuota(planKey, parsed, configured, extraMessage) {
      const plan = PLANS[planKey]
      const out = { ok: false, configured: !!configured, value: null, unit: plan.unit, at: Date.now(), message: '未知状态' }
      if (parsed === null || parsed === undefined) {
        out.message = typeof extraMessage === 'string' ? extraMessage : out.message
        return out
      }
      out.ok = parsed.ok === true
      out.message = typeof parsed.message === 'string' ? parsed.message : (out.ok ? '' : '查询失败')
      out.value = parsed.value !== undefined && parsed.value !== null ? Number(parsed.value) : null
      if (parsed.unit !== undefined && parsed.unit !== null) out.unit = String(parsed.unit)
      if (parsed.total !== undefined && parsed.total !== null) out.total = Number(parsed.total)
      if (parsed.percent !== undefined && parsed.percent !== null) out.percent = Number(parsed.percent)
      if (parsed.detail !== undefined && parsed.detail !== null) out.detail = String(parsed.detail)
      return out
    }

    async function fetchQuota(planKey) {
      const plan = PLANS[planKey]
      const credentials = getCredentials()
      if (credentials === undefined) return plainQuota(planKey, { ok: false, message: '凭据服务不可用' }, false)
      let cred
      try { cred = await credentials.resolve(plan.ref) } catch (e) { return plainQuota(planKey, { ok: false, message: '凭据解析失败' }, false) }
      if (cred === undefined || cred.value === undefined || cred.value === '') {
        return plainQuota(planKey, { ok: false, message: '未配置 API Key' }, false)
      }
      if (plan.kind === 'none') {
        return plainQuota(planKey, { ok: true, message: '无公开额度接口，仅统计本会话实测用量' }, true)
      }
      const url = plan.baseURL + plan.quotaPath
      try {
        const res = await fetch(url, {
          headers: { Authorization: 'Bearer ' + cred.value, Accept: 'application/json' },
          signal: AbortSignal.timeout(30000),
        })
        const text = await res.text()
        if (!res.ok) {
          return plainQuota(planKey, { ok: false, message: '查询失败(HTTP ' + res.status + ')' + (text ? ': ' + String(text).slice(0, 120) : '') }, true)
        }
        let data
        try { data = JSON.parse(text) } catch (e) { return plainQuota(planKey, { ok: false, message: '响应不是 JSON' }, true) }
        const parsed = plan.kind === 'balance' ? parseDeepSeek(data) : parseMiniMax(data)
        return plainQuota(planKey, parsed, true)
      } catch (e) {
        return plainQuota(planKey, { ok: false, message: '查询异常: ' + String((e && e.message) || e).slice(0, 160) }, true)
      }
    }

    async function quotaInfo(planKey) {
      let info = { configured: false, writable: true, source: null }
      const credentials = getCredentials()
      if (credentials !== undefined) {
        try {
          const desc = await credentials.describe(PLANS[planKey].ref)
          if (desc) info = { configured: !!desc.configured, writable: !!desc.writable, source: desc.source ? String(desc.source) : null }
        } catch (e) { /* keep defaults */ }
      }
      return info
    }

    async function getState() {
      const now = Date.now()
      const plans = {}
      for (const key of Object.keys(PLANS)) {
        const plan = PLANS[key]
        const cached = quotaCache[key]
        if (cached === undefined || now - cached.at > 60000) {
          quotaCache[key] = await fetchQuota(key)
        }
        const u = usage[key]
        plans[key] = {
          label: plan.label, ref: plan.ref, kind: plan.kind, unit: plan.unit,
          usage: u ? {
            input: u.input, output: u.output, cacheRead: u.cacheRead, cacheWrite: u.cacheWrite,
            reasoning: u.reasoning, calls: u.calls, estimated: u.estimated, models: u.models,
          } : null,
          quota: quotaCache[key] || null,
          cred: await quotaInfo(key),
          manualTotal: manualTotals[key] || null,
        }
      }
      const others = {}
      for (const key of Object.keys(usage)) {
        if (PLANS[key] !== undefined) continue
        const u = usage[key]
        others[key] = { input: u.input, output: u.output, cacheRead: u.cacheRead, cacheWrite: u.cacheWrite, reasoning: u.reasoning, calls: u.calls, models: u.models }
      }
      return { plans: plans, others: others, at: now }
    }

    async function setKey(args) {
      const planKey = args && args.plan
      const plan = PLANS[planKey]
      if (plan === undefined) return { ok: false, error: '未知套餐' }
      const credentials = getCredentials()
      if (credentials === undefined) return { ok: false, error: '凭据服务不可用' }
      const desc = await credentials.describe(plan.ref)
      const value = args && args.value
      if (value === '' || value === null) {
        if (!desc.writable) return { ok: false, error: '该 key 由只读来源(环境变量)提供，请修改 shell 环境后重启' }
        await credentials.unset(plan.ref)
      } else {
        if (!desc.writable) return { ok: false, error: '该 key 由只读来源(环境变量)提供，无法在面板覆盖' }
        await credentials.set(plan.ref, String(value))
      }
      delete quotaCache[planKey]
      return { ok: true }
    }

    function setTotal(args) {
      const planKey = args && args.plan
      if (PLANS[planKey] === undefined) return { ok: false, error: '未知套餐' }
      const n = Number(args && args.total)
      manualTotals[planKey] = Number.isFinite(n) && n > 0 ? n : null
      return { ok: true, total: manualTotals[planKey] }
    }

    const connection = ctx.get("connection");
    if (connection === void 0) throw new Error("tplan: the connection service is unavailable");
    connection.rpc.handle("/tplan", async (endpoint, payload) => {
      try {
        if (endpoint === "get-state") return { ok: true, value: await getState() };
        if (endpoint === "set-key") return { ok: true, value: await setKey(payload) };
        if (endpoint === "set-total") return { ok: true, value: setTotal(payload) };
        throw new Error("tplan: unknown endpoint " + JSON.stringify(endpoint));
      } catch (error) {
        return { ok: false, error: { code: "bad-request", message: String((error && error.message) || error), details: { issues: [] } } };
      }
    }, { authority: "loopback" });
  }
export { apply, inject, name };
