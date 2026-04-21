import { useSettingsStore } from '../stores/settingsStore';
import { useWebViewStore } from '../stores/webviewStore';

export function ChatWebView() {
  const gatewayUrl = useSettingsStore((s) => s.gatewayUrl);
  const authMode = useSettingsStore((s) => s.authMode);
  const authToken = useSettingsStore((s) => s.authToken);
  const authPassword = useSettingsStore((s) => s.authPassword);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const setView = useSettingsStore((s) => s.setView);
  const retryKey = useWebViewStore((s) => s.reloadKey);

  // Block iframe when auth is required but credentials missing
  const authIncomplete = (authMode === 'token' && !authToken) || (authMode === 'password' && !authPassword);

  // Wait for settings to hydrate from disk before deciding to mount iframe
  // (otherwise we mount with default auth, which OpenClaw rejects)
  if (!hydrated) {
    return <div style={{ width: '100%', height: '100%', background: 'var(--color-bg-primary)' }} />;
  }

  if (!gatewayUrl || authIncomplete) {
    return <WelcomeState onOpenSettings={() => setView('settings')} needsAuth={authIncomplete} />;
  }

  // Build the URL — OpenClaw Control UI serves at the root
  let chatUrl = gatewayUrl.replace(/\/+$/, '');

  // Pass auth via URL fragment (fragments aren't sent to server — secure)
  if (authMode === 'token' && authToken) {
    chatUrl += `#token=${encodeURIComponent(authToken)}`;
  } else if (authMode === 'password' && authPassword) {
    chatUrl += `#password=${encodeURIComponent(authPassword)}`;
  }

  return (
    <div className="flex-1 h-full relative" style={{ backgroundColor: 'var(--color-bg-chat)' }}>
      <iframe
        key={`${chatUrl}#${retryKey}`}
        src={chatUrl}
        className="w-full h-full border-0"
        style={{
          borderRadius: '0 0 var(--radius-window) var(--radius-window)',
          background: 'var(--color-bg-primary)',
        }}
        allow="clipboard-write"
      />
    </div>
  );
}

function WelcomeState({ onOpenSettings, needsAuth }: { onOpenSettings: () => void; needsAuth?: boolean }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '24px', padding: '40px 32px',
      background: 'var(--color-bg-primary)',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '18px',
        background: 'var(--color-surface-card)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px',
      }}>
        🦞
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '21px', fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.28px', lineHeight: 1.19,
          marginBottom: '8px',
        }}>
          {needsAuth ? '需要配置认证' : '欢迎使用 ClawBar'}
        </p>
        <p style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.47, letterSpacing: '-0.16px',
          maxWidth: '260px',
        }}>
          {needsAuth
            ? '请在设置中填写 Gateway Token 或密码\n以连接到 OpenClaw 实例'
            : '请在设置中配置 Gateway 地址\n以连接到 OpenClaw 实例'
          }
        </p>
      </div>
      <button
        onClick={onOpenSettings}
        style={{
          padding: '9px 28px', borderRadius: '8px',
          border: 'none',
          background: 'var(--color-accent)',
          color: 'var(--color-bubble-user-text)',
          fontSize: '15px', fontWeight: 400,
          cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: '-0.16px',
          transition: 'filter 0.12s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
      >
        打开设置
      </button>
    </div>
  );
}
