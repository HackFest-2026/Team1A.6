import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertOctagon,
  XCircle,
  Eye,
  Satellite,
  Compass,
} from 'lucide-react';
import { Alert, ThreatLevel, AlertStatus } from '../domain/models.ts';

interface ThreatQueueViewProps {
  alerts: Alert[];
  onSelectAlert: (alertId: string) => void;
  onReviewDecision: (alertId: string, action: AlertStatus, note: string) => Promise<void>;
}

export const ThreatQueueView: React.FC<ThreatQueueViewProps> = ({
  alerts,
  onSelectAlert,
  onReviewDecision,
}) => {
  const [filterLevel, setFilterLevel] = useState<ThreatLevel | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = alerts.filter((a) => {
    if (filterLevel !== 'ALL' && a.threat_level !== filterLevel) return false;
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !a.vessel_name.toLowerCase().includes(q) &&
        !a.mmsi.toLowerCase().includes(q) &&
        !a.primary_rule.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] overflow-y-auto bg-[#050811] p-6 space-y-6 font-mono select-none custom-scrollbar">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2 font-['Chakra_Petch']">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            MODULE 4 — ANOMALY DETECTION &amp; ALERT PRIORITIZATION
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Identify unusual maritime patterns (dark vessels, transponder gaps, spoofing, STS rendezvous, zone intrusions), evaluate transparent explainable evidence, and record analyst review decisions.
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vessel, MMSI, rule..."
              className="bg-[#0c1222] border border-white/[0.08] text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-md focus:outline-none focus:border-cyan-500/60 w-64"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-[#0c1222] p-0.5 rounded-md border border-white/[0.08]">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                filterLevel === lvl
                  ? lvl === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                    : lvl === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span>Status:</span>
          {(['ALL', 'NEW', 'CONFIRMED', 'ESCALATED', 'DISMISSED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2 py-0.5 rounded text-[11px] ${
                filterStatus === st
                  ? 'bg-white/10 text-white font-bold'
                  : 'hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Clean Enterprise Threat Table */}
      <div className="bg-[#090d16] border border-white/[0.08] rounded-lg overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#0c1322] text-[11px] text-slate-400">
              <th className="p-3 font-semibold">SCORE</th>
              <th className="p-3 font-semibold">TARGET VESSEL</th>
              <th className="p-3 font-semibold">PRIMARY ANOMALY</th>
              <th className="p-3 font-semibold">LOCATION</th>
              <th className="p-3 font-semibold">STATUS</th>
              <th className="p-3 font-semibold text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                  No threats matching current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((alert) => {
                const isCrit = alert.threat_level === 'CRITICAL';
                const isHigh = alert.threat_level === 'HIGH';

                return (
                  <tr
                    key={alert.id}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => onSelectAlert(alert.id)}
                  >
                    {/* Score */}
                    <td className="p-3">
                      <span
                        className={`font-mono font-bold text-sm tabular-nums ${
                          isCrit
                            ? 'text-rose-400'
                            : isHigh
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {alert.score}
                      </span>
                      <span className="text-slate-500 text-[10px]"> /100</span>
                    </td>

                    {/* Vessel */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-100">{alert.vessel_name}</div>
                      <div className="text-[10px] text-slate-400">MMSI: {alert.mmsi}</div>
                    </td>

                    {/* Primary Rule */}
                    <td className="p-3">
                      <div className="text-slate-200 flex items-center gap-1.5">
                        {alert.primary_rule.toLowerCase().includes('dark') ||
                        alert.primary_rule.toLowerCase().includes('sar') ? (
                          <Satellite className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        ) : alert.primary_rule.toLowerCase().includes('rendezvous') ? (
                          <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        <span>{alert.primary_rule}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {alert.findings[0]?.description}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="p-3 text-slate-400 text-[11px] tabular-nums">
                      {alert.location.lat.toFixed(2)}°N, {alert.location.lon.toFixed(2)}°E
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                          alert.status === 'CONFIRMED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : alert.status === 'ESCALATED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : alert.status === 'DISMISSED'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {alert.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAlert(alert.id);
                        }}
                        className="px-2.5 py-1 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
