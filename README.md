# 🦞 ClawBar

A macOS menu-bar app for [OpenClaw](https://github.com/nicepkg/openclaw). Your agent reaches you through many channels — Telegram, Discord, Feishu, Lark, its own web chat, custom integrations — and ClawBar puts every one of those channels in a single bar, sitting in the macOS menu bar. **A bar in a bar.**

## Features

- **One bar, every OpenClaw channel** — A 48 px sidebar lists every way you talk to your OpenClaw: native web chat, Telegram bot, Discord bot, Feishu / Lark, and any other URL you've wired your agent into.
- **Built-in IM channels** — Telegram, Discord, Feishu, Lark out of the box. Click `+` to add wherever else your bot lives.
- **Operator panel for OpenClaw** — Click the lobster again to open a sidebar with 10 views: Overview, Chat, Approvals, Sessions, Usage, Cron, Agents, Skills, Logs, Settings.
- **Persistent logins** — Each channel runs in its own Electron `<webview>` partition; scan the QR or sign in once and you're set.
- **Mobile-optimised** — Web channels report a phone user-agent so they render their compact mobile layouts inside the narrow menu-bar window.
- **Browser-style controls** — Back / Reload buttons in the title bar when a web channel is active.
- **Secure WebSocket auth** — Ed25519 device identity for talking to the OpenClaw gateway. Tokens never leave the main process.
- **Frameless popover** — vibrancy background, resizable, draggable, optional always-on-top.
- **Optional desktop pet** — A draggable lobster mascot that doubles as a click-to-toggle shortcut. Hide / show from the tray menu, persisted across launches.
- **Light / dark theme** — follows macOS or override per app.
- **No telemetry** — no analytics, no phone-home. The OpenClaw bridge only talks to the gateway URL you configure.

## Install (pre-built DMG)

Grab the latest `.dmg` from the [Releases page](https://github.com/june9593/clawbar/releases), open it, and drag **ClawBar** into `/Applications`.

> **The app isn't code-signed**, so macOS Gatekeeper will block the first launch. Pick one:
>
> - In Finder, **right-click `ClawBar.app` → Open**, then click **Open** in the warning dialog (one time only).
> - Or paste this once in Terminal:
>   ```bash
>   xattr -dr com.apple.quarantine /Applications/ClawBar.app
>   ```

## Quick Start (from source)

### Prerequisites

- macOS 12+ (Monterey or later)
- Node.js 20+
- (Optional) A reachable [OpenClaw](https://github.com/nicepkg/openclaw) gateway, default `http://localhost:18789`

### Install & run

```bash
git clone https://github.com/june9593/clawbar.git
cd clawbar
npm install
npm run dev:electron
```

### Development

```bash
npm run dev               # Vite dev server (renderer only, port 5173)
npm run dev:electron      # Build electron main + launch app
npm run build             # Production build (vite + tsc)

# Type checking
npx tsc --noEmit                          # renderer
npx tsc -p tsconfig.node.json --noEmit    # main process

# Package as DMG (Apple Silicon)
npm run pack:mac:dmg:arm64
```

## Channels

A **channel** in ClawBar is any place your OpenClaw agent talks to you — its native web chat, an IM bot, or a custom integration. The channel bar (the 48 px sidebar) lists every one of them.

| Channel | Notes |
|---|---|
| **OpenClaw** | The default first channel. Cannot be deleted. Click its icon to toggle the operator sidebar. |
| **Telegram** | Loads `web.telegram.org`. Where your OpenClaw Telegram bot lives. |
| **Discord** | Loads `discord.com/app`. Where your OpenClaw Discord bot lives. |
| **飞书 / Lark** | Routes through the official `accounts.*` login flow, redirects to messages after auth. |
| **Custom** | Click `+` → paste any URL where you've wired up your OpenClaw integration. Favicon and hostname auto-populate. |

Each channel keeps its own cookies and localStorage in `persist:channel-<id>`.

## Configuration

Settings live at `~/.clawbar/settings.json`. Device identity (Ed25519 keypair, used for OpenClaw auth) lives at `~/.clawbar/device-identity.json`.

| Setting | Default | Description |
|---|---|---|
| `gatewayUrl` | `http://localhost:18789` | OpenClaw gateway address |
| `authMode` | `none` | `none`, `token`, or `password` |
| `chatMode` | `compact` | OpenClaw UI: `compact` (native WS chat) or `classic` (iframe of OpenClaw web UI) |
| `theme` | `system` | `light`, `dark`, or `system` |
| `hideOnClickOutside` | `false` | Auto-hide window when focus moves elsewhere |
| `petVisible` | `true` | Show the desktop pet mascot |
| `channels` | (5 built-in) | Channel list (rendered in the dock) |
| `activeChannelId` | `openclaw` | Last-active channel restored on launch |

## Architecture

```
Main process (electron/)
├── Tray + frameless BrowserWindow (vibrancy: popover)
├── Optional pet window (floating mascot)
├── Settings IPC          (settings.json read/write)
└── WS Bridge             (single WebSocket → IPC fan-out, Ed25519 auth)

Renderer (src/)
├── TitleBar              (back/reload, pin, settings)
├── ChannelDock           (48 px icon column + + button)
└── ChannelHost
    ├── OpenClawChannel   (CompactChat / ChatWebView + 10-view sidebar)
    └── WebChannel × N    (Electron <webview> per channel, persistent partition)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full diagram, IPC channel table, and WebSocket bridge details.

## License

MIT
