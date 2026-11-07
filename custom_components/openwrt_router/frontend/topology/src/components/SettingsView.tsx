/**
 * SettingsView — Integration info, links to HA config, and about section.
 */

import React from 'react';

interface SettingsViewProps {
  pollIntervalSeconds?: number;
}

export function SettingsView({ pollIntervalSeconds }: SettingsViewProps) {
  const interval = pollIntervalSeconds ?? 60;
  return (
    <div className="topo-view">
      <div className="view-header">
        <span className="view-title">设置</span>
      </div>

      {/* Integration */}
      <div className="settings-card">
        <div className="settings-card__heading">集成</div>
        <a
          className="settings-link"
          href="/config/integrations"
          title="打开 HA 集成"
        >
          打开集成设置 →
        </a>
        <a
          className="settings-link"
          href="/config/entities?domain=sensor&search=openwrt"
          title="在 HA 中打开 OpenWrt 实体"
        >
          OpenWrt 实体管理 →
        </a>
        <a
          className="settings-link"
          href="/config/devices"
          title="HA 中的设备"
        >
          设备管理 →
        </a>
      </div>

      {/* Data */}
      <div className="settings-card">
        <div className="settings-card__heading">数据维护</div>
        <div className="settings-row">
          <span className="settings-row__label">轮询间隔</span>
          <span className="settings-row__value">{interval} 秒</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">API 接口</span>
          <span className="settings-row__value settings-row__value--mono">/api/openwrt_topology/snapshot</span>
        </div>
        <div className="settings-info">
          HA 后端按集成选项中的间隔读取路由器数据，网口 RX/TX 速率和本页面会同步刷新。
          可在“设置 → 设备与服务 → OpenWrt Router → 配置”中修改。
        </div>
      </div>

      {/* About */}
      <div className="settings-card">
        <div className="settings-card__heading">关于</div>
        <div className="settings-row">
          <span className="settings-row__label">集成</span>
          <span className="settings-row__value">ha-openwrt-router</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Domain</span>
          <span className="settings-row__value settings-row__value--mono">openwrt_router</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">GitHub</span>
          <span className="settings-row__value">
            <a
              className="settings-link settings-link--inline"
              href="https://github.com/P2Ming/ha-openwrt-router-CN"
              target="_blank"
              rel="noopener noreferrer"
            >
              P2Ming/ha-openwrt-router-CN ↗
            </a>
          </span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Schema</span>
          <span className="settings-row__value settings-row__value--mono">v1.0</span>
        </div>
      </div>
    </div>
  );
}
