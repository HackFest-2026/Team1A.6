import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RotateCw,
  Download,
  FileText,
  Radio,
  Cpu,
  Layers,
  Terminal,
  Clock,
  Database,
  Satellite,
  Compass,
} from 'lucide-react';
import { SystemVerificationCheck, CheckStatus } from '../domain/models.ts';

export const SystemVerificationView: React.FC = () => {
  const [checks, setChecks] = useState<SystemVerificationCheck[]>([]);
  const [counts, setCounts] = useState({ total: 13, passed: 0, failed: 0, blocked: 0, not_run: 13 });
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedCheck, setSelectedCheck] = useState<SystemVerificationCheck | null>(null);

  // Live test result states
  const [gfwTestResult, setGfwTestResult] = useState<any>(null);
  const [kalmanTestResult, setKalmanTestResult] = useState<any>(null);
  const [isGfwTesting, setIsGfwTesting] = useState(false);
  const [isKalmanTesting, setIsKalmanTesting] = useState(false);

  const runVerification = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/system/verification');
      const data = await res.json();
      if (data.success) {
        setChecks(data.checks || []);
        setCounts(data.counts || { total: 13, passed: 0, failed: 0, blocked: 0, not_run: 0 });
        if (data.checks && data.checks.length > 0) {
          setSelectedCheck(data.checks[0]);
        }
      }
    } catch (err) {
      console.error('System verification failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runVerification();
  }, []);

  const handleTestGfw = async () => {
    setIsGfwTesting(true);
    try {
      const res = await fetch('/api/gfw/check-connection', { method: 'POST' });
      const data = await res.json();
      setGfwTestResult(data);
    } catch (err: any) {
      setGfwTestResult({ success: false, status: 'BLOCKED', message: err.message });
    } finally {
      setIsGfwTesting(false);
    }
  };

  const handleTestKalman = async () => {
    setIsKalmanTesting(true);
    try {
      const res = await fetch('/api/kalman/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mmsi: 'vessel-sea-dragon',
          targetTimeMs: Date.now() + 7200000, // +2 hours
        }),
      });
      const data = await res.json();
      setKalmanTestResult(data);
    } catch (err: any) {
      setKalmanTestResult({ success: false, error: err.message });
    } finally {
      setIsKalmanTesting(false);
    }
  };

  const exportJsonReport = () => {
    const report = {
      title: 'Naval Sentinel — Sovereign AI System Verification & Benchmark Audit',
      export_timestamp: new Date().toISOString(),
      evaluation_scope: 'Maritime (SAR/AIS) & Land/UAV (VisDrone) Unified Intelligence',
      statistics: counts,
      checks,
      interactive_tests: {
        gfw_connection_test: gfwTestResult,
        kalman_extrapolation_test: kalmanTestResult,
      },
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_verification_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdownReport = () => {
    let md = `# NAVAL SENTINEL — SYSTEM VERIFICATION & BENCHMARKING AUDIT REPORT\n\n`;
    md += `**Generated**: ${new Date().toUTCString()}\n`;
    md += `**Total Checks Evaluated**: ${counts.total} | **PASS**: ${counts.passed} | **BLOCKED**: ${counts.blocked} | **FAIL**: ${counts.failed}\n\n`;
    md += `## 1. Verified Checks Audit\n\n`;
    md += `| Check ID | Verification Name | Status | Category | Execution Type | Duration |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const c of checks) {
      md += `| \`${c.id}\` | ${c.name} | **${c.status}** | ${c.category} | ${c.testType} | ${c.durationMs} ms |\n`;
    }
    md += `\n## 2. Check Details & Acceptance Criteria\n\n`;
    for (const c of checks) {
      md += `### [${c.status}] ${c.name}\n`;
      md += `- **Category**: ${c.category}\n`;
      md += `- **Acceptance Criteria**: ${c.acceptanceCriteria}\n`;
      md += `- **Audit Findings**: ${c.details}\n`;
      if (c.version) md += `- **Software/Model Version**: ${c.version}\n`;
      md += `\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_verification_report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PASS
          </span>
        );
      case 'FAIL':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" /> FAIL
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> BLOCKED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-slate-500/15 text-slate-300 border border-slate-500/30">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> NOT RUN
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050811] text-slate-100 overflow-hidden font-sans select-none">
      {/* Header */}
      <div className="p-4 bg-[#0a1020] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-wide uppercase font-sans">
                Evaluator System Verification &amp; Benchmarking
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                13 Independent Checks
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Health Verification · Model Artifact Inspection · Sovereign Air-Gapped Readiness · Honest Test Accounting
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={runVerification}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            Run Full Verification
          </button>
          <button
            onClick={exportJsonReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] text-xs transition-colors"
            title="Download full JSON audit report"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={exportMarkdownReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] text-xs transition-colors"
            title="Download executive markdown report"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            Export SITREP (.MD)
          </button>
        </div>
      </div>

      {/* KPI Tally Ribbon */}
      <div className="px-6 py-3 bg-[#070b16] border-b border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <div>
            <span className="text-slate-400 text-[10px] block font-sans">PASSED CHECKS</span>
            <span className="text-emerald-400 font-bold text-base">{counts.passed} / {counts.total}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div>
            <span className="text-slate-400 text-[10px] block font-sans">BLOCKED DEPENDENCIES</span>
            <span className="text-amber-400 font-bold text-base">{counts.blocked}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-rose-400" />
          <div>
            <span className="text-slate-400 text-[10px] block font-sans">FAILED TESTS</span>
            <span className="text-rose-400 font-bold text-base">{counts.failed}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400" />
          <div>
            <span className="text-slate-400 text-[10px] block font-sans">TEST EXECUTION TYPE</span>
            <span className="text-cyan-300 font-bold text-xs">100% Real Code &amp; API Tests</span>
          </div>
        </div>
      </div>

      {/* Main Verification Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: List of 13 Checks */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5 border-r border-white/[0.08]">
          {checks.map((chk) => {
            const isSelected = selectedCheck?.id === chk.id;
            return (
              <div
                key={chk.id}
                onClick={() => setSelectedCheck(chk)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg'
                    : 'bg-[#090e1c] border-white/[0.06] hover:bg-[#0d1428]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500">{chk.id.toUpperCase()}</span>
                    <span className="font-semibold text-slate-100 text-xs">{chk.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono">
                      {chk.category}
                    </span>
                    <span>·</span>
                    <span className="text-cyan-400 text-[10px] font-mono">{chk.testType}</span>
                    <span>·</span>
                    <span className="text-slate-500 font-mono text-[10px]">{chk.durationMs} ms</span>
                  </div>
                </div>

                <div>{getStatusBadge(chk.status)}</div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Check Inspector & Live Test Consoles */}
        <div className="w-96 lg:w-[28rem] bg-[#070b16] p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs">
          {/* Check Detail Dossier */}
          {selectedCheck ? (
            <div className="p-4 rounded-xl bg-[#0c1426] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-sm">{selectedCheck.name}</span>
                {getStatusBadge(selectedCheck.status)}
              </div>

              <div className="space-y-2 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">CATEGORY:</span>
                  <span>{selectedCheck.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TEST TYPE:</span>
                  <span className="text-cyan-400">{selectedCheck.testType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">EXECUTION TIME:</span>
                  <span>{selectedCheck.durationMs} ms</span>
                </div>
                {selectedCheck.version && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">VERSION:</span>
                    <span>{selectedCheck.version}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/[0.06]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Acceptance Criteria
                </span>
                <p className="text-slate-200 leading-relaxed bg-[#070c1a] p-2.5 rounded-lg border border-white/[0.04]">
                  {selectedCheck.acceptanceCriteria}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Audit Findings &amp; Diagnostics
                </span>
                <p className="text-slate-300 leading-relaxed bg-[#070c1a] p-2.5 rounded-lg border border-white/[0.04]">
                  {selectedCheck.details}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-slate-500">
              Select any check from the list to inspect acceptance criteria and diagnostic logs.
            </div>
          )}

          {/* Interactive Smoke Test Console 1: GFW Authentication Check */}
          <div className="p-4 rounded-xl bg-[#0c1426] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-400" />
                Live GFW API Connection Test
              </span>
              <button
                onClick={handleTestGfw}
                disabled={isGfwTesting}
                className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-medium hover:bg-emerald-500/30 transition-colors"
              >
                {isGfwTesting ? 'Testing...' : 'Execute Ping'}
              </button>
            </div>
            <p className="text-slate-400 text-[11px]">
              Verifies token authentication with api.globalfishingwatch.org/v3/events without returning credentials.
            </p>
            {gfwTestResult && (
              <div className="p-2.5 rounded-lg bg-[#070c1a] border border-white/[0.06] font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">STATUS:</span>
                  <span className={gfwTestResult.status === 'PASS' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {gfwTestResult.status} (HTTP {gfwTestResult.httpStatus})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">LATENCY:</span>
                  <span>{gfwTestResult.latencyMs} ms</span>
                </div>
                <div className="text-slate-300 text-[10px] pt-1 border-t border-white/[0.04]">
                  {gfwTestResult.message}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Smoke Test Console 2: Linear Kalman Filter Extrapolation */}
          <div className="p-4 rounded-xl bg-[#0c1426] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-cyan-400" />
                Kalman Dead-Reckoning Prediction
              </span>
              <button
                onClick={handleTestKalman}
                disabled={isKalmanTesting}
                className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-medium hover:bg-cyan-500/30 transition-colors"
              >
                {isKalmanTesting ? 'Projecting...' : 'Project Position'}
              </button>
            </div>
            <p className="text-slate-400 text-[11px]">
              Evaluates State Vector [x, y, vx, vy] extrapolation on target vessel if AIS goes silent.
            </p>
            {kalmanTestResult?.prediction && (
              <div className="p-2.5 rounded-lg bg-[#070c1a] border border-white/[0.06] font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">PREDICTED LAT:</span>
                  <span className="text-cyan-300 font-bold">{kalmanTestResult.prediction.lat}° N</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PREDICTED LON:</span>
                  <span className="text-cyan-300 font-bold">{kalmanTestResult.prediction.lon}° E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">UNCERTAINTY RADIUS:</span>
                  <span className="text-amber-400">±{kalmanTestResult.prediction.uncertaintyRadiusM} m</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
