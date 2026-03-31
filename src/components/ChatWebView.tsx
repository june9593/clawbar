import { useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

export function ChatWebView() {
  const gatewayUrl = useSettingsStore((s) => s.gatewayUrl);
  const authMode = useSettingsStore((s) => s.authMode);
  const authToken = useSettingsStore((s) => s.authToken);
  const authPassword = useSettingsStore((s) => s.authPassword);
  const setView = useSettingsStore((s) => s.setView);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!gatewayUrl) {
    return <WelcomeState onOpenSettings={() => setView('settings')} />;
  }

  // Build the URL — OpenClaw Control UI serves at the root
  let chatUrl = gatewayUrl.replace(/\/+$/, '');

  // Pass auth via URL fragment (fragments aren't sent to server — secure)
  if (authMode === 'token' && authToken) {
    chatUrl += `#token=${encodeURIComponent(authToken)}`;
  } else if (authMode === 'password' && authPassword) {
    chatUrl += `#password=${encodeURIComponent(authPassword)}`;
  }

  if (loadError) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4 px-8"
        style={{ backgroundColor: 'var(--color-bg-chat)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <span className="text-3xl">⚠️</span>
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            无法连接到 OpenClaw
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            请确认 Gateway 已启动并检查地址配置
          </p>
          <p className="text-xs font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
            {gatewayUrl}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setLoadError(false); setLoading(true); }}
            className="px-4 py-1.5 rounded-lg text-xs font-medium"
            style={{ color: 'var(--color-text-link)', border: '1px solid var(--color-border-primary)' }}
          >
            重试
          </button>
          <button
            onClick={() => setView('settings')}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface-user-bubble)', color: '#fff' }}
          >
            打开设置
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full relative" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-bg-chat)' }}>
          <div className="text-center space-y-2">
            <span className="text-2xl">🦞</span>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>连接中...</p>
          </div>
        </div>
      )}
      <iframe
        key={chatUrl}
        src={chatUrl}
        className="w-full h-full border-0"
        style={{ borderRadius: '0 0 12px 12px' }}
        allow="clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setLoadError(true); }}
      />
    </div>
  );
}

function WelcomeState({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4 px-8"
      style={{ backgroundColor: 'var(--color-bg-chat)' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <span className="text-3xl">🦞</span>
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          欢迎使用 ClawBar
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          请在设置中配置 OpenClaw Gateway 地址
        </p>
      </div>
      <button
        onClick={onOpenSettings}
        className="px-4 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--color-surface-user-bubble)', color: '#fff' }}
      >
        打开设置
      </button>
    </div>
  );
}
