# ClawBar — Product Requirements Document

> **版本**: v3.0
> **日期**: 2026-04-16

---

## 1. 产品概述

**ClawBar** 是 macOS menu bar 上的 OpenClaw 客户端。提供两种聊天模式：iframe 嵌入 OpenClaw Control UI（Classic 模式）和基于 WebSocket 的原生聊天 UI（Compact 模式），配合完整的管理面板（会话、Agent、技能、Cron、用量、日志），实现 menu bar 一键访问 OpenClaw 全部功能。

### 目标用户

自部署 OpenClaw 的 macOS 开发者，需要轻量级桌面入口取代浏览器或重型 IM 客户端。

### 核心价值

- Menu bar 一键唤起，不占 Dock
- 双聊天模式：Classic（功能完整）/ Compact（原生轻量）
- WebSocket 直连 OpenClaw，Ed25519 设备身份认证
- 内置管理面板：会话、审批、Agent、技能、Cron、用量、日志

---

## 2. 已实现功能

### 2.1 Menu Bar 与窗口（F-01 ~ F-02, F-06, F-09 ~ F-11）

- 🦞 emoji 剪影 tray icon，点击弹出/隐藏 popover 窗口（300ms 防抖）
- Frameless 窗口，`vibrancy: popover`，可 resize/拖拽
- Pin 按钮切换 always-on-top，Pin 时点击外部不隐藏
- ESC / Cmd+W 隐藏窗口（非 Pin 状态）
- 窗口位置持久化，恢复时检测屏幕边界
- 应用不显示在 Dock（`app.dock.hide()`）
- 右键 tray 菜单：Show/Hide + Quit

### 2.2 聊天（F-03, F-15 ~ F-16）

**Classic 模式**: iframe 嵌入 `http://<gateway>:18789/`，Electron 剥离 `X-Frame-Options` 和 `frame-ancestors` CSP 头。认证信息通过 URL fragment 传递。

**Compact 模式**: 原生 React 聊天 UI，通过主进程 WebSocket bridge 直连 OpenClaw：
- 消息气泡，流式输出（delta → final 状态）
- Agent emoji 头像
- 滚动到底部浮动按钮

**模式切换**: TitleBar 按钮一键切换，窗口自动调整尺寸。

### 2.3 WebSocket Bridge（F-15 核心）

主进程中的 WebSocket 连接层：
- Ed25519 密钥对生成与持久化（`~/.clawbar/`）
- 设备身份 = SHA-256(公钥)
- challenge-response 认证（signature over challenge bytes）
- OpenClaw 自定义帧协议（非 JSON-RPC）
- IPC relay：主进程 ↔ 渲染进程双向通信

### 2.4 会话管理（F-17, F-19）

- 会话下拉列表：切换时加载历史消息
- 创建新会话 / 删除会话（带确认）
- SessionsView 全量会话列表：agent 标签、时间展示、点击切换

### 2.5 审批通知（F-18）

- 监听 `exec.approval.requested` 事件
- 显示命令详情（command、cwd、host、agentId）
- 三个操作按钮：Allow once / Always allow / Deny
- 自动过期处理（基于 `expiresAtMs`）

### 2.6 左侧导航栏（F-21 ~ F-22）

Claude mobile 风格侧边栏，Lucide React SVG 图标，导航项：
Overview · Chat · Approvals · Sessions · Usage · Cron · Agents · Skills · Logs · Settings

### 2.7 管理面板

| 视图 | API | 功能 |
|------|-----|------|
| **Overview** | 多个 status API | Gateway 健康、通道状态、会话/Agent/Cron 计数 |
| **Usage** | `sessions.usage` | 日期范围筛选（Today/7d/30d），按会话分解 tokens/费用/消息/工具调用 |
| **Cron** | `cron.status` + `cron.list` | Job 卡片，启用状态，下次唤醒时间 |
| **Agents** | `agents.list` + heartbeat | Agent 卡片，emoji 头像，心跳状态 |
| **Skills** | `skills.status` | 技能网格，来源标签，依赖需求 |
| **Logs** | `logs.tail` | 实时日志流，级别筛选，等宽字体，文本可选 |

### 2.8 设置（F-04 ~ F-05）

- Gateway URL（默认 `http://localhost:18789`）
- Token / Password 认证
- 主题：亮色 / 暗色 / 跟随系统（CSS 变量 + `data-theme`）
- 聊天模式：Compact / Classic
- 重新连接按钮
- 持久化到 `~/.clawbar/settings.json`

---

## 3. 待实现功能

| ID | 功能 | 优先级 | 描述 |
|----|------|--------|------|
| F-12 | 开机自启 | P1 | `app.setLoginItemSettings`，设置面板开关 |
| F-13 | DMG 打包 | P1 | electron-builder，arm64 + x64 |

---

## 4. 技术架构

### 技术栈

Electron 35 · React 19 · TypeScript · Vite 6 · Tailwind 3 · Zustand 5

### 进程模型

```
Main Process                          Renderer (React)
├── Tray + BrowserWindow              ├── TitleBar (drag, pin, mode switch)
├── WS Bridge (ws + @noble/ed25519)   ├── Sidebar (navigation)
│   ├── Ed25519 keypair               ├── ChatWebView (iframe, classic)
│   ├── challenge-response auth       ├── CompactChat (native, compact)
│   └── IPC relay                     ├── Management views (7 panels)
├── IPC handlers (settings, etc.)     └── SettingsPanel
└── Settings persistence (JSON)
```

### 安全

- `contextIsolation: true` · `sandbox: true` · `nodeIntegration: false`
- 认证信息通过 URL fragment 传递（不入网络请求）
- Ed25519 签名认证（WebSocket 模式）
- 无数据收集

### 兼容性

- macOS 12+ (Monterey)
- Apple Silicon (arm64) + Intel (x64)

---

## 5. 里程碑

| 阶段 | 交付物 | 状态 |
|------|--------|------|
| M1: MVP | Menu bar + 窗口 + iframe 嵌入 + 设置 + 主题 | ✅ |
| M2: 原生聊天 | WebSocket bridge + Compact UI + 会话管理 | ✅ |
| M3: 管理面板 | 侧边栏 + Overview/Usage/Cron/Agents/Skills/Logs | ✅ |
| M4: 审批 | exec.approval.requested 通知与操作 | ✅ |
| M5: 发布准备 | 开机自启 + DMG 打包 | 待开发 |

---

## 6. 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 聊天通信 | iframe + WebSocket 双模式 | Classic 保留完整 OpenClaw UI；Compact 更轻量、可定制 |
| WS 认证 | Ed25519 challenge-response | OpenClaw 原生协议要求，设备身份绑定 |
| 状态管理 | Zustand | 轻量，无 boilerplate |
| 图标体系 | Lucide React | 统一 SVG 图标，tree-shakable |
| 颜色系统 | CSS 变量 | 主题切换零闪烁，全局一致 |

| 决策 | 结论 | 理由 |
|------|------|------|
| 通信方式 | iframe 嵌入 Control UI | 复用 OpenClaw 原生 UI，无需重新实现聊天、Markdown 渲染、消息搜索等功能 |
| 认证传递 | URL fragment | fragment 不随 HTTP 请求发送，比 query params 更安全 |
| CSP 处理 | Electron 剥离响应头 | OpenClaw 默认禁止 iframe 嵌入，需在 Electron 层面移除限制 |
| 状态管理 | Zustand | 轻量，无 Context 嵌套，适合简单应用 |
