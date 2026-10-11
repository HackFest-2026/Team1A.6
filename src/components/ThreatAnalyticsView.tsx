import React, { useState } from 'react';
import {
  BarChart3,
  ShieldAlert,
  Ship,
  Satellite,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Info,
  Radio,
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  RotateCw,
} from 'lucide-react';
import { MaritimeOperationalState } from '../domain/models.ts';
import { ModelEvaluationView } from './ModelEvaluationView.tsx';

interface ThreatAnalyticsViewProps {
  state: MaritimeOperationalState | null;
  onGenerateBriefing?: () => Promise<string>;
}

export const ThreatAnalyticsView: React.FC<ThreatAnalyticsViewProps> = ({
  state,
  onGenerateBriefing,
}) => {
  const [activeTab, setActiveTab] = useState<'trends' | 'sitrep' | 'benchmark'>('trends');
  const [briefingText, setBriefingText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!state) return null;

  const alerts = state.alerts;
  const vessels = state.vessels;
  const detections = state.detections;
  const tracks = state.tracks;

  // Severity Distribution
  const criticalCount = alerts.filter((a) => a.threat_level === 'CRITICAL').length;
  const highCount = alerts.filter((a) => a.threat_level === 'HIGH').length;
  const medCount = alerts.filter((a) => a.threat_level === 'MEDIUM').length;
  const lowCount = alerts.filter((a) => a.threat_level === 'LOW').length;

  // Rule Type Counts
  const ruleCounts: Record<string, number> = {};
  alerts.forEach((a) => {
    a.findings.forEach((f) => {
      ruleCounts[f.rule_name] = (ruleCounts[f.rule_name] || 0) + 1;
    });
  });

  // Review Status Counts
  const statusCounts: Record<string, number> = {
    NEW: alerts.filter((a) => a.status === 'NEW').length,
    CONFIRMED: alerts.filter((a) => a.status === 'CONFIRMED').length,
    ESCALATED: alerts.filter((a) => a.status === 'ESCALATED').length,
    DISMISSED: alerts.filter((a) => a.status === 'DISMISSED').length,
  };

  // Vessel Type Breakdown
  const vesselTypeCounts: Record<string, number> = {};
  vessels.forEach((v) => {
    const t = v.vessel_type || 'unknown';
    vesselTypeCounts[t] = (vesselTypeCounts[t] || 0) + 1;
  });

  // Matching Outcomes
  const matchedDetections = detections.filter((d) => !d.is_dark_vessel).length;
  const unmatchedDarkDetections = detections.filter((d) => d.is_dark_vessel).length;

  const handleGenerateSitrep = async () => {
    if (!onGenerateBriefing) return;
    setIsGenerating(true);
    try {
      const text = await onGenerateBriefing();
      setBriefingText(text);
    } catch (err) {
      console.error('Failed to generate briefing:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(briefingText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([briefingText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naval_threat_sitrep_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#050914] p-6 space-y-6 select-none font-sans custom-scrollbar">
      {/* Title & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
              Tactical Intelligence &amp; Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical telemetry aggregation, anomaly distributions, and model performance across the Arabian Sea sector
          </p>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/[0.08] text-xs font-medium">
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'trends'
                ? 'bg-indigo-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Operational Trends
          </button>
          <button
            onClick={() => setActiveTab('sitrep')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'sitrep'
                ? 'bg-indigo-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>AI SitRep Briefing</span>
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'benchmark'
                ? 'bg-indigo-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Model Benchmark (xView3)
          </button>
        </div>
      </div>

      {/* TAB 1: OPERATIONAL TRENDS */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {/* Methodology & Limitations Disclosure */}
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3 text-xs text-slate-300">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-cyan-300">Data Source Fidelity &amp; Limitations:</strong> All analytics shown below are computed directly from the current operational session state. Vessel tracks derive from terrestrial AIS and S-AIS replay pings. Satellite detections derive from Copernicus Sentinel-1 Synthetic Aperture Radar acquisitions. Sensor coverage is limited by satellite orbital revisit intervals (~12–36 hours) and AIS receiver line-of-sight.
            </p>
          </div>

          {/* Top 4 Real Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0c1222] border border-white/[0.07] space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Fused Threat Alerts
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
                  {alerts.length}
                </span>
                <span className="text-xs text-slate-500 font-mono">Dossiers</span>
              </div>
              <span className="text-[11px] text-slate-400 block pt-1 border-t border-white/[0.04]">
                Across {vessels.length} tracked surface hulls
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1222] border border-white/[0.07] space-y-1">
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">
                Critical Alerts
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
                  {criticalCount}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({((criticalCount / (alerts.length || 1)) * 100).toFixed(0)}%)
                </span>
              </div>
              <span className="text-[11px] text-rose-300/80 block pt-1 border-t border-white/[0.04]">
                Require immediate interdiction
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1222] border border-white/[0.07] space-y-1">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                Dark Vessel Candidates
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                  {unmatchedDarkDetections}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  / {detections.length} SAR
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block pt-1 border-t border-white/[0.04]">
                Uncorrelated radar returns
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1222] border border-white/[0.07] space-y-1">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                SAR Correlation Ratio
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                  {((matchedDetections / (detections.length || 1)) * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-slate-500 font-mono">Cooperative</span>
              </div>
              <span className="text-[11px] text-slate-400 block pt-1 border-t border-white/[0.04]">
                {matchedDetections} radar contacts matched to AIS
              </span>
            </div>
          </div>

          {/* Grid of Analytical Distributions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Alerts by Severity */}
            <div className="p-5 rounded-xl bg-[#0b101f] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Alerts by Threat Severity
                </h3>
                <span className="text-xs font-mono text-slate-400">Total: {alerts.length}</span>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'CRITICAL', count: criticalCount, color: 'bg-rose-500', text: 'text-rose-400' },
                  { label: 'HIGH', count: highCount, color: 'bg-amber-500', text: 'text-amber-400' },
                  { label: 'MEDIUM', count: medCount, color: 'bg-cyan-500', text: 'text-cyan-400' },
                  { label: 'LOW', count: lowCount, color: 'bg-slate-500', text: 'text-slate-400' },
                ].map((sev) => {
                  const pct = alerts.length ? (sev.count / alerts.length) * 100 : 0;
                  return (
                    <div key={sev.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className={`font-semibold ${sev.text}`}>{sev.label}</span>
                        <span className="text-slate-300">
                          {sev.count} alerts ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className={`h-full ${sev.color} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400 pt-2 border-t border-white/[0.05]">
                Definition: Threat level is mapped from composite heuristic threat score: Critical (≥ 75), High (40–74), Medium (20–39), Low (&lt; 20).
              </p>
            </div>

            {/* 2. Alerts by Detection Rule Type */}
            <div className="p-5 rounded-xl bg-[#0b101f] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  Alerts by Triggered Rule Type
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {Object.keys(ruleCounts).length} Rules
                </span>
              </div>

              <div className="space-y-2.5">
                {Object.entries(ruleCounts).map(([ruleName, count]) => {
                  const totalFindings = alerts.reduce((acc, a) => acc + a.findings.length, 0);
                  const pct = totalFindings ? (count / totalFindings) * 100 : 0;

                  return (
                    <div key={ruleName} className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-300 font-medium truncate max-w-[70%]">
                          {ruleName}
                        </span>
                        <span className="font-mono text-cyan-300 font-bold">{count} occurrences</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400 pt-2 border-t border-white/[0.05]">
                Multiple rules can trigger on a single vessel trajectory, contributing additive points to its dossier.
              </p>
            </div>

            {/* 3. Analyst Review Status Distribution */}
            <div className="p-5 rounded-xl bg-[#0b101f] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Analyst Adjudication Status
                </h3>
                <span className="text-xs font-mono text-slate-400">HITL State</span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-[#070c18] border border-white/[0.05]">
                  <span className="text-slate-500 block text-[10px]">NEW / UNREVIEWED</span>
                  <span className="text-lg font-bold text-cyan-400 tabular-nums">
                    {statusCounts.NEW}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Pending analyst review</span>
                </div>
                <div className="p-3 rounded-lg bg-[#070c18] border border-white/[0.05]">
                  <span className="text-emerald-500 block text-[10px]">CONFIRMED THREATS</span>
                  <span className="text-lg font-bold text-emerald-400 tabular-nums">
                    {statusCounts.CONFIRMED}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Verified by commander</span>
                </div>
                <div className="p-3 rounded-lg bg-[#070c18] border border-white/[0.05]">
                  <span className="text-rose-500 block text-[10px]">ESCALATED TO PATROL</span>
                  <span className="text-lg font-bold text-rose-400 tabular-nums">
                    {statusCounts.ESCALATED}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Tasked intercept assets</span>
                </div>
                <div className="p-3 rounded-lg bg-[#070c18] border border-white/[0.05]">
                  <span className="text-slate-500 block text-[10px]">DISMISSED / CLUTTER</span>
                  <span className="text-lg font-bold text-slate-400 tabular-nums">
                    {statusCounts.DISMISSED}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Resolved / false alarm</span>
                </div>
              </div>
            </div>

            {/* 4. Tracked Vessel Categories & Flags */}
            <div className="p-5 rounded-xl bg-[#0b101f] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Ship className="w-4 h-4 text-indigo-400" />
                  Surface Fleet Categories
                </h3>
                <span className="text-xs font-mono text-slate-400">{vessels.length} Vessels</span>
              </div>

              <div className="space-y-2 text-xs">
                {Object.entries(vesselTypeCounts).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-2 rounded bg-[#070c18] border border-white/[0.04]">
                    <span className="text-slate-300 capitalize font-medium">{type}</span>
                    <span className="font-mono text-slate-100 font-bold">{count} vessels</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/[0.05] text-[11px] text-slate-400">
                Registered Flags: {Array.from(new Set(vessels.map((v) => v.flag_country))).join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI SITUATION REPORT BRIEFING */}
      {activeTab === 'sitrep' && (
        <div className="p-6 rounded-2xl bg-[#090e1c] border border-white/[0.08] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                AI Executive Situation Report (SITREP)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Generates a formal military-grade situation report grounded exclusively in active telemetry, satellite detections, and intelligence findings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateSitrep}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 shadow"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Synthesizing...' : briefingText ? 'Regenerate SITREP' : 'Generate SITREP'}</span>
              </button>

              {briefingText && (
                <>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 transition-colors"
                    title="Copy to clipboard"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 transition-colors"
                    title="Download markdown report"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Briefing Output Display */}
          {briefingText ? (
            <div className="p-5 rounded-xl bg-[#050914] border border-white/[0.06] text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar">
              {briefingText}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <FileText className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
              <p className="text-xs">
                Click <strong>"Generate SITREP"</strong> to synthesize an intelligence report using Google Gemini multimodal reasoning over the current maritime sector.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MODEL BENCHMARK EVALUATION */}
      {activeTab === 'benchmark' && (
        <div className="p-6 rounded-2xl bg-[#090e1c] border border-white/[0.08]">
          <ModelEvaluationView isStandalone={true} />
        </div>
      )}
    </div>
  );
};
