import React, { useState } from 'react';
import {
  Search,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Satellite,
  Compass,
} from 'lucide-react';
import { Alert, ThreatLevel, AlertStatus } from '../domain/models.ts';

interface AlertsRailProps {
  alerts: Alert[];
  selectedAlertId: string | null;
  onSelectAlert: (alertId: string) => void;
  filterThreatLevel: ThreatLevel | 'ALL';
  setFilterThreatLevel: (level: ThreatLevel | 'ALL') => void;
  filterRule: string | 'ALL';
  setFilterRule: (rule: string | 'ALL') => void;
  filterStatus: AlertStatus | 'ALL';
  setFilterStatus: (status: AlertStatus | 'ALL') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AlertsRail: React.FC<AlertsRailProps> = ({
  alerts,
  selectedAlertId,
  onSelectAlert,
  filterThreatLevel,
  setFilterThreatLevel,
  filterRule,
  setFilterRule,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filter pipeline
  const filteredAlerts = alerts.filter((alert) => {
    if (filterThreatLevel !== 'ALL' && alert.threat_level !== filterThreatLevel) return false;
    if (filterStatus !== 'ALL' && alert.status !== filterStatus) return false;
    if (filterRule !== 'ALL') {
      const hasRule = alert.findings.some((f) => f.rule_id === filterRule);
      if (!hasRule) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = alert.vessel_name.toLowerCase().includes(q);
      const matchesMmsi = alert.mmsi.toLowerCase().includes(q);
      const matchesRule = alert.primary_rule.toLowerCase().includes(q);
      if (!matchesName && !matchesMmsi && !matchesRule) return false;
    }
    return true;
  });

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-[#080c16]/95 border-r border-white/[0.07] flex flex-col items-center py-3 z-30 select-none">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/[0.04] rounded-md transition-colors"
          title="Expand Threat Queue"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="relative cursor-pointer" onClick={onToggleCollapse}>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="absolute -top-1 -right-2 text-[9px] font-mono font-bold text-rose-300 bg-rose-500/20 px-1 rounded-full">
              {alerts.length}
            </span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-[#080c16]/98 border-r border-white/[0.07] flex flex-col h-[calc(100vh-3.25rem-3.75rem)] select-none z-30 transition-all">
      {/* Top Header & Search */}
      <div className="p-3 border-b border-white/[0.07] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span className="tracking-wider uppercase">Threat Queue</span>
            <span className="text-slate-500 text-[11px] tabular-nums">({filteredAlerts.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-1 rounded text-slate-400 hover:text-slate-200 transition-colors ${
                showAdvancedFilters || filterRule !== 'ALL' || filterStatus !== 'ALL'
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : ''
              }`}
              title="Filter Anomaly Rules"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
              title="Collapse Panel"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Minimal Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vessel, MMSI, or rule..."
            className="w-full bg-[#0d1322] border border-white/[0.07] focus:border-cyan-500/50 rounded-md pl-8 pr-7 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quiet Segmented Filter Tabs */}
        <div className="flex items-center gap-1 p-0.5 bg-[#0d1322] rounded-md border border-white/[0.07]">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilterThreatLevel(level)}
              className={`flex-1 py-1 text-[10px] font-mono rounded transition-colors ${
                filterThreatLevel === level
                  ? level === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 font-bold'
                    : level === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : level === 'MEDIUM'
                    ? 'bg-yellow-500/20 text-yellow-300 font-bold'
                    : 'bg-white/10 text-slate-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Expandable Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-2 border-t border-white/[0.06] space-y-2 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">RULE FILTER</span>
              <select
                value={filterRule}
                onChange={(e) => setFilterRule(e.target.value)}
                className="w-full bg-[#0d1322] border border-white/[0.08] text-xs text-slate-300 p-1.5 rounded focus:outline-none"
              >
                <option value="ALL">All Detectors</option>
                <option value="dark_vessel">Dark Vessel / SAR</option>
                <option value="rendezvous">Ship-to-Ship (STS)</option>
                <option value="ais_gap">AIS Gap</option>
                <option value="zone_intrusion">Zone Intrusion</option>
                <option value="position_jump">AIS Spoofing</option>
                <option value="sanctioned_or_flagged_vessel">Sanctioned Entity</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Clean Alert List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] custom-scrollbar">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono space-y-1">
            <p>No threats match filter</p>
            <button
              onClick={() => {
                setFilterThreatLevel('ALL');
                setFilterRule('ALL');
                setSearchQuery('');
              }}
              className="text-cyan-400 hover:underline text-[11px]"
            >
              Reset filters
            </button>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isSelected = selectedAlertId === alert.id;
            const isCritical = alert.threat_level === 'CRITICAL';
            const isHigh = alert.threat_level === 'HIGH';

            return (
              <div
                key={alert.id}
                onClick={() => onSelectAlert(alert.id)}
                className={`p-3 cursor-pointer transition-colors border-l-2 ${
                  isSelected
                    ? 'bg-cyan-950/30 border-cyan-400'
                    : isCritical
                    ? 'hover:bg-white/[0.02] border-rose-500/70'
                    : isHigh
                    ? 'hover:bg-white/[0.02] border-amber-500/70'
                    : 'hover:bg-white/[0.02] border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-100 truncate">
                        {alert.vessel_name}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      MMSI: {alert.mmsi}
                      <span className="mx-1 text-slate-600">·</span>
                      <span className="text-slate-500 uppercase">{alert.status}</span>
                    </div>
                  </div>

                  {/* Clean unboxed tabular score */}
                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono text-sm font-bold tabular-nums ${
                        isCritical
                          ? 'text-rose-400'
                          : isHigh
                          ? 'text-amber-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      {alert.score}
                    </span>
                    <span className="block text-[9px] font-mono text-slate-500 uppercase">
                      {alert.threat_level}
                    </span>
                  </div>
                </div>

                {/* Primary Rule kicker */}
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                  {alert.primary_rule.toLowerCase().includes('sar') ||
                  alert.primary_rule.toLowerCase().includes('dark') ? (
                    <Satellite className="w-3 h-3 text-cyan-400 shrink-0" />
                  ) : alert.primary_rule.toLowerCase().includes('rendezvous') ? (
                    <Compass className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                  )}
                  <span className="truncate">{alert.primary_rule}</span>
                </div>

                {/* Quiet 1-line description snippet */}
                <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                  {alert.findings[0]?.description || alert.summary}
                </p>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
