import React from 'react';
import { NodeStatus } from '../types';

export function StatusDot({ status }: { status: NodeStatus }) {
  return <span className={`status-dot ${status}`} />;
}

export function statusLabel(status: NodeStatus): string {
  return status === 'online' ? '在线' : status === 'warning' ? '警告' : '离线';
}
