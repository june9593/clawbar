# Channel Dock — Design

> 2026-04-22

Aggregate Telegram / Discord / Feishu / Lark (and arbitrary user-added URLs) into ClawBar so the menu bar window becomes a one-stop IM hub. OpenClaw remains the first, fixed channel.

## Goal

Replace the implicit "OpenClaw client" framing with a unified **channel dock**: a 48 px vertical icon column on the left edge of the window listing OpenClaw plus any number of web-based IM channels. Selecting a channel swaps the content area to that channel's UI.

## Architecture

```
┌─────────────────────────────────────┐
│            TitleBar                 │
├──┬──────────────────────────────────┤
│🦞│                                  │
│──│                                  │
│✈ │                                  │
│💬│   Active channel content area    │
│🪶│   (OpenClaw view OR <webview>)   │
│🐦│                                  │
│  │                                  │
│➕│                                  │
└──┴──────────────────────────────────┘
 dock         content area
```

Renderer top-level becomes:

```tsx
<TitleBar />
<div flex>
  <ChannelDock />
  <ChannelHost />     // mounts every channel; toggles visibility via opacity/display
</div>
<SettingsPanel />     // overlay, unchanged
```

OpenClaw retains its own internal sidebar (the existing 10-view operator panel) — it slides over the OpenClaw content area only. Two layers of sidebar (dock + OpenClaw internal) coexist cleanly because the internal one is an overlay, not a flex column.

## Components

```
src/components/
├── ChannelDock.tsx          # 48 px column, vertical icon list + bottom +
├── ChannelIcon.tsx          # one icon button (active state, hover tooltip)
├── ChannelHost.tsx          # router: picks OpenClaw vs WebChannel by id
├── WebChannel.tsx           # wraps <webview>, persistent partition per channel
├── AddChannelMenu.tsx       # popover anchored to the +
└── ChannelContextMenu.tsx   # right-click: rename / change icon / hide / delete

src/stores/
└── channelStore.ts          # Zustand: channels[], activeChannelId, CRUD
```

`ChannelHost` mounts **all** enabled channels at once and toggles them with `display: none` / `opacity`. WebSocket connections (OpenClaw) and webview login state survive channel switches.

## Data model

Persisted in `~/.clawbar/settings.json` (no separate file):

```json
{
  "channels": [
    { "id": "openclaw", "kind": "openclaw", "name": "OpenClaw", "builtin": true },
    { "id": "telegram", "kind": "web", "name": "Telegram", "url": "https://web.telegram.org/", "icon": "✈️", "builtin": true, "enabled": true },
    { "id": "discord",  "kind": "web", "name": "Discord",  "url": "https://discord.com/app", "icon": "💬", "builtin": true, "enabled": true },
    { "id": "feishu",   "kind": "web", "name": "飞书",     "url": "https://www.feishu.cn/messenger/", "icon": "🪶", "builtin": true, "enabled": true },
    { "id": "lark",     "kind": "web", "name": "Lark",     "url": "https://www.larksuite.com/messenger/", "icon": "🐦", "builtin": true, "enabled": true },
    { "id": "u-1745201234", "kind": "web", "name": "Notion", "url": "https://notion.so", "icon": "🅽", "builtin": false, "enabled": true }
  ],
  "activeChannelId": "openclaw"
}
```

Rules:

- `kind: "openclaw"` exists exactly once, fixed at index 0, cannot be deleted or disabled.
- `builtin: true` IM channels can be hidden (`enabled: false`) and reordered, but not deleted.
- `builtin: false` (user-added) can be fully deleted.
- `icon` is either an emoji string or a favicon URL string.

`settings:set` allowedKeys gains `channels` and `activeChannelId`. Defaults shipped from `electron/ipc/settings.ts` include the 5 entries above; `readStore`'s existing `{ ...defaults, ...data }` merge is enough — no migration code.

## Webview behaviour

Each web channel is an Electron `<webview>` tag (not `BrowserView`):

```tsx
<webview
  src={channel.url}
  partition={`persist:channel-${channel.id}`}
  allowpopups
  style={{ display: isActive ? 'flex' : 'none' }}
/>
```

- `partition="persist:channel-<id>"` — each channel gets its own cookie / localStorage. Scan QR / log in once; persisted across launches.
- `display: none` when inactive — keeps internal state (open conversations, unsent drafts).
- `allowpopups` — Discord / Feishu OAuth pop-ups need it.
- No script injection, no unread-count parsing (explicit YAGNI).
- Listen `page-favicon-updated` to populate `channel.icon` for user-added channels.

## Add Channel popover

Triggered by the bottom + button. ~300 px wide, anchored to the right of +.

```
┌────────────────────────────┐
│  Add a channel             │
│                            │
│  Built-in                  │
│  ✈️  Telegram      [+]    │
│  💬  Discord       [✓]    │   ← already enabled
│  🪶  飞书          [+]    │
│  🐦  Lark          [+]    │
│                            │
│  ─────────────────────     │
│  Custom                    │
│  ┌────────────────────┐    │
│  │ https://...        │    │
│  └────────────────────┘    │
│              [ Add ]       │
└────────────────────────────┘
```

- Built-in row toggles `enabled` and switches the active channel to it.
- Custom URL: validate http(s) prefix (auto-add https:// if missing), generate `id = "u-" + Date.now()`, name defaults to URL hostname, icon defaults to `🌐`, immediately set active.

## Right-click menu (`ChannelContextMenu`)

| Item | Visible when |
|---|---|
| Rename | always (except OpenClaw) |
| Change icon | always (except OpenClaw) |
| Move up / Move down | always |
| Hide | `builtin: true` only |
| Delete | `builtin: false` only |

(v1 uses move up/down buttons — drag-to-reorder explicitly deferred.)

## Edge cases

- **Duplicate URL on add** — normalize hostname; if it matches an existing channel, do not add, just switch active to that one.
- **Delete active channel** — fall back to the previous channel in the list (or OpenClaw if it was the second).
- **Dock overflow** — `overflow-y: auto`. 36 px icons + 8 px gap fit ~12 channels + the + at 560 px window height.
- **Network failure inside webview** — Chromium's native error page handles it.

## Out of scope (v1)

- Unread badges / red dots / OS notifications
- Drag-to-reorder
- Channel folders / grouping
- Multiple accounts of the same service in distinct channels (workaround: add the URL twice)
- Cross-channel global search
- Per-channel window-size memory
