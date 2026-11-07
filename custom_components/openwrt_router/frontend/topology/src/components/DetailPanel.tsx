/**
 * DetailPanel — Slide-in right panel showing details for a selected node.
 *
 * Handles three entity types: Gateway, AccessPoint, Client.
 * All data is passed in via props; the panel has no data-fetching logic.
 */

import React from 'react';
import { Gateway, AccessPoint, Client, NodeStatus, DdnsService, SsidInfo, PortStat, PortDevice, VlanInfo, RouterEvent, CpuHistoryPoint, LldpUplink, UplinkType, ConnectionType } from '../types';
import { IconX } from './Icons';
import { StatusDot, statusLabel } from './StatusDot';
import { SignalBar } from './SignalBar';
import { SpeedChart } from './SpeedChart';
import { signalQuality } from '../layout';
import { formatConnectedSince, formatLeaseExpiry, safeHttpUrl } from '../api';
import { shortName, deviceLabel, CONFIDENCE_LABEL, isWanPort } from './PortStrip';
import { formatBitRate, formatBytes } from '../utils/format';
import { STALE_HINT, parallelLinkLabel } from '../utils/hints';

type SelectedEntity =
  | { type: 'gateway'; data: Gateway }
  | { type: 'ap';      data: AccessPoint; clients: Client[] }
  | { type: 'client';  data: Client;      apName: string }
  | { type: 'port';    data: PortStat;    routerName: string }
  | null;

const SIGNAL_QUALITY_LABEL = {
  excellent: '极佳',
  good: '良好',
  fair: '一般',
  poor: '较差',
} as const;

export interface DetailPanelActions {
  onFocusNode: (nodeId: string) => void;
  onShowClients: () => void;
  onShowAlerts: () => void;
  onToggleVlan: () => void;
}

interface Props {
  entity: SelectedEntity;
  onClose: () => void;
  actions?: DetailPanelActions;
  accessPoints?: AccessPoint[];
}

export function DetailPanel({ entity, onClose, actions, accessPoints = [] }: Props) {
  return (
    <div className={`detail-panel ${entity ? 'open' : ''}`}>
      <div className="detail-panel__handle" aria-hidden="true" />
      <div className="detail-panel__header">
        <span className="detail-panel__title">
          {entity?.type === 'gateway' && 'Gateway'}
          {entity?.type === 'ap'      && 'Access Point'}
          {entity?.type === 'client'  && '客户端'}
          {entity?.type === 'port'    && `Port ${shortName(entity.data.name)}`}
          {!entity && '详情'}
        </span>
        <button className="detail-panel__close" onClick={onClose}>
          <IconX size={13} />
        </button>
      </div>

      <div className="detail-panel__body">
        {entity?.type === 'gateway' && <GatewayDetail data={entity.data} actions={actions} accessPoints={accessPoints} />}
        {entity?.type === 'ap'      && <APDetail data={entity.data} clients={entity.clients} actions={actions} />}
        {entity?.type === 'client'  && <ClientDetail data={entity.data} apName={entity.apName} actions={actions} />}
        {entity?.type === 'port'    && <PortDetail data={entity.data} routerName={entity.routerName} actions={actions} />}
      </div>
    </div>
  );
}

// ── Action bar ────────────────────────────────────────────────────────────

function ActionBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button className="inspector-action" onClick={onClick}>
      <span className="inspector-action__icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ── Gateway detail ────────────────────────────────────────────────────────

