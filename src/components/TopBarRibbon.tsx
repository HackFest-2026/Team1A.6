import React from 'react';
import {
  Compass,
  FileText,
  Sparkles,
  BarChart3,
  Layers,
  Play,
  Search,
} from 'lucide-react';
import { MaritimeOperationalState } from '../domain/models.ts';

interface TopBarRibbonProps {
  state: MaritimeOperationalState | null;
  currentTimeStr: string;
  isLive: boolean;
  onOpenBriefing: () => void;
  onOpenNlQuery: () => void;
  onOpenEvaluation: () => void;
  onOpenPresentation: () => void;
  onToggleLayerMenu: () => void;
  activeView: 'map' | 'analytics';
  setActiveView: (view: 'map' | 'analytics') => void;
}

export const TopBarRibbon: React.FC<TopBarRibbonProps> = ({
  state,
  currentTimeStr,
  isLive,
  onOpenBriefing,
  onOpenNlQuery,
  onOpenEvaluation,
  onOpenPresentation,
  onToggleLayerMenu,
  activeView,
  setActiveView,
}) => {
  const kpis = state?.kpis;

  return (
    <header className="h-13 bg-[#080c16]/95 backdrop-blur-md border-b border-white/[0.07] flex items-center justify-between px-4 z-40 select-none">
      {/* Zone 1: Clean Brand Wordmark */}
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)] group-hover:border-cyan-400 transition-colors">
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-wider text-slate-100 font-['Chakra_Petch'] uppercase">
              NAVAL SENTINEL
            </span>
            <span className="text-[11px] font-mono text-slate-500 tracking-tight hidden sm:inline">
              WESTERN MARITIME COMMAND
            </span>
          </div>
        </a>

        {/* Quiet Live/Replay Status */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/[0.08] text-xs font-mono text-slate-400">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-[11px] uppercase tracking-wider text-slate-400">
            {isLive ? 'LIVE RADAR FEED' : 'REPLAY'}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-[11px] text-slate-300 tabular-nums">{currentTimeStr}</span>
        </div>
      </div>

      {/* Zone 2: Unboxed Clean Key Metrics */}
      <div className="hidden xl:flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span className="font-bold tabular-nums">{kpis?.active_threats ?? 0}</span>
          <span className="text-slate-400 text-[11px]">Active Threats</span>
        </div>
        <span className="text-slate-700">·</span>
        <div className="flex items-center gap-1.5 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="font-bold tabular-nums">{kpis?.dark_vessels_detected ?? 0}</span>
          <span className="text-slate-400 text-[11px]">Dark Vessels</span>
        </div>
        <span className="text-slate-700">·</span>
        <div className="flex items-center gap-1.5 text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          <span className="font-bold tabular-nums">{kpis?.ais_tracks_active ?? 0}</span>
          <span className="text-slate-400 text-[11px]">AIS Tracks</span>
        </div>
        <span className="text-slate-700">·</span>
        <div className="text-slate-400 text-[11px]">
          Sensor Health: <span className="text-slate-200 font-semibold">{kpis?.sar_coverage_health_pct ?? 98.4}%</span>
        </div>
      </div>

      {/* Zone 3: Clean Nav Controls & Primary Actions */}
      <div className="flex items-center gap-2">
        {/* View Switcher: Clean segmented button */}
        <div className="flex bg-[#0d1322] p-0.5 rounded-md border border-white/[0.08]">
          <button
            onClick={() => setActiveView('map')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              activeView === 'map'
                ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tactical Map
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              activeView === 'analytics'
                ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* NL Query button */}
        <button
          onClick={onOpenNlQuery}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-cyan-300 bg-[#0d1322] hover:bg-[#131d33] border border-white/[0.08] rounded-md transition-colors"
          title="Search with Natural Language"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">NL Search</span>
        </button>

        {/* AI Briefing */}
        <button
          onClick={onOpenBriefing}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-indigo-300 bg-[#0d1322] hover:bg-[#131d33] border border-white/[0.08] rounded-md transition-colors"
          title="Synthesize Operational SitRep"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">SitRep</span>
        </button>

        {/* Evaluation Benchmarks */}
        <button
          onClick={onOpenEvaluation}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-400 hover:text-slate-200 bg-[#0d1322] border border-white/[0.08] rounded-md transition-colors"
          title="Model Benchmarks"
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">Benchmarks</span>
        </button>

        {/* Presentation Scenario Button */}
        <button
          onClick={onOpenPresentation}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-md font-semibold transition-colors"
          title="Guided 4-Phase Interdiction Scenario"
        >
          <Play className="w-3 h-3 fill-amber-300" />
          <span>Demo Flow</span>
        </button>

        {/* Layer Visibility */}
        <button
          onClick={onToggleLayerMenu}
          className="p-1.5 text-slate-400 hover:text-slate-200 bg-[#0d1322] hover:bg-[#131d33] border border-white/[0.08] rounded-md transition-colors"
          title="Layer visibility"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
