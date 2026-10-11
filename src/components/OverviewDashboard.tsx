import React, { useState, useMemo } from 'react';
import {
  MaritimeOperationalState,
  Alert,
  Vessel,
  Detection,
  ThreatLevel,
} from '../domain/models.ts';
import { TacticalMapRedesigned, MapLayerConfig } from './TacticalMapRedesigned.tsx';
import {
  ShieldAlert,
  Ship,
  Satellite,
  Radio,
  Eye,
  Sliders,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Filter,
  Sparkles,
} from 'lucide-react';

interface OverviewDashboardProps {
  state: MaritimeOperationalState | null;
  selectedTargetId: string | null;
  onSelectTarget: (id: string) => void;
  onInvestigateAlert: (alertId: string) => void;
  layers: MapLayerConfig;
  onUpdateLayers: (layers: MapLayerConfig) => void;
  onOpenParameters: () => void;
  onOpenBriefing?: () => void;
  onNavigateToInvestigations: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  state,
  selectedTargetId,
  onSelectTarget,
  onInvestigateAlert,
  layers,
  onUpdateLayers,
  onOpenParameters,
  onOpenBriefing,
  onNavigateToInvestigations,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DARK' | 'CRITICAL' | 'STS'>('ALL');

  const vessels = state?.vessels || [];
  const detections = state?.detections || [];
  const alerts = state?.alerts || [];
  const tracks = state?.tracks || {};
  const zones = state?.zones || [];

  // Real Metric Calculations directly from state
  const vesselsTrackedCount = vessels.length;
  const darkVesselsCount = detections.filter((d) => d.is_dark_vessel).length;
  const encountersCount = alerts.filter((a) =>
    a.findings.some((f) => f.rule_id === 'rendezvous')
  ).length;
  const pendingReviewCount = alerts.filter((a) => a.threat_level === 'CRITICAL' || a.threat_level === 'HIGH').length;

  // Filter top priority alerts for the right panel (max 4 prominent items)
  const priorityAlerts = useMemo(() => {
    return alerts
      .filter((a) => {
        if (activeFilter === 'CRITICAL') return a.threat_level === 'CRITICAL';
        if (activeFilter === 'DARK') return a.findings.some((f) => f.rule_id === 'dark_vessel' || f.rule_id === 'ais_gap');
        if (activeFilter === 'STS') return a.findings.some((f) => f.rule_id === 'rendezvous');
        return true;
      })
      .sort((a, b) => {
        const rank: Record<ThreatLevel, number> = {
          CRITICAL: 4,
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
          INFO: 0,
        };
        return rank[b.threat_level] - rank[a.threat_level] || b.score - a.score;
      })
      .slice(0, 4);
  }, [alerts, activeFilter]);

