import React from 'react';
import {
  Compass,
  ShieldAlert,
  Ship,
  Satellite,
  Layers,
  BarChart3,
  FileText,
  Sparkles,
  ShieldCheck,
  Play,
  Anchor,
  User,
  Radio,
  Eye,
  GitMerge,
} from 'lucide-react';
import { ThreatLevel } from '../domain/models.ts';

export type DashboardView =
  | 'cop'
  | 'imagery'
  | 'tracking'
  | 'fusion'
  | 'anomalies'
  | 'detections'
  | 'zones'
  | 'analytics';

interface ProfessionalSidebarProps {
  activeView: DashboardView;
  setActiveView: (view: DashboardView) => void;
  activeThreatCount: number;
  darkVesselCount: number;
  onOpenBriefing: () => void;
  onOpenNlQuery: () => void;
  onOpenEvaluation: () => void;
  onOpenPresentation: () => void;
}

export const ProfessionalSidebar: React.FC<ProfessionalSidebarProps> = ({
  activeView,
  setActiveView,
  activeThreatCount,
  darkVesselCount,
  onOpenBriefing,
  onOpenNlQuery,
  onOpenEvaluation,
  onOpenPresentation,
}) => {
  const mainNavItems = [
    {
      id: 'cop' as DashboardView,
      moduleNumber: 'MOD 5',
      label: 'Common Operating Picture',
      icon: Compass,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'imagery' as DashboardView,
      moduleNumber: 'MOD 1',
      label: 'Imagery Analysis',
      icon: Eye,
      badge: 'Drone & SAR',
      badgeColor: 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30',
    },
    {
      id: 'tracking' as DashboardView,
      moduleNumber: 'MOD 2',
      label: 'Vessel Tracking (CSV)',
      icon: Ship,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'fusion' as DashboardView,
      moduleNumber: 'MOD 3',
      label: 'Multimodal Data Fusion',
      icon: GitMerge,
      badge: 'Fused',
      badgeColor: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30',
    },
    {
      id: 'anomalies' as DashboardView,
      moduleNumber: 'MOD 4',
      label: 'Anomaly Detection & Alerts',
      icon: ShieldAlert,
      badge: activeThreatCount > 0 ? activeThreatCount : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    },
    {
      id: 'detections' as DashboardView,
      moduleNumber: 'AI2',
      label: 'xView3 SAR Studio',
      icon: Satellite,
      badge: darkVesselCount > 0 ? `${darkVesselCount} Dark` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    {
      id: 'analytics' as DashboardView,
      moduleNumber: 'KPI',
      label: 'Operational Analytics',
      icon: BarChart3,
      badge: null,
      badgeColor: '',
    },
  ];

  return (
    <aside className="w-60 bg-[#090d16] border-r border-white/[0.08] flex flex-col h-screen select-none shrink-0 z-40">
      {/* 1. Brand Workspace Header */}
      <div className="h-14 px-4 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <Anchor className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wider text-slate-100 font-['Chakra_Petch'] uppercase">
              NAVAL SENTINEL
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              WESTERN DEFENSE C2
            </span>
          </div>
        </div>
      </div>

      {/* 2. Workspace Sector Selector */}
      <div className="px-3 py-2.5 border-b border-white/[0.06]">
        <div className="p-2 rounded bg-white/[0.02] border border-white/[0.06] text-xs font-mono flex items-center justify-between">
          <div>
            <span className="text-[9px] text-slate-500 uppercase block tracking-wider">
              OPERATIONAL SECTOR
            </span>
            <span className="text-slate-200 font-semibold text-[11px]">
              Arabian Sea / Kutch
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Feed active" />
        </div>
      </div>

      {/* 3. Main Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 custom-scrollbar font-mono text-xs">
        <div className="px-2 pb-1.5 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
          SURVEILLANCE &amp; OPS
        </div>

        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium text-xs transition-colors ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1">
                {item.moduleNumber && (
                  <span className="text-[8px] px-1 py-0.2 rounded bg-white/[0.04] text-slate-500 font-bold">
                    {item.moduleNumber}
                  </span>
                )}
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold tabular-nums ${
                      item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Intelligence & Actions Section */}
        <div className="pt-4 px-2 pb-1.5 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
          TACTICAL INTELLIGENCE
        </div>

        <button
          onClick={onOpenBriefing}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-white/[0.04] transition-colors"
        >
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>AI SitRep Briefing</span>
        </button>

        <button
          onClick={onOpenNlQuery}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>NL Command Query</span>
        </button>

        <button
          onClick={onOpenEvaluation}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-slate-400 hover:text-emerald-300 hover:bg-white/[0.04] transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Model Benchmarks</span>
        </button>

        <button
          onClick={onOpenPresentation}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-amber-300 hover:bg-amber-500/10 transition-colors font-semibold"
        >
          <Play className="w-4 h-4 text-amber-400 fill-amber-400/20" />
          <span>Demo Scenario</span>
        </button>
      </div>

      {/* 4. Bottom User / Watch Desk Footer */}
      <div className="p-3 border-t border-white/[0.08] bg-[#070a12] text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-slate-200 font-semibold text-[11px] truncate">
              Lt. Cdr. Sharma
            </span>
            <span className="text-slate-500 text-[10px] truncate">
              Watch Officer (Ops Desk)
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
