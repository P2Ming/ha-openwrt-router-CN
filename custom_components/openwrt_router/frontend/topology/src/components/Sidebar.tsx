import React from 'react';
import {
  IconTopology,
  IconDevices,
  IconClients,
  IconAlerts,
  IconTraffic,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
  IconCompare,
  IconWiring,
} from './Icons';

export type SidebarTab = 'topology' | 'devices' | 'clients' | 'traffic' | 'alerts' | 'compare' | 'wiring' | 'settings';

interface NavItem {
  id: SidebarTab;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
  badge?: number;
}

interface Props {
  open: boolean;
  activeTab: SidebarTab;
  warningCount: number;
  onToggle: () => void;
  onTabChange: (tab: SidebarTab) => void;
}

export function Sidebar({ open, activeTab, warningCount, onToggle, onTabChange }: Props) {
  const items: NavItem[] = [
    { id: 'topology', label: '拓扑',   Icon: IconTopology },
    { id: 'devices',  label: '设备',   Icon: IconDevices },
    { id: 'wiring',   label: '连接',   Icon: IconWiring },
    { id: 'clients',  label: '客户端', Icon: IconClients },
    { id: 'traffic',  label: '流量',   Icon: IconTraffic },
    { id: 'alerts',   label: '告警',   Icon: IconAlerts,  badge: warningCount > 0 ? warningCount : undefined },
    { id: 'compare',  label: '对比',   Icon: IconCompare },
    { id: 'settings', label: '设置',   Icon: IconSettings },
  ];

  return (
    <div className={`topo-sidebar${open ? ' open' : ''}`}>
      {/* Toggle button */}
      <button className="sidebar-toggle" onClick={onToggle} title={open ? '收起' : '展开'}>
        {open ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
      </button>

      {/* Navigation items */}
      <nav className="sidebar-nav">
        {items.map(({ id, label, Icon, badge }) => (
          <button
            key={id}
            className={`sidebar-item${activeTab === id ? ' active' : ''}`}
            title={!open ? label : undefined}
            onClick={() => onTabChange(id)}
          >
            <span
              className="sidebar-item__icon sidebar-item__icon-badge"
              data-count={badge ?? 0}
            >
              <Icon size={18} />
            </span>
            <span className="sidebar-item__label">{label}</span>
            {badge != null && badge > 0 && (
              <span className="sidebar-badge">{badge}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