  if (!state) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#050914] text-slate-400">
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>Connecting to Naval Sentinel Surveillance Telemetry...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050914] overflow-hidden select-none font-sans relative">
      {/* 1. MINIMAL HEADER */}
      <header className="h-14 px-5 bg-[#080d19] border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0 z-30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-100 text-sm tracking-wider uppercase font-sans">
              NAVAL SENTINEL
            </h1>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-sans">
              Maritime Threat Detection
            </span>
          </div>
        </div>

        {/* Operational Context Metadata */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-white/[0.08] text-slate-300">
            <span className="text-cyan-400 font-semibold">ARABIAN SEA SECTOR</span>
            <span className="text-slate-600">·</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
              SIMULATED SCENARIO
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-slate-400 px-3 py-1 rounded-full bg-slate-900/60 border border-white/[0.06]">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>08 OCT 2026, 06:00 UTC</span>
          </div>

          <button
            onClick={onNavigateToInvestigations}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/35 text-rose-300 hover:bg-rose-500/25 transition-colors font-sans font-semibold text-xs shadow-sm"
          >
            <Bell className="w-3.5 h-3.5 text-rose-400" />
            <span>{alerts.length} Alerts</span>
          </button>
        </div>
      </header>

      {/* 2. FOUR SUMMARY CARDS (Clickable Filters) */}
      <div className="px-5 py-3 bg-[#060b17] border-b border-white/[0.06] shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Card 1: Vessels Tracked */}
        <div
          onClick={() => setActiveFilter('ALL')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeFilter === 'ALL'
              ? 'bg-cyan-950/30 border-cyan-500/40 shadow-sm'
              : 'bg-[#090e1c] border-white/[0.06] hover:border-white/[0.12]'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="font-semibold uppercase tracking-wider">Vessels Tracked</span>
            <Ship className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-100">
              {vesselsTrackedCount}
            </span>
            <span className="text-[10px] text-slate-400">Surface Vessels</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate font-sans">
            Cooperative transponders active in sector
          </p>
        </div>

        {/* Card 2: Dark Vessel Candidates */}
        <div
          onClick={() => setActiveFilter('DARK')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeFilter === 'DARK'
              ? 'bg-rose-950/30 border-rose-500/40 shadow-sm'
              : 'bg-[#090e1c] border-white/[0.06] hover:border-white/[0.12]'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="font-semibold uppercase tracking-wider text-rose-300">Dark Vessel Candidates</span>
            <Satellite className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-rose-400">
              {darkVesselsCount}
            </span>
            <span className="text-[10px] text-rose-300/80">SAR Detections</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate font-sans">
            Radar returns with no AIS correlation
          </p>
        </div>

        {/* Card 3: Suspicious Encounters */}
        <div
          onClick={() => setActiveFilter('STS')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeFilter === 'STS'
              ? 'bg-amber-950/30 border-amber-500/40 shadow-sm'
              : 'bg-[#090e1c] border-white/[0.06] hover:border-white/[0.12]'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="font-semibold uppercase tracking-wider text-amber-300">Suspicious Encounters</span>
            <Radio className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-amber-400">
              {encountersCount}
            </span>
            <span className="text-[10px] text-amber-300/80">STS Rendezvous</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate font-sans">
            Uncoordinated ship-to-ship proximity &lt;250m
          </p>
        </div>

        {/* Card 4: Alerts Requiring Review */}
        <div
          onClick={() => setActiveFilter('CRITICAL')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeFilter === 'CRITICAL'
              ? 'bg-rose-950/30 border-rose-500/40 shadow-sm'
              : 'bg-[#090e1c] border-white/[0.06] hover:border-white/[0.12]'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Alerts Requiring Review</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-100">
              {pendingReviewCount}
            </span>
            <span className="text-[10px] text-rose-300">Pending Adjudication</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate font-sans">
            Critical threats awaiting commander review
          </p>
        </div>
      </div>

      {/* 3. MAIN CONTENT (CLEAN 70/30 TWO-COLUMN LAYOUT) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT COLUMN: ~70% WIDTH INTERACTIVE TACTICAL MAP */}
        <div className="w-full lg:w-[70%] h-full relative">
          <TacticalMapRedesigned
            vessels={vessels}
            tracks={tracks}
            detections={detections}
            zones={zones}
            alerts={alerts}
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            layers={layers}
            onUpdateLayers={onUpdateLayers}
            activeQuickFilter={activeFilter}
            onQuickFilterChange={(f) => setActiveFilter(f)}
            onInvestigateTarget={(id) => onInvestigateAlert(id)}
            onOpenBriefing={onOpenBriefing}
          />
        </div>

        {/* RIGHT COLUMN: ~30% WIDTH PRIORITY ALERT PANEL */}
        <div className="hidden lg:flex lg:w-[30%] bg-[#080d1a] border-l border-white/[0.08] flex-col h-full z-20 shadow-xl overflow-hidden">
          {/* Panel Header */}
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0a1020]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-slate-100 text-xs uppercase tracking-wider">
                Priority Alerts Requiring Attention
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {priorityAlerts.length} Active
            </span>
          </div>

          {/* Alert Cards List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
            {priorityAlerts.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2 opacity-80" />
                <span>No high priority alerts matching this filter.</span>
              </div>
            ) : (
              priorityAlerts.map((alert) => {
                const isSelected =
                  selectedTargetId === alert.id || selectedTargetId === alert.vessel_id;

                return (
                  <div
                    key={alert.id}
                    onClick={() => onSelectTarget(alert.vessel_id || alert.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-[#0a1022] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#0c1428]'
                    }`}
                  >
                    {/* Top Row: Severity & Target Name */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                          alert.threat_level === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : alert.threat_level === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {alert.threat_level}
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-200 truncate ml-2">
                        {alert.vessel_name}
                      </span>
                    </div>

                    {/* Alert Type */}
                    <h3 className="text-xs font-semibold text-slate-100 leading-snug">
                      {alert.findings[0]?.rule_name || alert.primary_rule}
                    </h3>

                    {/* Concise Plain-English Operational Reason */}
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans line-clamp-2">
                      {alert.findings[0]?.description ||
                        'Uncorrelated maritime anomaly detected requiring analyst evaluation.'}
                    </p>

                    {/* Footer: Timestamp & Investigate Action */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[10px] font-mono text-slate-500">
                      <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInvestigateAlert(alert.id);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors font-sans shadow-sm"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Investigate</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Link to All Investigations (Screen 2) */}
          <div className="p-3 border-t border-white/[0.08] bg-[#0a1020]">
            <button
              onClick={onNavigateToInvestigations}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-white/[0.08]"
            >
              <span>View All Investigations ({alerts.length})</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
