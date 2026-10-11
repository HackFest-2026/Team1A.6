import React from 'react';
import {
  BarChart3,
  ShieldAlert,
  Satellite,
  Compass,
  AlertTriangle,
  Radio,
  Layers,
  Activity,
} from 'lucide-react';
import { MaritimeOperationalState } from '../domain/models.ts';

interface AnalyticsViewProps {
  state: MaritimeOperationalState | null;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ state }) => {
  if (!state) return null;

  const alerts = state.alerts;
  const criticalCount = alerts.filter((a) => a.threat_level === 'CRITICAL').length;
  const highCount = alerts.filter((a) => a.threat_level === 'HIGH').length;
  const medCount = alerts.filter((a) => a.threat_level === 'MEDIUM').length;

  const ruleCounts: Record<string, number> = {};
  alerts.forEach((a) => {
    a.findings.forEach((f) => {
      ruleCounts[f.rule_name] = (ruleCounts[f.rule_name] || 0) + 1;
    });
  });

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem-4.5rem)] bg-[#040711] overflow-y-auto p-6 space-y-6 font-mono select-none custom-scrollbar">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[#1a233a] pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            MARITIME OPERATIONAL THREAT ANALYTICS
          </h1>
          <span className="text-xs text-slate-400">
            FUSED RADAR, AIS, AND OSINT PATTERN TELEMETRY · ARABIAN SEA SECTOR
          </span>
        </div>
        <div className="text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-3 py-1 rounded">
          ACTIVE TIME WINDOW: 7 DAYS
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#090e1c] border border-[#172238] rounded">
          <span className="text-xs text-slate-400 block mb-1">TOTAL FUSED ALERTS</span>
          <span className="text-2xl font-bold text-slate-100 tabular-nums">
            {alerts.length}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            Across {state.vessels.length} surface contacts
          </span>
        </div>

        <div className="p-4 bg-[#090e1c] border border-rose-900/40 rounded">
          <span className="text-xs text-rose-400 block mb-1">CRITICAL THREATS</span>
          <span className="text-2xl font-bold text-rose-400 tabular-nums">
            {criticalCount}
          </span>
          <span className="text-[10px] text-rose-300/70 block mt-1">
            Require immediate surface/air interception
          </span>
        </div>

        <div className="p-4 bg-[#090e1c] border border-amber-900/40 rounded">
          <span className="text-xs text-amber-400 block mb-1">DARK VESSEL CONTACTS</span>
          <span className="text-2xl font-bold text-amber-400 tabular-nums">
            {state.kpis.dark_vessels_detected}
          </span>
          <span className="text-[10px] text-amber-300/70 block mt-1">
            Uncorrelated Sentinel-1 SAR contacts
          </span>
        </div>

        <div className="p-4 bg-[#090e1c] border border-cyan-900/40 rounded">
          <span className="text-xs text-cyan-400 block mb-1">SENSOR COVERAGE HEALTH</span>
          <span className="text-2xl font-bold text-cyan-300 tabular-nums">
            {state.kpis.sar_coverage_health_pct}%
          </span>
          <span className="text-[10px] text-cyan-300/70 block mt-1">
            SAR radar + AIS receiver constellation
          </span>
        </div>
      </div>

      {/* Detector Contribution Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-[#090e1c] border border-[#172238] rounded space-y-4">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            DETECTOR PLUGIN HIT FREQUENCY
          </h2>

          <div className="space-y-3">
            {Object.entries(ruleCounts).map(([ruleName, count]) => {
              const maxCount = Math.max(...Object.values(ruleCounts), 1);
              const pct = (count / maxCount) * 100;
              return (
                <div key={ruleName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 truncate max-w-xs">{ruleName}</span>
                    <span className="text-cyan-400 font-bold tabular-nums">{count} HITS</span>
                  </div>
                  <div className="w-full bg-[#131c30] h-2 rounded overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Threat Distribution by Zone */}
        <div className="p-4 bg-[#090e1c] border border-[#172238] rounded space-y-4">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            SECTOR THREAT CONCENTRATION
          </h2>

          <div className="space-y-3">
            {state.zones.map((zone) => (
              <div
                key={zone.id}
                className="p-3 bg-[#0c1324] border border-[#1b263e] rounded flex items-center justify-between"
              >
                <div>
                  <h3 className="text-xs font-bold text-slate-200">{zone.name}</h3>
                  <span className="text-[10px] text-slate-400 uppercase">
                    TYPE: {zone.zone_type} · {zone.country}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: zone.color || '#00e5ff' }}
                  />
                  <span className="text-xs font-bold text-slate-300">ACTIVE SECTOR</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
