import React from 'react';
import { FilterType } from '../types';
import { GroupBy } from '../TopologyView';
import { IconSearch, IconFitView, IconTraffic, IconVlan } from './Icons';

// Simple heatmap icon (signal waves)
function IconHeatmap({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="10" r="2" />
      <path d="M5 8a4 4 0 0 1 6 0" />
      <path d="M3 6a7 7 0 0 1 10 0" />
    </svg>
  );
}

interface Props {
  filter: FilterType;
  searchQuery: string;
  totalNodes: number;
  onlineNodes: number;
  totalClients: number;
  warningCount: number;
  pingMs: number | null | undefined;
  trafficMode: boolean;
  heatmapMode: boolean;
  ghostMode: boolean;
  vlanMode: boolean;
  healthMode: boolean;
  groupBy: GroupBy;
  topologyControls?: boolean;
  onFilterChange: (f: FilterType) => void;
  onSearchChange: (q: string) => void;
  onFitView: () => void;
  onToggleTraffic: () => void;
  onToggleHeatmap: () => void;
  onToggleGhost: () => void;
  onToggleVlan: () => void;
  onToggleHealth: () => void;
  onGroupByChange: (g: GroupBy) => void;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',      label: '全部' },
  { key: 'aps',      label: 'APs' },
  { key: 'clients',  label: '客户端' },
  { key: 'warnings', label: '警告' },
];

export function StatusBar({
  filter,
  searchQuery,
  totalNodes,
  onlineNodes,
  totalClients,
  warningCount,
  pingMs,
  trafficMode,
  heatmapMode,
  ghostMode,
  vlanMode,
  healthMode,
  groupBy,
  topologyControls = true,
  onFilterChange,
  onSearchChange,
  onFitView,
  onToggleTraffic,
  onToggleHeatmap,
  onToggleGhost,
  onToggleVlan,
  onToggleHealth,
  onGroupByChange,
}: Props) {
  const allOnline = onlineNodes === totalNodes;
  const healthClass = warningCount === 0 ? 'health-ok' : warningCount <= 2 ? 'health-warn' : 'health-crit';
  const healthLabel = warningCount === 0 ? '正常' : `${warningCount} 个问题`;

  return (
    <div className="status-bar">
      {/* ── Health banner ─────────────────────────────────────── */}
      <div className={`status-bar__health ${healthClass}`}>
        <span className="status-bar__health-dot" />
        <span>{healthLabel}</span>
      </div>

      <span className="status-bar__divider" />

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="status-bar__stats">
        <span className="status-bar__stat">
          节点&nbsp;<strong className={allOnline ? '' : 'warn'}>{onlineNodes}/{totalNodes}</strong>
        </span>
        <span className="status-bar__stat">
          客户端&nbsp;<strong>{totalClients}</strong>
        </span>
        {pingMs != null && pingMs > 0 && (
          <span className="status-bar__stat status-bar__stat--ping">
            Ping&nbsp;<strong>{pingMs}&nbsp;ms</strong>
          </span>
        )}
      </div>

      {topologyControls && (
        <>
          <span className="status-bar__divider" />

          {/* ── Filters ──────────────────────────────────────────── */}
          <div className="status-bar__filters">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`filter-btn ${filter === f.key ? 'active' : ''}`}
                onClick={() => onFilterChange(f.key)}
              >
                {f.label}
                {f.key === 'warnings' && warningCount > 0 && (
                  <span className="filter-btn__badge">{warningCount}</span>
                )}
              </button>
            ))}
          </div>

          <span className="status-bar__gap" />

          {/* ── Search ───────────────────────────────────────────── */}
          <div className="status-bar__search">
            <IconSearch size={13} />
            <input
              type="text"
              placeholder="搜索设备…"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>

          {/* ── Health mode toggle ───────────────────────────────── */}
          <button
            className={`status-bar__action${healthMode ? ' active' : ''}`}
            onClick={onToggleHealth}
            title={healthMode ? '关闭健康模式' : '开启健康模式'}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>♥</span>
          </button>

          {/* ── Heatmap toggle ───────────────────────────────────── */}
          <button
            className={`status-bar__action${heatmapMode ? ' active' : ''}`}
            onClick={onToggleHeatmap}
            title={heatmapMode ? '关闭热力图' : '开启 WLAN 热力图'}
          >
            <IconHeatmap size={15} />
          </button>

          {/* ── Ghost toggle ─────────────────────────────────────── */}
          <button
            className={`status-bar__action${ghostMode ? ' active' : ''}`}
            onClick={onToggleGhost}
            title={ghostMode ? '关闭幽灵模式' : '显示已消失的设备'}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>👻</span>
          </button>

          {/* ── VLAN toggle ──────────────────────────────────────── */}
          <button
            className={`status-bar__action${vlanMode ? ' active' : ''}`}
            onClick={onToggleVlan}
            title={vlanMode ? '关闭 VLAN 图层' : '开启 VLAN 图层'}
          >
            <IconVlan size={15} />
          </button>

          {/* ── Traffic toggle ───────────────────────────────────── */}
          <button
            className={`status-bar__action${trafficMode ? ' active' : ''}`}
            onClick={onToggleTraffic}
            title={trafficMode ? '关闭流量图层' : '开启流量图层'}
          >
            <IconTraffic size={15} />
          </button>

          {/* ── Grouping selector ────────────────────────────────── */}
          <select
            className={`status-bar__select${groupBy !== 'none' ? ' active' : ''}`}
            value={groupBy}
            onChange={e => onGroupByChange(e.target.value as GroupBy)}
            title="AP 分组"
          >
            <option value="none">分组：关闭</option>
            <option value="type">按类型</option>
            <option value="vlan">按 VLAN</option>
            <option value="status">按状态</option>
          </select>

          {/* ── Fit-view button ──────────────────────────────────── */}
          <button
            className="status-bar__action"
            onClick={onFitView}
            title="适应视图"
          >
            <IconFitView size={15} />
          </button>
        </>
      )}
    </div>
  );
}
