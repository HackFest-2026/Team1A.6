import React from 'react';
import {
  Compass,
  Radio,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { DashboardView } from './ProfessionalSidebar.tsx';
import { MaritimeOperationalState } from '../domain/models.ts';

interface HeaderBarProps {
  activeView: DashboardView;
  state: MaritimeOperationalState | null;
  currentTimeStr: string;
  isLive: boolean;
  onToggleLayerMenu: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeView,
  state,
  currentTimeStr,
  isLive,
  onToggleLayerMenu,
}) => {
  const getViewTitle = () => {
    switch (activeView) {
      case 'cop':
      case 'map' as any:
        return 'Module 5 — Common Operating Picture (COP)';
      case 'imagery':
        return 'Module 1 — Satellite & Drone Image Analysis';
      case 'tracking':
      case 'vessels' as any:
        return 'Module 2 — Vessel Tracking & Geospatial Mapping';
      case 'fusion':
        return 'Module 3 — Multimodal Data Fusion & Conflicts';
      case 'anomalies':
      case 'alerts' as any:
        return 'Module 4 — Anomaly Detection & Threat Prioritization';
      case 'detections':
        return 'AI2 Skylight xView3 SAR Studio';
      case 'zones':
        return 'Geospatial Boundaries & Exclusion Zones';
      case 'analytics':
        return 'Operational Threat Analytics & KPIs';
      default:
        return 'Maritime Situational Awareness';
    }
  };

  return (
    <header className="h-14 bg-[#090d16] border-b border-white/[0.08] flex items-center justify-between px-6 z-30 select-none">
      {/* Breadcrumb path */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-slate-500 uppercase">Operations</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-slate-200 font-semibold">{getViewTitle()}</span>
      </div>

      {/* Center / Right status */}
      <div className="flex items-center gap-4 text-xs font-mono">
        {/* Real-time Telemetry Line */}
        <div className="hidden md:flex items-center gap-2 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-200 font-semibold tabular-nums">{currentTimeStr}</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-white/[0.08]">
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-[11px] uppercase tracking-wider text-slate-300">
            {isLive ? 'LIVE FEED' : 'REPLAY'}
          </span>
        </div>

        {/* Layer Controls button in map view */}
        {(activeView === 'cop' || (activeView as any) === 'map') && (
          <button
            onClick={onToggleLayerMenu}
            className="flex items-center gap-1.5 px-2.5 py-1 text-slate-300 hover:text-white bg-[#0f172a] hover:bg-[#1e293b] border border-white/[0.08] rounded-md transition-colors text-xs"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Map Layers</span>
          </button>
        )}
      </div>
    </header>
  );
};
