import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  XCircle,
  FileText,
  Compass,
} from 'lucide-react';
import { Alert, Vessel, IntelligenceReport, AlertStatus } from '../domain/models.ts';

interface AlertDetailDrawerProps {
  alert: Alert | null;
  vessel: Vessel | null;
  reports: IntelligenceReport[];
  onClose: () => void;
  onReviewDecision: (alertId: string, action: AlertStatus, note: string) => Promise<void>;
}

export const AlertDetailDrawer: React.FC<AlertDetailDrawerProps> = ({
  alert,
  vessel,
  reports,
  onClose,
  onReviewDecision,
}) => {
  const [analystNote, setAnalystNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!alert) return null;

  const handleAction = async (action: AlertStatus) => {
    setIsSubmitting(true);
    try {
      await onReviewDecision(alert.id, action, analystNote);
      setAnalystNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCritical = alert.threat_level === 'CRITICAL';
  const isHigh = alert.threat_level === 'HIGH';

  return (
    <aside className="w-96 bg-[#080c16]/98 border-l border-white/[0.07] flex flex-col h-[calc(100vh-3.25rem-3.75rem)] z-30 select-none shadow-2xl transition-all">
      {/* Clean Drawer Header */}
      <div className="p-4 border-b border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert
            className={`w-4 h-4 ${
              isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-cyan-400'
            }`}
          />
          <div>
            <h2 className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
              Target Dossier
            </h2>
            <span className="text-[10px] font-mono text-slate-500">
              {alert.vessel_name}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] transition-colors"
          title="Close Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar font-mono text-xs">
        {/* Target Summary */}
        <div className="space-y-2 pb-3 border-b border-white/[0.06]">
          <div className="flex items-baseline justify-between">
            <h1 className="text-sm font-bold text-slate-100 tracking-wide">
              {alert.vessel_name}
            </h1>
            <div className="text-right">
              <span
                className={`text-base font-bold tabular-nums ${
                  isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-cyan-400'
                }`}
              >
                {alert.score}
              </span>
              <span className="text-slate-500 text-[10px]"> / 100</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1">
            <p>
              MMSI: <span className="text-slate-200">{alert.mmsi}</span>
              {vessel?.imo && (
                <>
                  <span className="mx-1 text-slate-600">·</span>
                  IMO: <span className="text-slate-200">{vessel.imo}</span>
                </>
              )}
              {vessel?.flag_country && (
                <>
                  <span className="mx-1 text-slate-600">·</span>
                  Flag: <span className="text-slate-200">{vessel.flag_country}</span>
                </>
              )}
            </p>
            <p>
              Position: <span className="text-slate-200">{alert.location.lat.toFixed(4)}°N, {alert.location.lon.toFixed(4)}°E</span>
            </p>
            <p>
              Status: <span className="text-cyan-300 uppercase">{alert.status}</span>
              <span className="mx-1 text-slate-600">·</span>
              Confidence: <span className="text-emerald-400">{alert.confidence_rating}</span>
            </p>
          </div>

          {vessel?.is_sanctioned && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300 text-[11px]">
              <strong className="block font-semibold">Sanctioned Entity Match</strong>
              <p className="text-rose-200/80 text-[10px] mt-0.5">{vessel.sanction_details}</p>
            </div>
          )}
        </div>

        {/* Explainability: Contributing Findings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Attribution &amp; Rules
            </span>
            <span>{alert.findings.length} findings</span>
          </div>

          <div className="space-y-2">
            {alert.findings.map((f, i) => (
              <div
                key={i}
                className="p-2.5 bg-[#0d1322] border border-white/[0.06] rounded space-y-1.5"
              >
                <div className="flex justify-between items-start text-xs">
                  <span className="font-semibold text-slate-200">{f.rule_name}</span>
                  <span className="text-rose-400 font-bold tabular-nums">+{f.score_contribution} pts</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  {f.description}
                </p>

                {/* Evidence items if any */}
                {f.evidence && f.evidence.length > 0 && (
                  <div className="pt-1.5 border-t border-white/[0.04] text-[10px] text-slate-400 space-y-1">
                    {f.evidence.map((ev) => (
                      <div key={ev.id}>
                        <span className="text-cyan-400 font-semibold">{ev.title}</span>
                        <p className="text-slate-400 font-sans">{ev.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Correlated Intelligence Reports */}
        {reports.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Intelligence Advisories
            </span>
            <div className="space-y-1.5">
              {reports.slice(0, 1).map((rep) => (
                <div
                  key={rep.id}
                  className="p-2 bg-[#0d1322] border border-white/[0.05] rounded text-[11px] space-y-1"
                >
                  <div className="flex justify-between text-indigo-300 font-semibold text-[10px]">
                    <span>{rep.source.toUpperCase()}</span>
                    <span className="text-slate-500">{rep.timestamp.slice(0, 10)}</span>
                  </div>
                  <h4 className="text-slate-200 font-semibold">{rep.title}</h4>
                  <p className="text-slate-400 font-sans leading-tight text-[10px]">{rep.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Human in the loop Actions */}
        <div className="p-3 bg-[#0d1322] border border-white/[0.07] rounded space-y-2.5">
          <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider block">
            Analyst Action
          </span>

          <textarea
            value={analystNote}
            onChange={(e) => setAnalystNote(e.target.value)}
            placeholder="Add operational review note..."
            rows={2}
            className="w-full bg-[#080c16] border border-white/[0.08] text-xs text-slate-200 p-2 rounded focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 resize-none"
          />

          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              onClick={() => handleAction('CONFIRMED')}
              disabled={isSubmitting}
              className="py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirm
            </button>
            <button
              onClick={() => handleAction('ESCALATED')}
              disabled={isSubmitting}
              className="py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Escalate
            </button>
            <button
              onClick={() => handleAction('DISMISSED')}
              disabled={isSubmitting}
              className="py-1.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-700 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              Dismiss
            </button>
          </div>

          {/* Audit trail summary */}
          {alert.review_history && alert.review_history.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06] text-[10px] text-slate-400 space-y-1">
              <span className="text-slate-500 block">Audit Log:</span>
              {alert.review_history.map((rev, i) => (
                <div key={i} className="flex justify-between text-slate-400">
                  <span>{rev.action} by {rev.analyst}</span>
                  <span className="text-slate-600">{new Date(rev.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
