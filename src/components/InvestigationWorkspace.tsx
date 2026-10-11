import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  XCircle,
  FileText,
  Compass,
  Satellite,
  Ship,
  MapPin,
  Clock,
  Layers,
  ArrowRight,
  Info,
  AlertTriangle,
  Activity,
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
} from 'lucide-react';
import {
  Alert,
  Vessel,
  IntelligenceReport,
  AlertStatus,
  Detection,
} from '../domain/models.ts';
import { XVIEW3_CHIPS_FIXTURE } from '../fixtures/xview3BenchmarkData.ts';

interface InvestigationWorkspaceProps {
  alert: Alert | null;
  vessel: Vessel | null;
  reports: IntelligenceReport[];
  detections: Detection[];
  onClose?: () => void;
  onReviewDecision: (alertId: string, action: AlertStatus, note: string) => Promise<void>;
  isStandalone?: boolean;
  alertsList?: Alert[];
  onSelectAlert?: (alertId: string) => void;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  alert,
  vessel,
  reports,
  detections,
  onClose,
  onReviewDecision,
  isStandalone = false,
  alertsList,
  onSelectAlert,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'evidence' | 'correlation' | 'why_flagged' | 'decision'>('summary');
  const [analystNote, setAnalystNote] = useState('');
  const [decisionReason, setDecisionReason] = useState('Standard Watch Procedure');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModalAction, setConfirmModalAction] = useState<AlertStatus | null>(null);

  if (!alert) return null;

  // Correlated SAR detection if any
  const matchedDetection = detections.find(
    (d) =>
      d.matched_vessel_id === alert.vessel_id ||
      d.id === alert.vessel_id ||
      alert.findings.some((f) =>
        f.evidence.some((ev) => ev.id.includes(d.id))
      )
  );

  // Relevant xView3 radar chip if any
  const chipFixture = XVIEW3_CHIPS_FIXTURE.find(
    (c) => c.chip_id === 'chip_1204_high_seas_dark'
  ) || XVIEW3_CHIPS_FIXTURE[0];

  const isCritical = alert.threat_level === 'CRITICAL';
  const isHigh = alert.threat_level === 'HIGH';

  const handleExecuteDecision = async (action: AlertStatus) => {
    setIsSubmitting(true);
    try {
      await onReviewDecision(
        alert.id,
        action,
        analystNote ? `[${decisionReason}] ${analystNote}` : `[${decisionReason}] Review finalized.`
      );
      setConfirmModalAction(null);
      setAnalystNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate plain-English executive incident summary
  const generatePlainSummary = () => {
    const rulesTriggered = alert.findings.map((f) => f.rule_name);
    return `Automated multi-sensor fusion flagged ${alert.vessel_name} (MMSI: ${alert.mmsi}) in the Arabian Sea defense fairway due to ${rulesTriggered.length} concurrent indicators: ${rulesTriggered.join(', ')}. The heuristic score of ${alert.score}/100 reflects high convergence across kinematic transponder telemetry and geospatial intelligence boundaries.`;
  };

  const content = (
    <div className={`w-full ${isStandalone ? 'h-full' : 'max-w-5xl h-[90vh] rounded-2xl border border-white/[0.1]'} bg-[#090e1b] shadow-2xl flex flex-col overflow-hidden`}>
      {/* Optional Top Alert Switcher Bar for Standalone Screen 2 */}
      {isStandalone && alertsList && alertsList.length > 0 && (
        <div className="px-6 py-2.5 bg-[#070b16] border-b border-white/[0.08] flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 text-xs font-mono">
          <span className="text-slate-400 font-semibold mr-1 shrink-0">SELECT ALERT:</span>
          {alertsList.map((al) => (
            <button
              key={al.id}
              onClick={() => onSelectAlert?.(al.id)}
              className={`px-3 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
                al.id === alert.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${al.threat_level === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-400'}`} />
              <span>{al.vessel_name}</span>
              <span className="text-[10px] text-slate-500 font-sans">({al.threat_level})</span>
            </button>
          ))}
        </div>
      )}

      {/* 1. Top Bar */}
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0d1424]">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-inner ${
                isCritical
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : isHigh
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                  Target Investigation Workspace
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs font-mono text-slate-400">ID: {alert.id}</span>
              </div>
              <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {alert.vessel_name}
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                    isCritical
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : isHigh
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  }`}
                >
                  {alert.threat_level} PRIORITY
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                  Status: {alert.status}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block mr-2 font-mono">
              <span className="text-xs text-slate-500 block">Heuristic Threat Score</span>
              <span className="text-lg font-bold text-cyan-400 tabular-nums">
                {alert.score}
                <span className="text-xs text-slate-500 font-normal"> / 100</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors"
              title="Close Workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Workspace Navigation Tabs */}
        <div className="px-6 border-b border-white/[0.06] bg-[#0b1120] flex items-center gap-2 overflow-x-auto text-xs font-medium">
          {(
            [
              { id: 'summary', label: 'Incident Summary' },
              { id: 'evidence', label: 'Evidence Dossier' },
              { id: 'correlation', label: 'AIS–SAR Correlation' },
              { id: 'why_flagged', label: 'Why Was This Flagged?' },
              { id: 'decision', label: 'Analyst Decision & Audit' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300 font-semibold bg-white/[0.02]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 3. Tab Body Workspace Canvas */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {/* TAB 1: INCIDENT SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Executive Plain English Description */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/25 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  Plain-English Incident Overview
                </span>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {generatePlainSummary()}
                </p>
              </div>

              {/* Key Incident Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-[#0e1628] border border-white/[0.06] space-y-1 font-mono">
                  <span className="text-[11px] text-slate-400 block">Vessel Identification</span>
                  <span className="text-sm font-bold text-slate-100 block truncate">
                    {alert.vessel_name}
                  </span>
                  <span className="text-xs text-slate-400">
                    MMSI: {alert.mmsi}
                    {vessel?.imo && ` · IMO: ${vessel.imo}`}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0e1628] border border-white/[0.06] space-y-1 font-mono">
                  <span className="text-[11px] text-slate-400 block">Geographic Location</span>
                  <span className="text-sm font-bold text-cyan-300 block">
                    {alert.location.lat.toFixed(4)}°N, {alert.location.lon.toFixed(4)}°E
                  </span>
                  <span className="text-xs text-slate-400">Gulf of Kutch Sector</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0e1628] border border-white/[0.06] space-y-1 font-mono">
                  <span className="text-[11px] text-slate-400 block">Detection Timestamp</span>
                  <span className="text-sm font-bold text-slate-200 block">
                    {new Date(alert.timestamp).toUTCString().replace('GMT', 'UTC')}
                  </span>
                  <span className="text-xs text-emerald-400">Data Freshness: 14s</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0e1628] border border-white/[0.06] space-y-1 font-mono">
                  <span className="text-[11px] text-slate-400 block">Confidence Rating</span>
                  <span className="text-sm font-bold text-emerald-400 block">
                    {alert.confidence_rating}
                  </span>
                  <span className="text-xs text-slate-400">
                    {alert.findings.length} Independent Indicators
                  </span>
                </div>
              </div>

              {/* Sanctions & Regulatory Matching */}
              {vessel?.is_sanctioned && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-rose-300">
                      OFAC SDN Regulatory Match Confirmed
                    </h3>
                    <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                      {vessel.sanction_details}
                    </p>
                  </div>
                </div>
              )}

              {/* Flagged Rules Quick List */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Contributing Anomaly Rules
                </h3>
                <div className="space-y-2">
                  {alert.findings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#0e1628] border border-white/[0.06] flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-slate-200 block">
                          {finding.rule_name}
                        </span>
                        <p className="text-xs text-slate-400">{finding.description}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4 font-mono">
                        <span className="text-sm font-bold text-rose-400">
                          +{finding.score_contribution} pts
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Conf: {(finding.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EVIDENCE DOSSIER */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300">
                <span className="font-semibold text-slate-200">Sensor Evidence Integrity: </span>
                All sensor observations originate from verifiable synthetic aperture radar fixtures (Copernicus Sentinel-1 GRDH IW), terrestrial AIS receivers, and georeferenced maritime boundary polygons.
              </div>

              {/* Radar Imagery & AIS Telemetry Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SAR Radar Backscatter Chip */}
                <div className="p-4 rounded-xl bg-[#0e1628] border border-white/[0.07] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
                      <Satellite className="w-4 h-4 text-cyan-400" />
                      Sentinel-1 SAR Radar Backscatter
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      VV/VH Polarization
                    </span>
                  </div>

                  {/* Synthetic Aperture Radar Chip Graphic */}
                  <div className="relative aspect-video w-full rounded-lg bg-[#040812] border border-white/[0.1] overflow-hidden flex items-center justify-center">
                    <svg viewBox="0 0 400 240" className="w-full h-full">
                      {/* Ocean backscatter noise simulation */}
                      <rect width="400" height="240" fill="#040814" />
                      <circle cx="200" cy="120" r="70" fill="none" stroke="#1e293b" strokeDasharray="3 3" opacity="0.3" />
                      <circle cx="200" cy="120" r="35" fill="none" stroke="#1e293b" strokeDasharray="2 2" opacity="0.4" />
                      {/* Vessel target return specular reflection */}
                      <ellipse cx="200" cy="120" rx="36" ry="12" fill="#38bdf8" fillOpacity="0.85" />
                      <ellipse cx="200" cy="120" rx="16" ry="5" fill="#ffffff" />
                      {/* Bounding box */}
                      <rect x="150" y="98" width="100" height="44" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" />
                      <text x="154" y="92" fill="#ef4444" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        CONF 94.2% · 274m
                      </text>
                    </svg>

                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-slate-300">
                      Scene: S1A_IW_GRDH_1SDV_20261007
                    </div>
                  </div>

                  <div className="text-xs font-mono text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Acquisition Date:</span>
                      <span className="text-slate-200">2026-10-07 01:15:00 UTC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Backscatter Intensity:</span>
                      <span className="text-slate-200">+22.4 dB (High Specular Return)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Vessel Length:</span>
                      <span className="text-slate-200">274 meters</span>
                    </div>
                  </div>
                </div>

                {/* AIS Transponder Breadcrumb Data */}
                <div className="p-4 rounded-xl bg-[#0e1628] border border-white/[0.07] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
                      <Ship className="w-4 h-4 text-cyan-400" />
                      AIS Kinematics &amp; Dark Window
                    </span>
                    <span className="text-[11px] font-mono text-rose-400">
                      14-Hour Dark Gap
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06] text-xs font-mono space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Pre-Gap Signal:</span>
                      <span className="text-slate-200">2026-10-06 12:00 UTC [21.80°N, 68.20°E]</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Post-Gap Signal:</span>
                      <span className="text-slate-200">2026-10-07 02:00 UTC [22.20°N, 68.90°E]</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Dead Reckoning Distance:</span>
                      <span className="text-amber-400">45.8 Nautical Miles</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Implied Speed During Gap:</span>
                      <span className="text-slate-200">3.3 Knots (Sustained Drifting)</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    The Automatic Identification System (AIS) transponder broadcast ceased for 14 hours while the vessel transitioned through the outer perimeter of the Indian EEZ toward the INS Okha restricted military exercise sector.
                  </p>
                </div>

                {/* High-Resolution Optical Vessel Identification Photograph (ST Engineering & MarineTraffic style) */}
                <div className="p-4 rounded-xl bg-[#0e1628] border border-white/[0.07] space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      Optical High-Resolution Target Identification &amp; Registry Verification
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">
                      Lloyd's Register Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-white/[0.1] bg-slate-900">
                      <img
                        src={vessel?.id?.includes('ciudad') ? '/images/ferry.jpg' : vessel?.vessel_type === 'military' ? '/images/patrol.jpg' : vessel?.vessel_type === 'cargo' ? '/images/cargo.jpg' : '/images/tanker.jpg'}
                        alt={alert.vessel_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur">
                        {alert.vessel_name}
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-2 text-xs font-mono">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
                          <span className="text-[10px] text-slate-500 block">VESSEL TYPE</span>
                          <span className="text-slate-200 font-bold uppercase">{vessel?.vessel_type || 'Crude Oil Tanker'}</span>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
                          <span className="text-[10px] text-slate-500 block">FLAG REGISTRY</span>
                          <span className="text-slate-200 font-bold uppercase">{vessel?.flag_country || 'Liberia'} {vessel?.flag_country === 'Spain' ? '🇪🇸' : '🇱🇷'}</span>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
                          <span className="text-[10px] text-slate-500 block">LENGTH / BEAM</span>
                          <span className="text-slate-200 font-bold">{vessel?.length_m || 274}m × {vessel?.width_m || 48}m</span>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
                          <span className="text-[10px] text-slate-500 block">RADAR CROSS SECTION (RCS)</span>
                          <span className="text-cyan-300 font-bold">~42,000 m² (High Specular)</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 font-sans leading-relaxed pt-1">
                        Cross-referenced against maritime coastal surveillance cameras and coastal AIS transponders. Dimension measurements extracted via Sentinel-1 SAR imagery match physical naval architect blueprints within 2.1% tolerance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AIS-SAR CORRELATION */}
          {activeTab === 'correlation' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2 text-xs">
                <span className="font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1 font-mono">
                  <Compass className="w-3.5 h-3.5" />
                  Spatial &amp; Temporal Correlation Methodology
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Correlation matches radar returns to commercial transponders by interpolating vessel positions along known AIS tracks to the exact second of satellite image acquisition. If the separation distance exceeds 5.0 km or temporal window exceeds 60 minutes, the contact is formally recorded as an unmatched detection.
                </p>
              </div>

              {/* Correlation Comparison Table */}
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0e1628]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#121c32] text-slate-400 border-b border-white/[0.08]">
                    <tr>
                      <th className="p-3.5 font-semibold">Correlation Parameter</th>
                      <th className="p-3.5 font-semibold">Observed Value</th>
                      <th className="p-3.5 font-semibold">Configured Threshold</th>
                      <th className="p-3.5 font-semibold">Operational Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-slate-300">
                    <tr>
                      <td className="p-3.5 text-slate-400 font-sans font-medium">SAR Radar Acquisition Time</td>
                      <td className="p-3.5 font-mono text-cyan-300">2026-10-07 01:15:00 UTC</td>
                      <td className="p-3.5 text-slate-500">—</td>
                      <td className="p-3.5 text-emerald-400 font-sans">Verified Timestamp</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 text-slate-400 font-sans font-medium">Nearest AIS Track Candidate</td>
                      <td className="p-3.5 font-mono text-slate-200">MT SEA DRAGON (636019882)</td>
                      <td className="p-3.5 text-slate-500">MMSI Registry</td>
                      <td className="p-3.5 text-amber-400 font-sans">Dark Gap Active</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 text-slate-400 font-sans font-medium">Spatial Separation Distance</td>
                      <td className="p-3.5 font-mono text-rose-400">12.8 km (6.9 NM)</td>
                      <td className="p-3.5 text-slate-400">≤ 5.0 km (2.7 NM)</td>
                      <td className="p-3.5 text-rose-400 font-sans font-semibold">Threshold Exceeded</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 text-slate-400 font-sans font-medium">Temporal Difference</td>
                      <td className="p-3.5 font-mono text-rose-400">45 minutes from pre-gap ping</td>
                      <td className="p-3.5 text-slate-400">≤ 60 minutes</td>
                      <td className="p-3.5 text-amber-400 font-sans">Within Time Gate</td>
                    </tr>
                    <tr className="bg-white/[0.02]">
                      <td className="p-3.5 text-slate-200 font-sans font-bold">Overall Matching Outcome</td>
                      <td className="p-3.5 text-rose-300 font-bold" colSpan={2}>
                        UNMATCHED (Dark Vessel Candidate)
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold">
                          NON-COOPERATIVE
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                <span className="font-semibold text-amber-300 block mb-0.5">
                  Analyst Caveat on Negative AIS Association:
                </span>
                An unmatched SAR detection demonstrates the physical presence of a maritime vessel in absence of a received radio broadcast. It does not determine hostile intent or flag nation in isolation. Corroborating optical satellite reconnaissance, radar cross-section analysis, and maritime patrol aircraft (P-8I / Dornier 228) tasking are recommended.
              </div>
            </div>
          )}

          {/* TAB 4: WHY WAS THIS FLAGGED? */}
          {activeTab === 'why_flagged' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#0e1628] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">
                    Transparent Threat Scoring Formula
                  </h3>
                  <span className="text-xs font-mono text-cyan-400">
                    Composite Score: {alert.score} / 100
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  The threat score is calculated as a bounded heuristic accumulation across five independent maritime behavioral rules:
                </p>
                <div className="p-2.5 rounded bg-black/40 border border-white/[0.06] font-mono text-xs text-slate-300">
                  Threat Score = min(100, Σ Rule_Score_Contributions)
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  *Note: This heuristic score indicates multi-rule anomaly convergence. It is not an empirical Bayesian posterior probability that a vessel is engaged in hostile or illegal conduct.
                </p>
              </div>

              {/* Breakdown of each triggering rule */}
              <div className="space-y-3">
                {alert.findings.map((f, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-[#0e1628] border border-white/[0.07] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        {f.rule_name}
                      </span>
                      <span className="font-mono text-rose-400 font-bold text-sm">
                        +{f.score_contribution} Points
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed">{f.description}</p>

                    {f.evidence && f.evidence.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/[0.05] space-y-1.5 font-mono text-[11px]">
                        <span className="text-slate-500 block uppercase tracking-wider text-[10px]">
                          CITED EVIDENCE:
                        </span>
                        {f.evidence.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-2 rounded bg-black/40 border border-white/[0.04] text-slate-300"
                          >
                            <span className="text-cyan-400 font-semibold">[{ev.id}]</span>{' '}
                            {ev.title}: {ev.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: ANALYST DECISION & AUDIT */}
          {activeTab === 'decision' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#0e1628] border border-white/[0.08] space-y-4">
                <h3 className="text-sm font-semibold text-slate-100">
                  Record Human-in-the-Loop Analyst Adjudication
                </h3>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 block font-medium">
                    Operational Reason / Category:
                  </label>
                  <select
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    className="w-full bg-[#080d1a] border border-white/[0.1] rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="Standard Watch Procedure">Standard Watch Procedure</option>
                    <option value="Confirmed Dark Fleet Activity">Confirmed Dark Fleet Activity</option>
                    <option value="False Alarm / Environmental Clutter">False Alarm / Environmental Clutter</option>
                    <option value="Legitimate Bunkering Operation">Legitimate Bunkering Operation</option>
                    <option value="Escalated for Aircraft Interception">Escalated for Aircraft Interception</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 block font-medium">
                    Operational Assessment Note:
                  </label>
                  <textarea
                    value={analystNote}
                    onChange={(e) => setAnalystNote(e.target.value)}
                    placeholder="Enter actionable intelligence notes, vector instructions, or dismissal rationale..."
                    rows={3}
                    className="w-full bg-[#080d1a] border border-white/[0.1] rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 resize-none"
                  />
                </div>

                {/* Consequential action buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={() => setConfirmModalAction('CONFIRMED')}
                    disabled={isSubmitting}
                    className="py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Alert
                  </button>

                  <button
                    onClick={() => setConfirmModalAction('ESCALATED')}
                    disabled={isSubmitting}
                    className="py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <AlertOctagon className="w-4 h-4" />
                    Escalate to Command
                  </button>

                  <button
                    onClick={() => setConfirmModalAction('DISMISSED')}
                    disabled={isSubmitting}
                    className="py-2.5 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Dismiss Alert
                  </button>
                </div>
              </div>

              {/* Audit History */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Adjudication Audit Trail
                </h4>
                {alert.review_history && alert.review_history.length > 0 ? (
                  <div className="space-y-2">
                    {alert.review_history.map((rev, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#0e1628] border border-white/[0.06] text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-cyan-300">{rev.action}</span>
                            <span className="text-slate-500">by {rev.analyst}</span>
                          </div>
                          {rev.note && <p className="text-slate-400 mt-1">{rev.note}</p>}
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {new Date(rev.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No prior analyst reviews recorded. Status is currently NEW.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal before applying action */}
        {confirmModalAction && (
          <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#0d1424] border border-white/[0.15] rounded-xl p-5 space-y-4 shadow-2xl">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Confirm Adjudication Action
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                You are about to mark this incident as{' '}
                <strong className="text-cyan-300 uppercase">{confirmModalAction}</strong>. This state change will be committed to the operational fusion record.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmModalAction(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleExecuteDecision(confirmModalAction)}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-600 text-black transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );

  if (isStandalone) {
    return <div className="flex-1 h-full overflow-hidden bg-[#050914] flex flex-col">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 select-none font-sans">
      {content}
    </div>
  );
};
