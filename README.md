# dsh-tplan

DeepSeek Harness Web 插件：**Token 套餐用量面板**。在聊天页右下角悬浮显示，分套餐统计本会话 token 用量，实时查询余额与剩余额度，并支持面板内管理 API Key。

## 安装

### 常规安装

```sh
dsh plugin --profile web add github:yuqingsh/dsh-tplan#v0.1.1
```

发布到 npm 后：`dsh plugin --profile web add dsh-tplan`。本地目录或 tarball：`dsh plugin --profile web add ./dsh-tplan`。

本插件纯 JS、无构建步骤，git 安装无需 build 授权。安装后重启 `dsh web` 并刷新页面，右下角出现「Token 用量」浮窗。

### 用 Prompt 安装

把下面这段发给你的 DSH 会话，让 Agent 代装：

> 请安装 dsh-tplan 插件：运行 `dsh plugin --profile web add github:yuqingsh/dsh-tplan#v0.1.1`。完成后重启 dsh web 进程，刷新浏览器页面，确认右下角出现「Token 用量」浮窗。

## 使用

### 配置 API Key

1. 打开面板，在各套餐卡片粘贴对应 Key 并保存（写入 `~/.dsh/.credentials.yaml`，与 DSH 设置页共用）；
2. 或直接编辑 `~/.dsh/.credentials.yaml`：

```yaml
DEEPSEEK_API_KEY: sk-...
MINIMAX_CN_API_KEY: ...
KIMI_API_KEY: ...
```

### 额度口径

- DeepSeek：官方余额接口（赠送 + 充值明细）；
- MiniMax：套餐剩余百分比（不限量套餐）；
- Kimi：无公开额度接口，仅统计本会话实测用量，可手动填写套餐总量换算进度。

面板每 20 秒静默刷新，额度查询缓存 60 秒。

## License

MIT
