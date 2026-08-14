window.__ModuleLoader__.load({
	id: "dsh-tplan",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const name = "tplan";
		const inject = ["slots", "connection"];
		let rpcCall = null;
		function insertStyles(css) {
			const id = "dsh-tplan-styles";
			if (document.getElementById(id) !== null) return;
			const el = document.createElement("style");
			el.id = id;
			el.setAttribute("data-plugin", "dsh-tplan");
			el.textContent = css;
			document.head.appendChild(el);
		}
function apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return
    const conn = ctx.get('connection')
    if (conn === void 0) throw new Error('tplan: connection service unavailable')
    rpcCall = (method, payload) => conn.rpc.call('/tplan', method, payload)
    function rpcValue(envelope) {
      if (envelope && envelope.ok === true) return { ok: true, value: envelope.value }
      if (envelope && envelope.ok === false && envelope.error) return { ok: false, error: envelope.error.message || String(envelope.error) }
      return { ok: false, error: 'RPC 响应格式异常' }
    }

    insertStyles('\
.tplan-root { position: fixed; right: 20px; bottom: 20px; z-index: 99999; pointer-events: auto; font: 12px/1.5 system-ui, -apple-system, "PingFang SC", sans-serif; color: #e8eaf2; }\
.tplan-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; background: rgba(24,26,38,.94); border: 1px solid rgba(124,156,255,.35); box-shadow: 0 4px 16px rgba(0,0,0,.35); cursor: pointer; user-select: none; backdrop-filter: blur(8px); }\
.tplan-dot { width: 8px; height: 8px; border-radius: 50%; background: #5dd39e; }\
.tplan-pill-num { color: #a9b4ff; font-weight: 600; }\
.tplan-caret { color: #8b93b8; }\
.tplan-panel { position: absolute; right: 0; bottom: 44px; width: 340px; max-height: 72vh; overflow: auto; background: rgba(21,23,34,.97); border: 1px solid rgba(124,156,255,.25); border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.5); padding: 14px; backdrop-filter: blur(10px); }\
.tplan-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }\
.tplan-title { font-weight: 700; font-size: 13px; }\
.tplan-updated { color: #8b93b8; flex: 1; text-align: right; }\
.tplan-btn { background: rgba(124,156,255,.15); border: 1px solid rgba(124,156,255,.3); color: #cdd4ff; border-radius: 6px; padding: 3px 10px; cursor: pointer; font-size: 11px; }\
.tplan-card { border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 10px; margin-bottom: 10px; background: rgba(255,255,255,.03); }\
.tplan-card-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }\
.tplan-card-name { font-weight: 700; }\
.tplan-badge { font-size: 10px; padding: 1px 6px; border-radius: 999px; border: 1px solid rgba(255,255,255,.15); color: #9aa1c0; }\
.tplan-badge.ok { color: #5dd39e; border-color: rgba(93,211,158,.4); }\
.tplan-badge.ro { color: #ffb86b; border-color: rgba(255,184,107,.4); }\
.tplan-row { color: #b9c0da; margin: 2px 0; }\
.tplan-row b { color: #e8eaf2; font-weight: 600; }\
.tplan-bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.1); overflow: hidden; margin: 6px 0; }\
.tplan-bar-fill { height: 100%; border-radius: 3px; transition: width .4s; }\
.tplan-input { width: 100%; box-sizing: border-box; background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.15); color: #e8eaf2; border-radius: 6px; padding: 4px 8px; font-size: 11px; margin-top: 4px; }\
.tplan-err { color: #ff8f8f; margin-bottom: 8px; }\
.tplan-msg { color: #5dd39e; margin-bottom: 8px; }\
.tplan-others, .tplan-foot { color: #767d9e; font-size: 11px; margin-top: 6px; }\
.tplan-foot { border-top: 1px solid rgba(255,255,255,.08); padding-top: 6px; }\
')

    function fmt(n) {
      if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
      n = Number(n)
      if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿'
      if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + '万'
      return String(Math.round(n))
    }

    function Bar(props) {
      const pct = Math.max(0, Math.min(100, Number(props.pct) || 0))
      return React.createElement('div', { className: 'tplan-bar' },
        React.createElement('div', { className: 'tplan-bar-fill', style: { width: pct + '%', background: props.color || '#7c9cff' } }))
    }

    function Card(props) {
      const p = props.plan
      const u = p.usage
      const q = p.quota
      const cred = p.cred || {}
      const consumed = u ? (u.input + u.output + (u.cacheRead || 0) + (u.cacheWrite || 0)) : 0
      const k = props.planKey
      const keyVal = (props.inputs || {})[k]
      const totalVal = (props.totals || {})[k]

      let barPct = null
      if (q && q.ok && q.percent !== undefined && q.percent !== null) barPct = 100 - q.percent
      if (barPct === null && p.manualTotal && consumed > 0) barPct = Math.min(100, consumed / p.manualTotal * 100)

      const rows = [
        u ? React.createElement('div', { key: 'u1', className: 'tplan-row' },
          React.createElement('b', null, '本会话'), ' 输入 ', React.createElement('b', null, fmt(u.input)),
          ' · 输出 ', React.createElement('b', null, fmt(u.output)),
          ' · 缓存 ', React.createElement('b', null, fmt(u.cacheRead + u.cacheWrite)),
          ' · 思考 ', React.createElement('b', null, fmt(u.reasoning)),
          ' · 调用 ', React.createElement('b', null, String(u.calls)),
          u.estimated > 0 ? ' (部分为估算)' : '') : null,
        u && u.models && Object.keys(u.models).length > 0 ? React.createElement('div', { key: 'm', className: 'tplan-row' }, '模型: ' + Object.keys(u.models).join(', ')) : null,
        q && q.ok && q.value !== null ? React.createElement('div', { key: 'q', className: 'tplan-row' },
          React.createElement('b', null, q.unit === '¥' ? '余额 ¥' + Number(q.value).toFixed(2) : '套餐剩余 ' + fmt(q.value) + ' tokens'),
          q.detail ? ' (' + q.detail + ')' : '') : null,
        q && q.ok && q.value === null && q.percent !== undefined && q.percent !== null ? React.createElement('div', { key: 'qp', className: 'tplan-row' },
          React.createElement('b', null, '剩余 ' + Math.round(Number(q.percent)) + '%'),
          q.detail ? ' (' + q.detail + ')' : '') : null,
        q && !q.ok ? React.createElement('div', { key: 'qe', className: 'tplan-row', style: { color: '#ffb86b' } }, String(q.message || '')) : null,
      ]

      return React.createElement('div', { className: 'tplan-card' },
        React.createElement('div', { className: 'tplan-card-head' },
          React.createElement('span', { className: 'tplan-card-name' }, p.label),
          cred.configured
            ? React.createElement('span', { className: 'tplan-badge ' + (cred.writable ? 'ok' : 'ro') }, cred.writable ? '已配置' : '只读(环境变量)')
            : React.createElement('span', { className: 'tplan-badge' }, '未配置 key')),
        rows.filter(Boolean),
        barPct !== null ? React.createElement(Bar, { pct: barPct, color: barPct > 85 ? '#ff8f8f' : barPct > 60 ? '#ffb86b' : '#5dd39e' }) : null,
        React.createElement('div', { className: 'tplan-row', style: { marginTop: 6 } },
          'API Key (凭据名 ' + String(p.ref || '') + '): ',
          React.createElement('input', {
            className: 'tplan-input', type: 'password', placeholder: cred.configured ? '已配置，输入新值可覆盖' : '在此粘贴 key（存到本机凭据库）',
            value: keyVal || '',
            onChange: (e) => props.setInputs(Object.assign({}, props.inputs, { [k]: e.target.value })),
          }),
          React.createElement('div', { style: { display: 'flex', gap: 6, marginTop: 4 } },
            React.createElement('button', { className: 'tplan-btn', onClick: () => props.saveKey(k) }, '保存'),
            React.createElement('button', { className: 'tplan-btn', onClick: () => props.clearKey(k) }, '清除')),
          cred.source ? React.createElement('div', { style: { color: '#767d9e', fontSize: 10 } }, '来源: ' + cred.source) : null),
        p.kind === 'none' ? React.createElement('div', { className: 'tplan-row', style: { marginTop: 4 } },
          '套餐总量(可选): ',
          React.createElement('input', {
            className: 'tplan-input', type: 'number', min: '0', placeholder: '如 2400000000，仅用于进度条',
            value: totalVal !== undefined && totalVal !== null ? String(totalVal) : (p.manualTotal ? String(p.manualTotal) : ''),
            onChange: (e) => props.setTotals(Object.assign({}, props.totals, { [k]: e.target.value })),
          }),
          React.createElement('button', { className: 'tplan-btn', style: { marginTop: 4 }, onClick: () => props.saveTotal(k) }, '保存总量')) : null)
    }

    function Widget() {
      const [open, setOpen] = React.useState(false)
      const [data, setData] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [msg, setMsg] = React.useState(null)
      const [err, setErr] = React.useState(null)
      const [inputs, setInputs] = React.useState({})
      const [totals, setTotals] = React.useState({})
      const [refresher, setRefresher] = React.useState(null)

      React.useEffect(() => {
        let alive = true
        const refresh = async (opts) => {
          if (!opts || !opts.silent) setBusy(true)
          try {
            const res = rpcValue(await rpcCall('get-state', {}))
            if (alive) {
              if (res.ok) { setData(res.value); setErr(null) }
              else setErr(res.error)
            }
          } catch (e) {
            if (alive) setErr(String((e && e.message) || e))
          } finally {
            if (alive) setBusy(false)
          }
        }
        setRefresher(() => refresh)
        refresh()
        const intervalId = setInterval(() => refresh({ silent: true }), 20000)
        return () => { alive = false; clearInterval(intervalId) }
      }, [])

      const saveKey = async (k) => {
        const v = inputs[k]
        if (v === undefined || v === '') { setMsg('先粘贴 key 再保存'); return }
        setMsg(null)
        try {
          const res = rpcValue(await rpcCall('set-key', { plan: k, value: v }))
          if (!res.ok) { setMsg('保存失败: ' + res.error); return }
          const inner = res.value
          if (inner && inner.ok) { setMsg('已保存并更新'); setInputs(Object.assign({}, inputs, { [k]: '' })); if (refresher) refresher({ silent: true }) }
          else setMsg('保存失败: ' + (inner && inner.error ? inner.error : '未知错误'))
        } catch (e) { setMsg('保存失败: ' + String((e && e.message) || e)) }
      }
      const clearKey = async (k) => {
        setMsg(null)
        try {
          const res = rpcValue(await rpcCall('set-key', { plan: k, value: '' }))
          if (!res.ok) { setMsg('清除失败: ' + res.error); return }
          const inner = res.value
          if (inner && inner.ok) { setMsg('已清除'); if (refresher) refresher({ silent: true }) }
          else setMsg('清除失败: ' + (inner && inner.error ? inner.error : '未知错误'))
        } catch (e) { setMsg('清除失败: ' + String((e && e.message) || e)) }
      }
      const saveTotal = async (k) => {
        const v = totals[k]
        if (v === undefined || v === '') { setMsg('先填写总量'); return }
        setMsg(null)
        try {
          const res = rpcValue(await rpcCall('set-total', { plan: k, total: Number(v) }))
          if (!res.ok) { setMsg('保存失败: ' + res.error); return }
          const inner = res.value
          if (inner && inner.ok) { setMsg('总量已保存'); if (refresher) refresher({ silent: true }) }
          else setMsg('保存失败: ' + (inner && inner.error ? inner.error : '未知错误'))
        } catch (e) { setMsg('保存失败: ' + String((e && e.message) || e)) }
      }

      const total = data ? Object.keys(data.plans).reduce((s, k) => {
        const u = data.plans[k].usage
        return s + (u ? u.input + u.output : 0)
      }, 0) : 0

      const pill = React.createElement('div', { className: 'tplan-pill', onClick: () => setOpen(!open), title: 'Token 套餐用量' },
        React.createElement('span', { className: 'tplan-dot' }),
        React.createElement('span', null, 'Token 用量 '),
        React.createElement('span', { className: 'tplan-pill-num' }, fmt(total)),
        React.createElement('span', { className: 'tplan-caret' }, open ? '▾' : '▴'))

      if (!open) return React.createElement('div', { className: 'tplan-root' }, pill)

      const cards = data
        ? Object.keys(data.plans).map((k) => React.createElement(Card, {
            key: k, planKey: k, plan: data.plans[k],
            inputs: inputs, setInputs: setInputs, totals: totals, setTotals: setTotals,
            saveKey: saveKey, clearKey: clearKey, saveTotal: saveTotal,
          }))
        : React.createElement('div', { className: 'tplan-row' }, busy ? '加载中…' : '暂无数据')

      const othersKeys = data ? Object.keys(data.others || {}) : []

      const panel = React.createElement('div', { className: 'tplan-panel' },
        React.createElement('div', { className: 'tplan-head' },
          React.createElement('span', { className: 'tplan-title' }, 'Token 套餐用量'),
          React.createElement('span', { className: 'tplan-updated' }, data ? '更新 ' + new Date(data.at).toLocaleTimeString() : ''),
          React.createElement('button', { className: 'tplan-btn', onClick: () => refresher && refresher() }, busy ? '…' : '刷新'),
          React.createElement('button', { className: 'tplan-btn', onClick: () => setOpen(false) }, '收起')),
        err ? React.createElement('div', { className: 'tplan-err' }, String(err)) : null,
        msg ? React.createElement('div', { className: 'tplan-msg' }, String(msg)) : null,
        cards,
        othersKeys.length > 0 ? React.createElement('div', { className: 'tplan-others' }, '未匹配路由: ' + othersKeys.join(', ')) : null,
        React.createElement('div', { className: 'tplan-foot' }, '实测=本会话统计(自插件启动) · key 存于本机凭据库 ~/.dsh/.credentials.yaml'))

      return React.createElement('div', { className: 'tplan-root' }, pill, panel)
    }

    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'tplan-usage', order: 9000, label: 'Token 用量' },
      () => React.createElement(Widget),
    ))
}

		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
