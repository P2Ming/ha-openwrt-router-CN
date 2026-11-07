import React, { useState, useMemo } from 'react';
import { TopologyData, TopologySnapshot } from '../types';

interface Props {
  data: TopologyData;
}

function formatTs(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    + ' ' + d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function formatAgo(ts: number): string {
  const secs = Math.floor(Date.now() / 1000) - ts;
  if (secs < 60) return `${secs} 秒前`;
  if (secs < 3600) return `${Math.floor(secs / 60)} 分钟前`;
  return `${Math.floor(secs / 3600)} 小时 ${Math.floor((secs % 3600) / 60)} 分钟前`;
}

interface DiffEntry {
  id: string;
  label: string;
  change: 'added' | 'removed' | 'changed';
  detail?: string;
}

function diffSnapshots(a: TopologySnapshot, b: TopologySnapshot): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  const aIds = new Map(a.routers.map(r => [r.id, r]));
  const bIds = new Map(b.routers.map(r => [r.id, r]));

  // Removed routers (in A but not B)
  for (const [id, r] of aIds) {
    if (!bIds.has(id)) {
      diffs.push({ id, label: r.hostname || r.ip, change: 'removed', detail: r.ip });
    }
  }
  // Added routers (in B but not A)
  for (const [id, r] of bIds) {
    if (!aIds.has(id)) {
      diffs.push({ id, label: r.hostname || r.ip, change: 'added', detail: r.ip });
    }
  }

  // Client count change
  const clientDelta = b.client_count - a.client_count;
  if (clientDelta !== 0) {
    diffs.push({
      id: '__clients__',
      label: '客户端数量',
      change: 'changed',
      detail: `${a.client_count} → ${b.client_count} (${clientDelta > 0 ? '+' : ''}${clientDelta})`,
    });
  }

  // WAN connectivity change
  if (a.wan_connected !== b.wan_connected) {
    diffs.push({
      id: '__wan__',
      label: 'WAN 连接',
      change: b.wan_connected ? 'added' : 'removed',
      detail: b.wan_connected ? '在线' : '离线',
    });
  }

  return diffs;
}

export function CompareView({ data }: Props) {
  const snapshots = data.gateway.topologySnapshots ?? [];

  const [idxA, setIdxA] = useState<number>(0);
  const [idxB, setIdxB] = useState<number | 'live'>('live');

  // Live snapshot built from current data
  const liveSnapshot: TopologySnapshot = useMemo(() => ({
    ts: Math.floor(Date.now() / 1000),
    routers: data.accessPoints.map(ap => ({
      id: ap.id,
      hostname: ap.name,
      ip: ap.ip,
      status: ap.status,
    })),
    client_count: data.clients.length,
    wan_connected: data.gateway.status !== 'offline',
  }), [data]);

  const snapshotA = snapshots[idxA];
  const snapshotB = idxB === 'live' ? liveSnapshot : snapshots[idxB];

  const diffs = useMemo(() => {
    if (!snapshotA || !snapshotB) return [];
    return diffSnapshots(snapshotA, snapshotB);
  }, [snapshotA, snapshotB]);

  if (snapshots.length === 0) {
    return (
      <div className="compare-view compare-view--empty">
        <div className="compare-view__empty-icon">📷</div>
        <div className="compare-view__empty-title">暂无快照</div>
        <div className="compare-view__empty-hint">
          系统每 5 分钟自动保存一次快照。<br />
          生成第一个快照后即可进行对比。
        </div>
      </div>
    );
  }

  return (
    <div className="compare-view">
      <div className="compare-view__header">
        <h2 className="compare-view__title">前后对比</h2>
        <p className="compare-view__sub">选择两个时间点，查看期间发生的变化。</p>
      </div>

      {/* Selector Row */}
      <div className="compare-view__selectors">
        <div className="compare-selector">
          <div className="compare-selector__label">之前</div>
          <select
            className="compare-selector__select"
            value={idxA}
            onChange={e => setIdxA(Number(e.target.value))}
          >
            {snapshots.map((s, i) => (
              <option key={s.ts} value={i}>
                {formatTs(s.ts)} ({formatAgo(s.ts)})
              </option>
            ))}
          </select>
          {snapshotA && (
            <div className="compare-selector__meta">
              {snapshotA.client_count} 个客户端 · WAN {snapshotA.wan_connected ? '✓' : '✗'}
            </div>
          )}
        </div>

        <div className="compare-selector__arrow">→</div>

        <div className="compare-selector">
          <div className="compare-selector__label">之后</div>
          <select
            className="compare-selector__select"
            value={idxB === 'live' ? 'live' : idxB}
            onChange={e => setIdxB(e.target.value === 'live' ? 'live' : Number(e.target.value))}
          >
            <option value="live">当前（实时）</option>
            {snapshots.map((s, i) => (
              <option key={s.ts} value={i}>
                {formatTs(s.ts)} ({formatAgo(s.ts)})
              </option>
            ))}
          </select>
          <div className="compare-selector__meta">
            {snapshotB.client_count} 个客户端 · WAN {snapshotB.wan_connected ? '✓' : '✗'}
          </div>
        </div>
      </div>

      {/* Diff Result */}
      <div className="compare-diff">
        <div className="compare-diff__title">
          变化（{diffs.length}）
        </div>

        {diffs.length === 0 ? (
          <div className="compare-diff__none">
            <span className="compare-diff__none-icon">✓</span>
            两个时间点之间没有变化
          </div>
        ) : (
          <div className="compare-diff__list">
            {diffs.map(d => (
              <div key={d.id} className={`compare-diff__item compare-diff__item--${d.change}`}>
                <span className="compare-diff__badge">
                  {d.change === 'added' ? '+' : d.change === 'removed' ? '−' : '~'}
                </span>
                <span className="compare-diff__label">{d.label}</span>
                {d.detail && <span className="compare-diff__detail">{d.detail}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Snapshot Timeline */}
      <div className="compare-timeline">
        <div className="compare-timeline__title">已保存快照（{snapshots.length}/20）</div>
        <div className="compare-timeline__list">
          {[...snapshots].reverse().map((s, i) => {
            const origIdx = snapshots.length - 1 - i;
            const isA = origIdx === idxA;
            const isB = idxB !== 'live' && origIdx === idxB;
            return (
              <div
                key={s.ts}
                className={`compare-timeline__item${isA ? ' is-a' : ''}${isB ? ' is-b' : ''}`}
              >
                <span className="compare-timeline__ts">{formatTs(s.ts)}</span>
                <span className="compare-timeline__clients">{s.client_count} 个客户端</span>
                <span className={`compare-timeline__wan${s.wan_connected ? ' up' : ' down'}`}>
                  WAN {s.wan_connected ? '●' : '○'}
                </span>
                <div className="compare-timeline__actions">
                  <button
                    className={`compare-timeline__btn${isA ? ' active' : ''}`}
                    onClick={() => setIdxA(origIdx)}
                    title="设为之前"
                  >A</button>
                  <button
                    className={`compare-timeline__btn${isB ? ' active' : ''}`}
                    onClick={() => setIdxB(origIdx)}
                    title="设为之后"
                  >B</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