function GatewayDetail({ data, actions, accessPoints }: { data: Gateway; actions?: DetailPanelActions; accessPoints?: AccessPoint[] }) {
  const cpuHistory = data.cpuHistoryBackend ?? [];
  const hasCpuHistory = cpuHistory.length >= 2;
  const hasPing = data.pingMs != null;

  return (
    <>
      <div className="detail-section">
        <div className="detail-section__heading">常规</div>
        <Row label="名称" value={data.name} />
        <Row label="型号" value={data.model} />
        <Row label="状态" value={<StatusBadge status={data.status} />} />
        {data.firmwareVersion && <Row label="固件" value={data.firmwareVersion} />}
      </div>
      <div className="detail-section">
        <div className="detail-section__heading">网络</div>
        <Row label="LAN IP"  value={data.ip} />
        <Row label="WAN IP"  value={data.wanIp} />
        <Row label="运行时间" value={data.uptime} />
        {hasPing && <Row label="Ping (8.8.8.8)" value={`${data.pingMs} ms`} />}
      </div>

      {data.wanTraffic && (data.wanTraffic.downstream_bps != null || data.wanTraffic.upstream_bps != null) && (
        <div className="detail-section">
          <div className="detail-section__heading">WAN 活动</div>
          <WanTrafficBars
            down={data.wanTraffic.downstream_bps ?? 0}
            up={data.wanTraffic.upstream_bps ?? 0}
          />
        </div>
      )}

      {hasCpuHistory && (
        <div className="detail-section">
          <div className="detail-section__heading">CPU 趋势（1 小时）</div>
          <SpeedChart
            history={cpuHistory}
            width={310}
            height={110}
          />
        </div>
      )}

      {(data.cpuLoad != null || data.memUsage != null) && (
        <div className="detail-section">
          <div className="detail-section__heading">系统</div>
          <ResourceBars cpu={data.cpuLoad} mem={data.memUsage} />
        </div>
      )}

      {(data.ssids ?? []).length > 0 && (
        <div className="detail-section">
          <div className="detail-section__heading">WLAN 网络</div>
          <SsidList ssids={data.ssids!} />
        </div>
      )}

      {(data.portStats ?? []).length > 0 && (
        <div className="detail-section">
          <div className="detail-section__heading">Ports</div>
          <PortList ports={data.portStats!} accessPoints={accessPoints ?? []} />
        </div>
      )}

      {(data.vlans ?? []).length > 0 && (
        <div className="detail-section">
          <div className="detail-section__heading">VLANs</div>
          <VlanList vlans={data.vlans!} />
        </div>
      )}

      {(data.ddnsServices ?? []).length > 0 && (
        <div className="detail-section">
          <div className="detail-section__heading">DuckDNS / DDNS</div>
          {(data.ddnsServices ?? []).map(svc => (
            <DdnsRow key={svc.section} svc={svc} />
          ))}
        </div>
      )}

      {(data.events ?? []).length > 0 && (
        <div className="detail-section">
          <div className="detail-section__heading">事件</div>
          <EventTimeline events={data.events!} />
        </div>
      )}

      {actions && (
        <div className="inspector-actions">
          <ActionBtn icon="◎" label="聚焦" onClick={() => actions.onFocusNode(data.id)} />
          <ActionBtn icon="👥" label="客户端" onClick={actions.onShowClients} />
          <ActionBtn icon="⚠" label="告警" onClick={actions.onShowAlerts} />
          <ActionBtn icon="▦" label="VLANs"   onClick={actions.onToggleVlan} />
        </div>
      )}
    </>
  );
}


function DdnsRow({ svc }: { svc: DdnsService }) {
  const statusColor = svc.status === 'ok'
    ? '#4ade80'
    : svc.status === 'error'
    ? '#f87171'
    : '#fb923c';

  const lastUpdateStr = svc.last_update
    ? new Date(svc.last_update * 1000).toLocaleString('zh-CN', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #e0eaf8)' }}>
          {svc.domain || svc.section}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          <span style={{ color: statusColor }}>
            {svc.status === 'ok' ? '活动' : svc.status === 'error' ? '错误' : '未知'}
          </span>
        </span>
      </div>
      {svc.ip && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary, #8899aa)' }}>
          IP: {svc.ip}
        </div>
      )}
      {lastUpdateStr && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary, #8899aa)' }}>
          最后更新：{lastUpdateStr}
        </div>
      )}
      {svc.service_name && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
          {svc.service_name}
        </div>
      )}
    </div>
  );
}

// ── Event timeline ────────────────────────────────────────────────────────

function EventTimeline({ events }: { events: RouterEvent[] }) {
  const typeIcon: Record<string, string> = { info: 'ℹ', warn: '⚠', error: '✕' };
  const typeClass: Record<string, string> = { info: 'event-info', warn: 'event-warn', error: 'event-error' };

  function relTime(ts: number): string {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60)   return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }

  return (
    <div className="event-timeline">
      {events.slice(0, 10).map((ev, i) => (
        <div key={i} className={`event-timeline__item ${typeClass[ev.type] ?? ''}`}>
          <span className="event-timeline__icon">{typeIcon[ev.type] ?? '·'}</span>
          <div className="event-timeline__body">
            <span className="event-timeline__msg">{ev.message}</span>
            {ev.detail && <span className="event-timeline__detail">{ev.detail}</span>}
          </div>
          <span className="event-timeline__age">{relTime(ev.ts)}</span>
        </div>
      ))}
    </div>
  );
}

