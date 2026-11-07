/**
 * hints.ts — Shared UI wording for stale data and parallel LLDP links.
 */

import type { LldpDuplicate } from '../types';

/** Tooltip/title text for data served from a router whose last update failed. */
export const STALE_HINT = '数据已过期 — 路由器无法访问';

/** "LAN2 ↔ eth1" — one parallel LLDP link (local port ↔ neighbour port id). */
export function parallelLinkLabel(d: LldpDuplicate): string {
  const local = d.localPort || d.localInterface;
  return `${local ? local.toUpperCase() : '?'} ↔ ${d.neighborPortId || '?'}`;
}
