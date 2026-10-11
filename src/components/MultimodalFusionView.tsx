import React, { useState } from 'react';
import {
  GitMerge,
  Layers,
  Satellite,
  Ship,
  FileText,
  ShieldAlert,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Eye,
  Sliders,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  MaritimeOperationalState,
  Alert,
} from '../domain/models.ts';

interface MultimodalFusionViewProps {
  state: MaritimeOperationalState | null;
  onFocusTarget: (targetId: string) => void;
  onInvestigateAlert?: (alertId: string) => void;
}

export const MultimodalFusionView: React.FC<MultimodalFusionViewProps> = ({
  state,
  onFocusTarget,
  onInvestigateAlert,
}) => {
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<string>('disc-01');

  if (!state) return null;

  const vessels = state.vessels;
  const tracks = state.tracks;
  const detections = state.detections;
  const reports = state.reports;
  const alerts = state.alerts;
  const zones = state.zones;

  // Pipeline stages with actual application state
  const pipelineStages = [
    {
      id: 'ingestion',
      stageNumber: 1,
      title: 'Sensor Ingestion & Normalization',
      status: 'ONLINE',
      sources: [
        { name: 'Terrestrial & Satellite AIS Tracks', count: Object.keys(tracks).length, unit: 'Active Tracks', status: 'Connected' },
        { name: 'Copernicus Sentinel-1 SAR Radar', count: detections.length, unit: 'Detections', status: 'Connected' },
        { name: 'Geofenced Defense & EEZ Polygons', count: zones.length, unit: 'Boundaries', status: 'Connected' },
        { name: 'NAVAREA & OpenSanctions Advisories', count: reports.length, unit: 'Advisories', status: 'Connected' },
        { name: 'Coastal Drone FLIR Video Feed', count: 0, unit: 'Streams', status: 'Standby / On Demand' },
      ],
      description: 'Ingests asynchronous telemetry from maritime transponders, synthetic aperture radar satellites, and maritime warning notices into canonical WGS-84 coordinate space.',
    },
    {
      id: 'correlation',
      stageNumber: 2,
      title: 'Spatial–Temporal Correlation',
      status: 'ACTIVE',
      sources: [
        { name: 'Spatial Gate Tolerance', count: 5.0, unit: 'km (2.7 NM)', status: 'Active' },
        { name: 'Temporal Gate Tolerance', count: 60, unit: 'minutes', status: 'Active' },
        { name: 'Correlated Cooperative Contacts', count: detections.filter((d) => !d.is_dark_vessel).length, unit: 'Matched', status: 'Nominal' },
        { name: 'Unmatched Candidate Contacts', count: detections.filter((d) => d.is_dark_vessel).length, unit: 'Unmatched', status: 'Alerting' },
      ],
      description: 'Calculates great-circle distance between interpolated vessel dead-reckoning points and satellite SAR returns to discover transponder-silent vessels.',
    },
    {
      id: 'detection',
      stageNumber: 3,
      title: 'Multimodal Anomaly Detection',
      status: 'ACTIVE',
      sources: [
        { name: 'AIS Gap Transponder Shut-Off', count: alerts.filter((a) => a.findings.some((f) => f.rule_id === 'ais_gap')).length, unit: 'Triggers', status: 'Active' },
        { name: 'Ship-to-Ship (STS) Rendezvous', count: alerts.filter((a) => a.findings.some((f) => f.rule_id === 'rendezvous')).length, unit: 'Triggers', status: 'Active' },
        { name: 'Restricted Naval Zone Breach', count: alerts.filter((a) => a.findings.some((f) => f.rule_id === 'zone_intrusion')).length, unit: 'Triggers', status: 'Active' },
        { name: 'Kinematic Velocity Spoofing', count: alerts.filter((a) => a.findings.some((f) => f.rule_id === 'position_jump')).length, unit: 'Triggers', status: 'Active' },
      ],
      description: 'Evaluates kinematic rules against transponder trajectories, identifying impossible speed jumps, offshore loitering, and clandestine close approaches.',
    },
    {
      id: 'scoring',
      stageNumber: 4,
      title: 'Explainable Threat Assessment',
      status: 'CALCULATED',
      sources: [
        { name: 'Critical Threats (Score ≥ 75)', count: alerts.filter((a) => a.threat_level === 'CRITICAL').length, unit: 'Alerts', status: 'Actionable' },
        { name: 'High Priority (Score 40–74)', count: alerts.filter((a) => a.threat_level === 'HIGH').length, unit: 'Alerts', status: 'Actionable' },
        { name: 'Medium Priority (Score 20–39)', count: alerts.filter((a) => a.threat_level === 'MEDIUM').length, unit: 'Alerts', status: 'Advisory' },
        { name: 'Explainable Heuristic Engine', count: alerts.length, unit: 'Dossiers', status: 'Active' },
      ],
      description: 'Aggregates weighted contributions into a 0–100 heuristic threat score, citing exact evidence IDs and rule attributions.',
    },
    {
      id: 'review',
      stageNumber: 5,
      title: 'Human-in-the-Loop Analyst Adjudication',
      status: 'PENDING WATCH COMMANDER',
      sources: [
        { name: 'New Unreviewed Incidents', count: alerts.filter((a) => a.status === 'NEW').length, unit: 'New', status: 'Queue' },
        { name: 'Confirmed Actionable Threats', count: alerts.filter((a) => a.status === 'CONFIRMED').length, unit: 'Confirmed', status: 'Verified' },
        { name: 'Escalated to Interception Unit', count: alerts.filter((a) => a.status === 'ESCALATED').length, unit: 'Escalated', status: 'Action' },
        { name: 'Dismissed / False Alarms', count: alerts.filter((a) => a.status === 'DISMISSED').length, unit: 'Dismissed', status: 'Audited' },
      ],
      description: 'Provides Watch Commanders with complete evidence dossiers to confirm, escalate to maritime patrol aircraft, or dismiss events with audit logging.',
    },
  ];

  // Specific cross-modal discrepancies
  const discrepancies = [
    {
      id: 'disc-01',
      title: 'AIS Transponder Dark Gap vs Sentinel-1 Radar Contact',
      severity: 'CRITICAL',
      target: 'MT SEA DRAGON (MMSI: 636019882)',
      targetId: 'vessel-sea-dragon',
      modalities: ['Terrestrial AIS Transponder', 'Sentinel-1 SAR (sar-det-001)'],
      evidenceText:
        'Vessel ceased broadcasting AIS for 14 hours. Sentinel-1 acquired a high-reflectivity radar blip (+22.4 dB, estimated length 274m) 12.8 km away from the last broadcast location, confirming clandestine movement.',
      suggestedAction: 'Vector Coast Guard patrol ICGS SAMARTH for visual FLIR intercept.',
    },
    {
      id: 'disc-02',
      title: 'Impossible Speed Jump (GNSS Positioning Spoofing)',
      severity: 'CRITICAL',
      target: 'M/V CASPIAN TRADER (MMSI: 214182991)',
      targetId: 'vessel-caspian-trader',
      modalities: ['Terrestrial AIS Receiver', 'Coastal Radar Fairway Tracker'],
      evidenceText:
        'Sequential AIS reports showed a 75 NM displacement within 20 minutes (effective velocity 225 knots), which is physically impossible for a displacement cargo vessel.',
      suggestedAction: 'Apply Kalman kinematic filter and notify local maritime administration.',
    },
    {
      id: 'disc-03',
      title: 'Unregistered Radar Return Inside Defense Exclusion Zone',
      severity: 'HIGH',
      target: 'SAR Contact sar-det-004',
      targetId: 'sar-det-004',
      modalities: ['Copernicus Sentinel-1 SAR', 'INS Okha Military Exclusion Zone'],
      evidenceText:
        'High-contrast radar contact detected inside active military live-firing coordinates with zero correlating transponder transmission or civilian clearance.',
      suggestedAction: 'Task P-8I Neptune maritime patrol aircraft for optical confirmation.',
    },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#050914] p-6 space-y-6 select-none font-sans custom-scrollbar">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
              Multimodal Maritime Data Fusion Pipeline
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end architecture demonstrating how raw multi-sensor telemetry transforms into explainable threat intelligence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Hexagonal Fusion Engine Active
          </span>
        </div>
      </div>

      {/* 1. Step-by-Step Architecture Pipeline */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          SURVEILLANCE FUSION PIPELINE STAGES
        </h2>

        <div className="space-y-3">
          {pipelineStages.map((stage, idx) => (
            <div key={stage.id} className="relative">
              <div className="p-4 rounded-xl bg-[#0b101f] border border-white/[0.07] hover:border-white/[0.14] transition-all space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/35 flex items-center justify-center text-xs font-bold font-mono text-indigo-300">
                      {stage.stageNumber}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-100">
                      {stage.title}
                    </h3>
                  </div>

                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-cyan-300 border border-white/[0.06] w-fit">
                    Status: {stage.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {stage.description}
                </p>

                {/* Sources / Indicators Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-white/[0.05]">
                  {stage.sources.map((src, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-[#070b16] border border-white/[0.05] space-y-1 font-mono text-xs"
                    >
                      <span className="text-[10px] text-slate-400 block truncate font-sans">
                        {src.name}
                      </span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-bold text-slate-100 tabular-nums">
                          {src.count}
                        </span>
                        <span className="text-[10px] text-slate-500">{src.unit}</span>
                      </div>
                      <span
                        className={`text-[9px] block ${
                          src.status === 'Connected' || src.status === 'Active' || src.status === 'Verified'
                            ? 'text-emerald-400'
                            : src.status === 'Alerting' || src.status === 'Actionable'
                            ? 'text-rose-400 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        ● {src.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connecting arrow except last */}
              {idx < pipelineStages.length - 1 && (
                <div className="flex justify-center my-1">
                  <ArrowDown className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Cross-Modal Conflict & Discrepancy Resolution */}
      <div className="space-y-4 pt-4 border-t border-white/[0.08]">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Cross-Modal Discrepancy &amp; Conflict Resolution
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Incidents where one modality contradicted or exposed another (e.g. radar acquisition during AIS dark window)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {discrepancies.map((disc) => (
            <div
              key={disc.id}
              className="p-4 rounded-xl bg-[#0c1222] border border-white/[0.07] hover:border-cyan-500/35 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    {disc.severity} DISCREPANCY
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-slate-100">
                  {disc.title}
                </h3>
                <span className="text-xs font-mono text-cyan-400 block mt-1">
                  Target: {disc.target}
                </span>

                <div className="mt-2.5 space-y-1 text-xs text-slate-300">
                  <span className="text-[10px] text-slate-500 font-mono block">
                    MODALITIES INVOLVED:
                  </span>
                  <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                    {disc.modalities.map((m, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  {disc.evidenceText}
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.05] space-y-2">
                <div className="text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300 block mb-0.5">
                    Recommended Action:
                  </span>
                  {disc.suggestedAction}
                </div>

                <button
                  onClick={() => {
                    onFocusTarget(disc.targetId);
                    if (onInvestigateAlert) onInvestigateAlert(disc.targetId);
                  }}
                  className="w-full py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Investigate Target Evidence
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