// ── AP detail ─────────────────────────────────────────────────────────────

function uplinkTypeLabel(t: UplinkType): string {
  switch (t) {
    case 'wired':         return '有线';
    case 'repeater':      return 'WLAN 中继';
    case 'router_uplink': return 'Router Uplink（LLDP）';
    default:              return 'Mesh';
  }
}

function APDetail({ data, clients, actions }: { data: AccessPoint; clients: Client[]; actions?: DetailPanelActions }) {
  const q = SIGNAL_QUALITY_LABEL[signalQuality(data.backhaulSignal)];
  const isWirelessUplink = data.uplinkType === 'mesh' || data.uplinkType === 'repeater';
  return (
    <>
      <div className="detail-section">
        <div className="detail-section__heading">常规</div>
        <Row label="名称" value={data.name} />
        <Row label="型号" value={data.model} />
        <Row label="IP"      value={data.ip} />
        <Row label="状态" value={<StatusDot status={data.status} />} />
        {data.firmwareVersion && <Row label="固件" value={data.firmwareVersion} />}
      </div>
      <div className="detail-section">
        <div className="detail-section__heading">Uplink</div>
        <Row label="类型" value={uplinkTypeLabel(data.uplinkType)} />
        {isWirelessUplink && (
          <>
            <Row label="信号" value={<><SignalBar dbm={data.backhaulSignal} /> {data.backhaulSignal} dBm</>} />
            <Row label="质量" value={q} />
          </>
        )}
        {data.uplinkType === 'router_uplink' && (data.gatewayPort || data.apPort) && (
          <Row
            label="Port"
            value={`${(data.gatewayPort ?? data.lldpUplink?.fromPort ?? '?').toUpperCase()} ↔ ${(data.apPort ?? data.lldpUplink?.toPort ?? '?').toUpperCase()}`}
          />
        )}
        {data.uplinkStale && <div className="detail-stale-note">⚠ {STALE_HINT}</div>}
      </div>

      {data.lldpUplink && (
        <LldpSection lldp={data.lldpUplink} />
      )}
      {(data.ssids ?? []).length > 0 && (
        <div className="detail-section">
          <div className="detail-section__heading">WLAN 网络</div>
          <SsidList ssids={data.ssids!} />
        </div>
      )}

      {(data.cpuLoad != null || data.memUsage != null) && (
        <div className="detail-section">
          <div className="detail-section__heading">系统</div>
          <ResourceBars cpu={data.cpuLoad} mem={data.memUsage} />
        </div>
      )}

      {(data.cpuHistoryBackend?.length ?? 0) >= 2 && (
        <div className="detail-section">
          <div className="detail-section__heading">CPU 趋势（1 小时）</div>
          <SpeedChart
            history={data.cpuHistoryBackend!}
            width={290}
            height={80}
          />
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section__heading">客户端（{clients.length}）</div>
        <div className="detail-client-list">
          {clients.map(c => (
            <div className="detail-client-item" key={c.id}>
              <StatusDot status={c.status} />
              <span className="detail-client-item__name">{c.name}</span>
              <span className="detail-client-item__meta">{c.band}</span>
            </div>
          ))}
        </div>
      </div>

      {(data.events ?? []).length > 0 && (
        <div className="detail-section">
          <div className="detail-section__heading">事件</div>
          <EventTimeline events={data.events!} />
        </div>
      )}

      {actions && (
        <div className="inspector-actions">
          <ActionBtn icon="◎" label="聚焦" onClick={() => actions.onFocusNode(data.id)} />
          <ActionBtn icon="👥" label="客户端" onClick={actions.onShowClients} />
          <ActionBtn icon="⚠" label="告警" onClick={actions.onShowAlerts} />
        </div>
      )}
    </>
  );
}

// ── LLDP router-uplink detail block ───────────────────────────────────────

function LldpSection({ lldp }: { lldp: LldpUplink }) {
  const mgmtUrl = safeHttpUrl(lldp.managementIp);
  const vlans = lldp.vlanTags ?? [];
  const hasConflict = (lldp.conflicts?.length ?? 0) > 0;
  return (
    <div className="detail-section">
      <div className="detail-section__heading">
        Router Uplink
        <span className="lldp-badge" style={{ marginLeft: 6 }}>LLDP</span>
      </div>
      {lldp.neighborName && <Row label="邻居" value={lldp.neighborName} />}
      {lldp.managementIp && (
        <Row
          label="Management-IP"
          value={
            mgmtUrl ? (
              <a
                href={mgmtUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="port-device-row__link"
                title="打开邻居设备的 Web 界面"
              >
                {lldp.managementIp} ↗
              </a>
            ) : (
              lldp.managementIp
            )
          }
        />
      )}
      {(lldp.fromPort || lldp.toPort) && (
        <Row
          label="端口（本地 ↔ 远端）"
          value={`${(lldp.fromPort ?? '?').toUpperCase()} ↔ ${(lldp.toPort ?? '?').toUpperCase()}`}
        />
      )}
      {lldp.neighborMac && <Row label="邻居 MAC" value={<span className="port-device-row__mac">{lldp.neighborMac}</span>} />}
      {lldp.neighborChassisId && lldp.neighborChassisId !== lldp.neighborMac && (
        <Row label="Chassis-ID" value={<span className="port-device-row__mac">{lldp.neighborChassisId}</span>} />
      )}
      {lldp.neighborPortId && <Row label="远端 Port ID" value={lldp.neighborPortId} />}
      {(lldp.duplicates ?? []).map((d, i) => (
        <Row key={`dup-${i}`} label="并行连接" value={parallelLinkLabel(d)} />
      ))}
      {vlans.length > 0 && (
        <Row label="VLANs" value={vlans.length > 1 ? `Trunk ${vlans.join(', ')}` : `${vlans[0]}`} />
      )}
      <Row label="连接" value={(lldp.linkType ?? 'lldp').toUpperCase()} />
      {lldp.confidence && <Row label="可信度" value={lldp.confidence} />}
      {lldp.direction && (
        <Row label="方向" value={lldp.direction === 'one_way' ? '单向（仅一端）' : '双向'} />
      )}
      {lldp.capabilities && lldp.capabilities.length > 0 && (
        <Row label="角色" value={lldp.capabilities.join(', ')} />
      )}
      {hasConflict && (
        <div className="lldp-conflict-note">
          ⚠ LLDP 端口与 Bridge FDB 不一致
          {lldp.conflicts!.map((c, i) => (
            <div key={i} className="lldp-conflict-note__detail">
              {c.source}: FDB {c.fdb_port ?? '?'} ≠ LLDP {c.lldp_port ?? '?'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Client detail ─────────────────────────────────────────────────────────

/** Construct the HA entity_id for this client's device_tracker entity.
 *  HA slugifies the entity name (hostname or MAC) by lowercasing and
 *  replacing non-alphanumeric characters with underscores.
 */
function haEntityId(mac: string, hostname: string): string {
  const name = hostname && hostname !== mac ? hostname : mac;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `device_tracker.${slug}`;
}

const CONNECTION_TYPE_LABEL: Record<ConnectionType, string> = {
  wired:         '有线（LAN）',
  wireless:      'WLAN',
  router_uplink: 'Router Uplink',
  unknown:       '未知',
};

function formatLastSeenIso(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function ClientDetail({ data, apName, actions }: { data: Client; apName: string; actions?: DetailPanelActions }) {
  const q = SIGNAL_QUALITY_LABEL[signalQuality(data.signal)];
  const entityId = haEntityId(data.mac, data.hostname);
  const connectedStr = data.connectedSince ? formatConnectedSince(data.connectedSince) : '';
  const leaseStr = data.dhcpExpires ? formatLeaseExpiry(data.dhcpExpires) : '';
  const webUrl = data.webUrl;
  const isWireless = data.connectionType === 'wireless' || (data.connectionType == null && data.isWifiClient);

  const nameNode = webUrl ? (
    <a href={webUrl} target="_blank" rel="noopener noreferrer" className="port-device-row__link" title="打开 Web 界面">
      {data.name || data.mac} ↗
    </a>
  ) : (data.name || data.mac);

  const ipNode = data.ip
    ? (webUrl
        ? <a href={webUrl} target="_blank" rel="noopener noreferrer" className="port-device-row__link" title="打开 Web 界面">{data.ip} ↗</a>
        : data.ip)
    : '—';

  return (
    <>
      {data.stale && <div className="detail-stale-note">⚠ {STALE_HINT}</div>}
      <div className="detail-section">
        <div className="detail-section__heading">设备</div>
        <Row label="名称" value={nameNode} />
        <Row label="IP"         value={ipNode} />
        <Row label="主机名" value={data.hostname !== data.mac ? data.hostname : '—'} />
        <Row label="厂商" value={data.manufacturer ?? data.vendor ?? '—'} />
        {data.haModel && <Row label="型号" value={data.haModel} />}
        <Row label="状态" value={<StatusBadge status={data.status} />} />
      </div>
      <div className="detail-section">
        <div className="detail-section__heading">网络</div>
        <Row label="MAC" value={data.randomMac ? `${data.mac}（私有）` : data.mac} />
        {data.connectionType && (
          <Row label="连接类型" value={CONNECTION_TYPE_LABEL[data.connectionType]} />
        )}
        <Row label="频段" value={data.band || '—'} />
        <Row label="AP"     value={apName} />
        {data.iface     && <Row label="Port/Interface" value={data.iface} />}
        {data.vlanId != null && <Row label="VLAN" value={`VLAN ${data.vlanId}`} />}
        {data.linkSpeed != null && <Row label="Link-Speed" value={data.linkSpeed >= 1000 ? `${data.linkSpeed / 1000} Gbit/s` : `${data.linkSpeed} Mbit/s`} />}
        {data.source && <Row label="来源" value={data.source} />}
        {data.confidence && <Row label="可信度" value={<ConfidenceBadge confidence={data.confidence} />} />}
        {connectedStr && <Row label="已连接" value={connectedStr} />}
        {leaseStr && <Row label="Lease 到期" value={leaseStr} />}
        {data.lastSeen && <Row label="最后出现" value={formatLastSeenIso(data.lastSeen)} />}
      </div>
      {isWireless && (
        <div className="detail-section">
          <div className="detail-section__heading">信号</div>
          <Row label="信号" value={<><SignalBar dbm={data.signal} /> {data.signal} dBm</>} />
          <Row label="质量" value={q} />
        </div>
      )}

      {(data.rxBytes != null || data.txBytes != null) && (
        <div className="detail-section">
          <div className="detail-section__heading">数据（本次连接）</div>
          <BytesBars rx={data.rxBytes ?? 0} tx={data.txBytes ?? 0} />
        </div>
      )}

      {actions && (
        <div className="inspector-actions">
          <ActionBtn icon="◎" label="聚焦 AP" onClick={() => actions.onFocusNode(data.apId)} />
          <ActionBtn icon="⚠" label="告警" onClick={actions.onShowAlerts} />
        </div>
      )}

      {/* ── HA entity link ── */}
      <a
        className="detail-ha-link"
        href={`/config/entities/edit/${entityId}`}
        title={`Entity: ${entityId}`}
      >
        在 HA 中查看 →
      </a>
    </>
  );
}

// ── Mini traffic / resource bars ─────────────────────────────────────────

function MiniBar({ label, pct, color, value }: {
  label: string; pct: number; color: string; value: string;
}) {
  return (
    <div className="mini-bar">
      <span className="mini-bar__label">{label}</span>
      <div className="mini-bar__track">
        <div className="mini-bar__fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
      <span className="mini-bar__value">{value}</span>
    </div>
  );
}

function WanTrafficBars({ down, up }: { down: number; up: number }) {
  const max = Math.max(down, up, 1);
  return (
    <div className="mini-bar-group">
      <MiniBar label="↓" pct={down / max * 100} color="var(--accent)"  value={formatBitRate(down)} />
      <MiniBar label="↑" pct={up   / max * 100} color="var(--success)" value={formatBitRate(up)} />
    </div>
  );
}

function BytesBars({ rx, tx }: { rx: number; tx: number }) {
  const max = Math.max(rx, tx, 1);
  return (
    <div className="mini-bar-group">
      <MiniBar label="RX" pct={rx / max * 100} color="var(--accent)"  value={formatBytes(rx)} />
      <MiniBar label="TX" pct={tx / max * 100} color="var(--success)" value={formatBytes(tx)} />
    </div>
  );
}

function ResourceBars({ cpu, mem }: { cpu?: number; mem?: number }) {
  return (
    <div className="mini-bar-group">
      {cpu != null && (
        <MiniBar
          label="CPU" pct={cpu}
          color={cpu > 80 ? 'var(--danger)' : cpu > 60 ? 'var(--warning)' : 'var(--success)'}
          value={`${cpu.toFixed(0)}%`}
        />
      )}
      {mem != null && (
        <MiniBar
          label="RAM" pct={mem}
          color={mem > 85 ? 'var(--danger)' : mem > 70 ? 'var(--warning)' : 'var(--accent)'}
          value={`${mem.toFixed(0)}%`}
        />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function SsidList({ ssids }: { ssids: SsidInfo[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {ssids.map((s, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.ssid}
          </span>
          <span style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {s.band && (
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                {s.band}
              </span>
            )}
            {s.channel && (
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }}>
                ch{s.channel}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

const VLAN_COLORS_PANEL = [
  '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ef4444', '#eab308', '#14b8a6',
];

function PortList({ ports, accessPoints }: { ports: PortStat[]; accessPoints: AccessPoint[] }) {
  // Build port → AP name map using connectedDevice MAC → AP MAC matching
  const apByMac = new Map<string, string>();
  for (const ap of accessPoints) {
    // ap.id is used as MAC in some versions — use name as display
    apByMac.set(ap.ip, ap.name);
  }
  const apByPort = new Map<string, string>();
  for (const p of ports) {
    if (p.connectedDevice) {
      // connectedDevice may be hostname or MAC — try to match AP by hostname
      const matchedAp = accessPoints.find(ap =>
        ap.name.toLowerCase() === (p.connectedDevice ?? '').toLowerCase() ||
        ap.ip === p.connectedDevice
      );
      if (matchedAp) apByPort.set(p.name, matchedAp.name);
    }
  }

  const sortedPorts = [...ports]
    .filter(p => /^(wan\d*|lan\d+)$/i.test(p.name))
    .sort((a, b) => {
      const key = (n: string) => /^wan/i.test(n) ? 0 : (parseInt(n.match(/(\d+)$/)?.[1] ?? '99') + 1);
      return key(a.name) - key(b.name);
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {sortedPorts.map(p => {
        const apName = apByPort.get(p.name);
        // Show AP name if known, otherwise fall back to connectedDevice (hostname/MAC)
        const deviceLabel = apName ?? p.connectedDevice ?? null;
        // If it looks like a raw MAC (xx:xx:xx format), skip it — not useful
        const isMac = deviceLabel ? /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(deviceLabel) : false;
        const showDevice = deviceLabel && !isMac;

        return (
        <div key={p.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: p.up ? 'var(--green)' : 'var(--text-muted)',
              boxShadow: p.up ? '0 0 5px rgba(34,197,94,0.6)' : 'none',
            }} />
            <span style={{ fontSize: 11.5, color: p.up ? 'var(--text-primary)' : 'var(--text-muted)', flex: 1 }}>
              {p.name.toUpperCase()}
            </span>
            {p.up && p.speed_mbps != null && (
              <span style={{ fontSize: 10.5, color: 'var(--green)', fontWeight: 500 }}>
                {p.speed_mbps >= 1000 ? `${p.speed_mbps / 1000}G` : `${p.speed_mbps}M`}
              </span>
            )}
            {!p.up && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>无 Link</span>
            )}
          </div>
          {(p.vlanIds ?? []).length > 0 && (
            <div style={{ display: 'flex', gap: 4, paddingLeft: 16 }}>
              {p.vlanIds!.map(id => (
                <span key={id} style={{
                  fontSize: 10, padding: '0 5px', borderRadius: 3,
                  background: `${VLAN_COLORS_PANEL[id % VLAN_COLORS_PANEL.length]}22`,
                  color: VLAN_COLORS_PANEL[id % VLAN_COLORS_PANEL.length],
                  border: `1px solid ${VLAN_COLORS_PANEL[id % VLAN_COLORS_PANEL.length]}55`,
                }}>
                  VLAN {id}
                </span>
              ))}
            </div>
          )}
          {showDevice && (
            <div style={{ fontSize: 10, color: '#93c5fd', paddingLeft: 16 }}>
              → {deviceLabel}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

function VlanList({ vlans }: { vlans: VlanInfo[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {vlans.map(v => (
        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: v.status === 'up' ? 'var(--green)' : v.status === 'down' ? 'var(--red)' : 'var(--text-muted)',
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent, #60a5fa)', minWidth: 52 }}>
            VLAN {v.id}
          </span>
          <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', flex: 1 }}>
            {v.interface}
          </span>
          <span style={{ fontSize: 10, color: v.status === 'up' ? 'var(--green)' : 'var(--text-muted)' }}>
            {v.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Port detail (click on a port chip / port device dot) ─────────────────

function ConfidenceBadge({ confidence }: { confidence: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span className={`confidence-dot confidence-dot--${confidence}`} />
      {CONFIDENCE_LABEL[confidence] ?? confidence}
    </span>
  );
}

function PortDetail({ data: p, routerName, actions }: { data: PortStat; routerName: string; actions?: DetailPanelActions }) {
  const devices = p.connectedDevices ?? [];
  const total = p.deviceCount ?? devices.length;
  const wan = isWanPort(p);
  const legacyOnly = p.connectedDevices === undefined;

  return (
    <>
      <div className="detail-section">
        <div className="detail-section__heading">常规</div>
        <Row label="Port"   value={`${shortName(p.name)} (${p.name})`} />
        <Row label="Router" value={routerName} />
        <Row label="状态" value={p.up ? 'Link up' : '无 Link'} />
        {p.up && p.speed_mbps != null && (
          <Row label="速率" value={`${p.speed_mbps} Mbps${p.duplex ? ` ${p.duplex}` : ''}`} />
        )}
        {(p.vlanIds ?? []).length > 0 && (
          <Row label="VLANs" value={p.vlanIds!.join(', ')} />
        )}
        {!wan && !legacyOnly && (
          <Row label="映射可信度" value={<ConfidenceBadge confidence={p.mappingConfidence ?? 'none'} />} />
        )}
      </div>

      {wan ? (
        <div className="detail-section">
          <div className="detail-section__heading">连接</div>
          <div className="port-detail__note">
            互联网 Uplink — WAN 侧无法映射客户端。
          </div>
        </div>
      ) : (
        <div className="detail-section">
          <div className="detail-section__heading">
            已连接设备{!legacyOnly && `（${total}）`}
          </div>
          {legacyOnly && (
            <div className="port-detail__note">
              {p.connectedDevice
                ? `→ ${p.connectedDevice}`
                : '此快照中没有设备数据。'}
            </div>
          )}
          {!legacyOnly && devices.length === 0 && (
            <div className="port-detail__note">
              {p.up
                ? '无法可靠映射设备 — FDB 为空或设备当前无流量。'
                : '无 Link。'}
            </div>
          )}
          {devices.map((d) => (
            <PortDeviceRow key={d.mac || deviceLabel(d)} device={d} actions={actions} />
          ))}
          {total > devices.length && (
            <div className="port-detail__note">… 另有 {total - devices.length} 台（列表已截断）</div>
          )}
        </div>
      )}
    </>
  );
}

function PortDeviceRow({ device: d, actions }: { device: PortDevice; actions?: DetailPanelActions }) {
  const url = safeHttpUrl(d.ip);
  return (
    <div className="port-device-row">
      <div className="port-device-row__head">
        <span className={`confidence-dot confidence-dot--${d.confidence}`} />
        <span className="port-device-row__name">{d.name ?? d.ip ?? '未知'}</span>
        {d.isRouter && <span className="port-device-row__tag">AP</span>}
      </div>
      {d.ip && (
        <Row
          label="IP"
          value={
            url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="port-device-row__link"
                title="在浏览器中打开 Web 界面"
              >
                {d.ip} ↗
              </a>
            ) : (
              d.ip
            )
          }
        />
      )}
      {d.mac && <Row label="MAC" value={<span className="port-device-row__mac">{d.mac}</span>} />}
      {d.source && <Row label="来源" value={d.source} />}
      <Row label="映射可信度" value={<ConfidenceBadge confidence={d.confidence} />} />
      {d.isRouter && d.routerNodeId && actions && (
        <ActionBtn icon="→" label="转到 Access Point" onClick={() => actions.onFocusNode(d.routerNodeId!)} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** Dot + text label — more readable than a bare 7px dot in a detail row. */
function StatusBadge({ status }: { status: NodeStatus }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <StatusDot status={status} />
      {statusLabel(status)}
    </span>
  );
}
