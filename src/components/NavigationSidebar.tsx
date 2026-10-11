import React, { useState } from 'react';
import {
  Compass,
  ShieldAlert,
  BarChart3,
  FileText,
  Sparkles,
  Sliders,
  Play,
  Layers,
  ChevronRight,
  ChevronLeft,
  Anchor,
  Wrench,
  X,
  Radio,
  Satellite,
  CheckCircle2,
  Plane,
  ShieldCheck,
  FlaskConical,
} from 'lucide-react';

export type AppViewId = 'overview' | 'investigations' | 'analytics' | 'army_uav' | 'verification' | 'scenario_lab';

interface NavigationSidebarProps {
  activeView: AppViewId;
  setActiveView: (view: AppViewId) => void;
  activeThreatCount: number;
  darkVesselCount: number;
  onOpenBriefing: () => void;
  onOpenNlQuery: () => void;
  onOpenEvaluation: () => void;
  onOpenPresentation?: () => void;
  onOpenParameters: () => void;
  isReplayVisible?: boolean;
  onToggleReplay?: () => void;
  onOpenSarInference?: () => void;
  onSyncGfw?: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activeView,
  setActiveView,
  activeThreatCount,
  darkVesselCount,
  onOpenBriefing,
  onOpenNlQuery,
  onOpenEvaluation,
  onOpenPresentation,
  onOpenParameters,
  isReplayVisible,
  onToggleReplay,
  onOpenSarInference,
  onSyncGfw,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);

  return (
    <aside
      className={`bg-[#070c18] border-r border-white/[0.08] flex flex-col justify-between py-4 h-screen select-none shrink-0 z-40 text-xs transition-all duration-200 relative ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* 1. TOP BRAND LOGO & COLLAPSE TOGGLE */}
      <div className="flex flex-col items-center px-3 gap-4">
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => setActiveView('overview')}
            className="flex items-center gap-3 text-left group"
            title="Naval Sentinel Maritime Surveillance"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)] group-hover:scale-105 transition-transform shrink-0">
              <Anchor className="w-5 h-5" />
            </div>
            {isExpanded && (
              <div className="overflow-hidden whitespace-nowrap">
                <span className="font-bold text-slate-100 text-sm tracking-wider uppercase block font-sans">
                  NAVAL SENTINEL
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  Maritime Intelligence
                </span>
              </div>
            )}
          </button>
        </div>

        <div className="w-full h-px bg-white/[0.08]" />

        {/* 2. THE THREE CORE PRIMARY DESTINATIONS */}
        <nav className="flex flex-col w-full gap-2">
          {/* 1. OVERVIEW (Monitor) */}
          <button
            id="nav-tab-overview"
            onClick={() => setActiveView('overview')}
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-all relative w-full ${
              activeView === 'overview'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="Overview (Monitor Maritime Situation)"
          >
            <Compass className="w-4 h-4 shrink-0" />
            {isExpanded && (
              <span className="truncate text-xs">Overview</span>
            )}
            {activeView === 'overview' && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-cyan-400" />
            )}
          </button>

          {/* 2. INVESTIGATIONS (Investigate) */}
          <button
            id="nav-tab-investigations"
            onClick={() => setActiveView('investigations')}
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-all relative w-full ${
              activeView === 'investigations'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="Investigations (Examine Suspicious Vessels & Alerts)"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            {isExpanded && (
              <div className="flex items-center justify-between flex-1 overflow-hidden">
                <span className="truncate text-xs">Investigations</span>
                {activeThreatCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-slate-950 font-bold font-mono text-[10px]">
                    {activeThreatCount}
                  </span>
                )}
              </div>
            )}
            {!isExpanded && activeThreatCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
            {activeView === 'investigations' && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-rose-400" />
            )}
          </button>

          {/* 3. ANALYTICS (Analyse) */}
          <button
            id="nav-tab-analytics"
            onClick={() => setActiveView('analytics')}
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-all relative w-full ${
              activeView === 'analytics'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="Analytics (Trends & Model Evaluation)"
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-indigo-400" />
            {isExpanded && (
              <span className="truncate text-xs">Analytics</span>
            )}
            {activeView === 'analytics' && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-indigo-400" />
            )}
          </button>

          {/* 4. ARMY / UAV (VisDrone Reconnaissance) */}
          <button
            id="nav-tab-army-uav"
            onClick={() => setActiveView('army_uav')}
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-all relative w-full ${
              activeView === 'army_uav'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="Army / UAV Aerial Intelligence (VisDrone)"
          >
            <Plane className="w-4 h-4 shrink-0 text-amber-400" />
            {isExpanded && (
              <span className="truncate text-xs">Army / UAV</span>
            )}
            {activeView === 'army_uav' && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-amber-400" />
            )}
          </button>

          {/* 5. SYSTEM VERIFICATION (Evaluator 13-Point Audit) */}
          <button
            id="nav-tab-verification"
            onClick={() => setActiveView('verification')}
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-all relative w-full ${
              activeView === 'verification'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="System Verification & Benchmark (Evaluator Audit)"
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            {isExpanded && (
              <span className="truncate text-xs">Verification</span>
            )}
            {activeView === 'verification' && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-emerald-400" />
            )}
          </button>

          {/* 6. SCENARIO LAB (Upload & Testbenching) */}
          <button
            id="nav-tab-scenario-lab"
            onClick={() => setActiveView('scenario_lab')}
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-all relative w-full ${
              activeView === 'scenario_lab'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="Scenario Lab (Upload & Evaluation Center)"
          >
            <FlaskConical className="w-4 h-4 shrink-0 text-cyan-400" />
            {isExpanded && (
              <span className="truncate text-xs">Scenario Lab</span>
            )}
            {activeView === 'scenario_lab' && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-cyan-400" />
            )}
          </button>
        </nav>
      </div>

      {/* 3. SECONDARY TOOLS POPOVER MENU */}
      <div className="flex flex-col items-center px-3 gap-3">
        {/* Compact Tools Menu Button */}
        <div className="relative w-full">
          <button
            onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-all w-full border ${
              isToolsMenuOpen
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Secondary Tools & Configuration"
          >
            <Wrench className="w-4 h-4 shrink-0 text-cyan-400" />
            {isExpanded && <span className="truncate text-xs font-medium">Tools</span>}
          </button>

          {/* Floating Tools Popover */}
          {isToolsMenuOpen && (
            <div
              className={`absolute bottom-full mb-2 z-50 bg-[#0d1527]/98 backdrop-blur-md border border-white/[0.14] rounded-2xl shadow-2xl p-2 text-xs space-y-1 ${
                isExpanded ? 'left-0 w-56' : 'left-full ml-3 w-60'
              }`}
            >
              <div className="px-3 py-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-white/[0.06] flex items-center justify-between">
                <span>Secondary Tools</span>
                <button
                  onClick={() => setIsToolsMenuOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={() => {
                  onOpenBriefing();
                  setIsToolsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/[0.06] transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="block font-medium">AI Situation Report</span>
                  <span className="text-[10px] text-slate-400">Generate executive SITREP</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onOpenNlQuery();
                  setIsToolsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/[0.06] transition-colors text-left"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="block font-medium">Natural-Language Query</span>
                  <span className="text-[10px] text-slate-400">Ask Gemini about the picture</span>
                </div>
              </button>

              {onToggleReplay && (
                <button
                  onClick={() => {
                    onToggleReplay();
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/[0.06] transition-colors text-left"
                >
                  <Play className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="block font-medium">Scenario Replay</span>
                    <span className="text-[10px] text-slate-400">
                      {isReplayVisible ? 'Hide timeline scrubber' : 'Show timeline scrubber'}
                    </span>
                  </div>
                </button>
              )}

              <button
                onClick={() => {
                  onOpenParameters();
                  setIsToolsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/[0.06] transition-colors text-left"
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="block font-medium">Detection Parameters</span>
                  <span className="text-[10px] text-slate-400">Review analytic thresholds</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onOpenEvaluation();
                  setIsToolsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/[0.06] transition-colors text-left"
              >
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="block font-medium">Model Evaluation</span>
                  <span className="text-[10px] text-slate-400">xView3 SAR benchmark stats</span>
                </div>
              </button>

              {onOpenSarInference && (
                <button
                  onClick={() => {
                    onOpenSarInference();
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/[0.06] transition-colors text-left"
                >
                  <Satellite className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="block font-medium">SAR Model Inference</span>
                    <span className="text-[10px] text-cyan-300 font-mono">traced_ensemble.jit</span>
                  </div>
                </button>
              )}

              {onSyncGfw && (
                <button
                  onClick={() => {
                    onSyncGfw();
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-white/[0.06] transition-colors text-left"
                >
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="block font-medium">Global Fishing Watch</span>
                    <span className="text-[10px] text-slate-400">Fetch real-world AIS events</span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Expand / Collapse Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors w-full border border-transparent hover:border-white/[0.06]"
          title={isExpanded ? 'Collapse Navigation' : 'Expand Navigation'}
        >
          {isExpanded ? (
            <div className="flex items-center gap-2 text-xs">
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </div>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
};
