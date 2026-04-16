export type TabId = 'chat' | 'usage';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; icon: string; label: string }[] = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'usage', icon: '📊', label: 'Usage' },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div style={{
      height: '44px',
      display: 'flex',
      alignItems: 'center',
      background: 'var(--color-bg-secondary)',
      borderTop: '0.5px solid var(--color-border-secondary)',
      flexShrink: 0,
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: '10px',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.5px',
              lineHeight: 1,
              fontWeight: isActive ? 600 : 400,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
