# dsh-tplan

DeepSeek Harness web 插件：**Token 套餐用量面板**。在聊天页右下角悬浮显示，分套餐统计本会话的 token 用量，实时查询余额/剩余额度，并支持面板内管理 API Key。

## 功能

- **本会话实测用量**：通过 `llm/stream` 瀑布统计每个套餐（DeepSeek / MiniMax / Kimi）的输入、输出、缓存读/写、思考 token 与调用次数；无 usage 返回的调用会用官方 token-meter 估算。
- **实时额度查询**：
  - DeepSeek：`GET /user/balance` → 余额（赠送 + 充值明细）；
  - MiniMax 套餐：`GET /v1/token_plan/remains` → 剩余百分比（不限量套餐）；
  - Kimi：无公开额度接口，仅统计本会话实测用量（可手动填套餐总量算进度条）。
- **面板内管理 API Key**：粘贴即保存到本机凭据库 `~/.dsh/.credentials.yaml`（0600），与 DSH 设置/模型页共用同一凭据；也支持一键清除。
- 每 20 秒静默刷新，额度缓存 60 秒。

## 安装

### 从 npm（发布后）

```sh
dsh plugin --profile web add dsh-tplan
```

### 从 GitHub

```sh
dsh plugin --profile web add github:<你的用户名>/dsh-tplan
```

建议锁定 commit：`github:<你的用户名>/dsh-tplan#<commit-sha>`。本插件是纯 JS、无构建步骤，git 安装直接可用，无需 allowBuilds 授权。

### 本地 checkout / tarball

```sh
dsh plugin --profile web add ./dsh-tplan        # 本地目录
dsh plugin --profile web add ./dsh-tplan-0.1.0.tgz   # 打包产物
```

安装后重启 `dsh web`，刷新页面即可在右下角看到「Token 用量」浮窗。

## 配置 API Key

两种方式任选：

1. 打开面板，在每个套餐卡片里粘贴对应 key，点「保存」；
2. 直接编辑 `~/.dsh/.credentials.yaml`：

```yaml
DEEPSEEK_API_KEY: sk-...
MINIMAX_CN_API_KEY: ...
KIMI_API_KEY: ...
```

## 工作原理

- 宿主侧（`index.js`）：监听 `llm/stream` 统计用量；通过 `connection.rpc` 暴露 `/tplan` 通道（`{ authority: "loopback" }`，仅限本机请求）；配额查询使用宿主 Node `fetch` 直连各 API，不依赖 shell 服务。
- 客户端（`client.js`）：`slots.inject('shell.overlay')` 挂载右下角浮窗，通过 rc.6 标准 RPC 信封（`{ ok, value }`）与宿主通信。

## 兼容性

- 要求 `@deepseek-ai/dsh` ≥ 0.1.0-rc.6（依赖 rc.6 的 RPC 信封协议、异步初始化的 credentials 服务与 token-meter 服务）。
- 凭据服务与 token-meter 均采用**调用时惰性获取**，避免与异步服务初始化竞争。

## 已知边界

- 「给纯文本主模型发图」不属于本插件职责。本插件作者另有对核心的「图片→占位符投影 + 视觉子代理」补丁方案，相关讨论见 deepseek-harness Discussions（#357 / #561 / #911 等）。

## License

MIT
