/**
 * AlertsView — shows anomaly alerts + offline/warning devices.
 * Uses useAlerts hook for threshold-based rules, plus status-based checks.
 */

import React from 'react';
import { TopologyData, AccessPoint, Client, NodeStatus } from '../types';
import { useAlerts, Alert } from '../useAlerts';
import { StatusDot } from './StatusDot';
import { IconRouter, IconAP, IconSmartphone, IconLaptop, IconIoT, IconGuest, IconOther } from './Icons';

interface Props {
  data: TopologyData;
  onSelectGateway: () => void;
  onSelectAP: (ap: AccessPoint) => void;
  onSelectClient: (client: Client) => void;
}

function ClientIcon({ category }: { category: Client['category'] }) {
  const s = 14;
  switch (category) {
    case 'smartphone': return <IconSmartphone size={s} />;
    case 'laptop':     return <IconLaptop size={s} />;
    case 'iot':        return <IconIoT size={s} />;
    case 'guest':      return <IconGuest size={s} />;
    default:           return <IconOther size={s} />;
  }
}

export function AlertsView({ data, onSelectGateway, onSelectAP, onSelectClient }: Props) {
  const anomalyAlerts = useAlerts(data);

  // Status-based checks (offline / warning nodes)
  const offlineNodes   = data.accessPoints.filter(a => a.status === 'offline');
  const warningNodes   = data.accessPoints.filter(a => a.status === 'warning');
  const offlineClients = data.clients.filter(c => c.status === 'offline');
  const warningClients = data.clients.filter(c => c.status === 'warning');
  // A placeholder gateway (no routers in the snapshot) is not "offline".
  const gwOffline      = !data.noRouters && data.gateway.status !== 'online';

  const statusTotal = offlineNodes.length + warningNodes.length + offlineClients.length + warningClients.length + (gwOffline ? 1 : 0);
  const total = anomalyAlerts.length + statusTotal;

  // Build AP name lookup
  const apNames = new Map<string, string>();
  apNames.set(data.gateway.id, data.gateway.name);
  data.accessPoints.forEach(ap => apNames.set(ap.id, ap.name));

  // Lookup maps for click handlers
  const apById = new Map(data.accessPoints.map(ap => [ap.id, ap]));
  const clientById = new Map(data.clients.map(c => [c.id, c]));

  function handleAlertClick(alert: Alert) {
    if (alert.nodeType === 'gateway') { onSelectGateway(); return; }
    if (alert.nodeType === 'ap') { const ap = apById.get(alert.nodeId); if (ap) onSelectAP(ap); return; }
    if (alert.nodeType === 'client') { const cl = clientById.get(alert.nodeId); if (cl) onSelectClient(cl); }
  }

  if (total === 0) {
    return (
      <div className="topo-view">
        <div className="view-header">
          <span className="view-title">告警</span>
          <span className="view-count">0 个问题</span>
        </div>
        <div className="alert-empty">
          <div className="alert-empty__icon">✓</div>
          <div className="alert-empty__text">所有设备均在线 — 无告警</div>
        </div>
      </div>
    );
  }

  const criticalAlerts = anomalyAlerts.filter(a => a.severity === 'critical');
  const warningAlerts  = anomalyAlerts.filter(a => a.severity === 'warning');

  return (
    <div className="topo-view">
      <div className="view-header">
        <span className="view-title">告警</span>
        <span className="view-count alert-count">{total} 个问题</span>
      </div>

      {/* ── Anomaly alerts: critical ── */}
      {criticalAlerts.length > 0 && (
        <AlertSection heading={`${criticalAlerts.length} 个严重问题`} severity="offline">
          {criticalAlerts.map(alert => (
            <AnomalyRow key={alert.id} alert={alert} onClick={() => handleAlertClick(alert)} />
          ))}
        </AlertSection>
      )}

      {/* ── Anomaly alerts: warning ── */}
      {warningAlerts.length > 0 && (
        <AlertSection heading={`${warningAlerts.length} 个警告`} severity="warning">
          {warningAlerts.map(alert => (
            <AnomalyRow key={alert.id} alert={alert} onClick={() => handleAlertClick(alert)} />
          ))}
        </AlertSection>
      )}

      {/* ── Status-based: gateway ── */}
      {gwOffline && (
        <AlertSection heading={`Gateway ${data.gateway.status}`} severity={data.gateway.status}>
          <AlertNodeRow
            icon={<IconRouter size={16} />}
            name={data.gateway.name}
            sub={data.gateway.model + ' · ' + data.gateway.ip}
            status={data.gateway.status}
            onClick={onSelectGateway}
          />
        </AlertSection>
      )}

      {/* ── Offline APs ── */}
      {offlineNodes.length > 0 && (
        <AlertSection heading={`${offlineNodes.length} 个 AP 离线`} severity="offline">
          {offlineNodes.map(ap => (
            <AlertNodeRow
              key={ap.id}
              icon={<IconAP size={15} />}
              name={ap.name}
              sub={ap.model + ' · ' + ap.ip}
              status="offline"
              onClick={() => onSelectAP(ap)}
            />
          ))}
        </AlertSection>
      )}

      {/* ── Warning APs ── */}
      {warningNodes.length > 0 && (
        <AlertSection heading={`${warningNodes.length} 个 AP 有警告`} severity="warning">
          {warningNodes.map(ap => (
            <AlertNodeRow
              key={ap.id}
              icon={<IconAP size={15} />}
              name={ap.name}
              sub={ap.model + ' · ' + ap.ip}
              status="warning"
              onClick={() => onSelectAP(ap)}
            />
          ))}
        </AlertSection>
      )}

      {/* ── Offline clients ── */}
      {offlineClients.length > 0 && (
        <AlertSection heading={`${offlineClients.length} 个客户端离线`} severity="offline">
          {offlineClients.map(c => (
            <AlertClientRow
              key={c.id}
              client={c}
              apName={apNames.get(c.apId) ?? c.apId}
              onClick={() => onSelectClient(c)}
            />
          ))}
        </AlertSection>
      )}

      {/* ── Warning clients ── */}
      {warningClients.length > 0 && (
        <AlertSection heading={`${warningClients.length} 个客户端有警告`} severity="warning">
          {warningClients.map(c => (
            <AlertClientRow
              key={c.id}
              client={c}
              apName={apNames.get(c.apId) ?? c.apId}
              onClick={() => onSelectClient(c)}
            />
          ))}
        </AlertSection>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function AlertSection({ heading, severity, children }: {
  heading: string;
  severity: NodeStatus | 'offline';
  children: React.ReactNode;
}) {
  return (
    <div className="alert-section">
      <div className={`alert-section__heading alert-section__heading--${severity}`}>{heading}</div>
      {children}
    </div>
  );
}

function AnomalyRow({ alert, onClick }: { alert: Alert; onClick: () => void }) {
  return (
    <div className={`alert-row alert-anomaly alert-anomaly--${alert.severity}`} onClick={onClick}>
      <div className="alert-row__icon">
        <span className={`anomaly-icon anomaly-icon--${alert.severity}`}>
          {alert.severity === 'critical' ? '✕' : '!'}
        </span>
      </div>
      <div className="alert-row__info">
        <div className="alert-row__name">{alert.message}</div>
        <div className="alert-row__sub">{alert.nodeName}</div>
      </div>
    </div>
  );
}

function AlertNodeRow({ icon, name, sub, status, onClick }: {
  icon: React.ReactNode;
  name: string;
  sub: string;
  status: NodeStatus;
  onClick: () => void;
}) {
  return (
    <div className={`alert-row alert-row--${status}`} onClick={onClick}>
      <div className="alert-row__icon">{icon}</div>
      <div className="alert-row__info">
        <div className="alert-row__name">{name}</div>
        <div className="alert-row__sub">{sub}</div>
      </div>
      <StatusDot status={status} />
    </div>
  );
}

function AlertClientRow({ client, apName, onClick }: {
  client: Client;
  apName: string;
  onClick: () => void;
}) {
  return (
    <div className={`alert-row alert-row--${client.status}`} onClick={onClick}>
      <div className="alert-row__icon">
        <ClientIcon category={client.category} />
      </div>
      <div className="alert-row__info">
        <div className="alert-row__name">{client.name !== client.mac ? client.name : client.hostname || client.mac}</div>
        <div className="alert-row__sub">{client.ip || client.mac} · {apName}</div>
      </div>
      <StatusDot status={client.status} />
    </div>
  );
}
