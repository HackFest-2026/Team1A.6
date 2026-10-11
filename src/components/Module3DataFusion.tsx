import React, { useState } from 'react';
import {
  Layers,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  Database,
  Satellite,
  Ship,
  FileText,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  Eye,
  Radio,
  Sliders,
  Crosshair,
} from 'lucide-react';
import {
  MaritimeOperationalState,
  Detection,
  Vessel,
  IntelligenceReport,
  Alert,
} from '../domain/models.ts';

interface Module3DataFusionProps {
  state: MaritimeOperationalState | null;
  onFocusTarget: (targetId: string) => void;
}

export const Module3DataFusion: React.FC<Module3DataFusionProps> = ({
  state,
  onFocusTarget,
}) => {
  const [filterSource, setFilterSource] = useState<'ALL' | 'SAR' | 'AIS' | 'OSINT' | 'DRONE'>('ALL');
  const [spatialGateKm, setSpatialGateKm] = useState<number>(5.0);
  const [temporalGateHours, setTemporalGateHours] = useState<number>(1.0);

  if (!state) return null;

  const vessels = state.vessels;
  const detections = state.detections;
  const reports = state.reports;
  const alerts = state.alerts;

  // Identify discrepancies and conflicts across modalities
  const conflicts = [
    {
      id: 'conf-01',
      title: 'AIS Transponder Dark Gap vs Sentinel-1 SAR Contact',
      severity: 'CRITICAL',
      target: 'MT SEA DRAGON (MMSI: 636019882)',
      targetId: 'vessel-sea-dragon',
      modalities: ['AISStream Transponder', 'Sentinel-1 SAR Radar (sar-det-001)'],
      description: 'Vessel stopped transmitting AIS pings for 14 hours in high-risk zone, but Sentinel-1 SAR acquired high-contrast radar return (+22.4 dB, length 278m) at coordinates [22.25°N, 68.86°E].',
      status: 'CONFIRMED DISCREPANCY',
      resolution: 'Classified as non-cooperative dark tanker undergoing unauthorized ship-to-ship transfer.',
    },
    {
      id: 'conf-02',
      title: 'Impossible Velocity Jump (Kinematic GNSS Spoofing)',
      severity: 'CRITICAL',
      target: 'M/V CASPIAN TRADER (MMSI: 214182991)',
      targetId: 'vessel-caspian-trader',
      modalities: ['Terrestrial AIS', 'Satellite AIS (S-AIS)'],
      description: 'AIS ping jumped 75 NM in 20 minutes (effective velocity 225 knots). Physically impossible for displacement cargo vessel.',
      status: 'CONFIRMED DISCREPANCY',
      resolution: 'GNSS coordinates spoofed; actual position held off Okha Fairway.',
    },
    {
      id: 'conf-03',
      title: 'Unregistered Radar Blip Inside Defense Exclusion Zone',
      severity: 'HIGH',
      target: 'SAR Contact sar-det-004',
      targetId: 'sar-det-004',
      modalities: ['Copernicus Sentinel-1 SAR', 'INS Okha Military Geofence'],
      description: 'SAR radar contact detected inside active Naval firing range with zero corresponding AIS broadcasts or flight plans.',
      status: 'UNRESOLVED CONFLICT',
      resolution: 'Tasked P-8I maritime patrol aircraft for visual FLIR confirmation.',
    },
    {
      id: 'conf-04',
      title: 'OpenSanctions OFAC SDN Flagged Entity in Western Fairway',
      severity: 'HIGH',
      target: 'MT OLYMPIC SPIRIT (MMSI: 636015444)',
      targetId: 'vessel-olympic-spirit',
      modalities: ['OpenSanctions OFAC API', 'AIS Live Fairway Tracker'],
      description: 'Vessel matches US Treasury OFAC SDN sanctions list for illicit crude transport. Intercepted while rendezvousing with MT SEA DRAGON.',
      status: 'CONFIRMED MATCH',
      resolution: 'Flagged for coastal guard interdiction upon port approach.',
    },
  ];

  // Modality Provenance Records
  const observations = [
    {
      id: 'obs-sar-01',
      source: 'Copernicus Sentinel-1 SAR',
      type: 'Synthetic Aperture Radar',
      sensor: 'C-Band SAR (IW GRDH)',
      target: 'MT SEA DRAGON (Hull: 278m)',
      location: '22.25°N, 68.86°E',
      timestamp: '2026-10-07T08:00:00Z',
      confidence: '94%',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      category: 'SAR',
    },
    {
      id: 'obs-ais-01',
      source: 'AISStream.io Live Buffer',
      type: 'Cooperative Terrestrial AIS',
      sensor: 'VHF Ch 87B/88B',
      target: 'ICGS SAMARTH (MMSI: 419000123)',
      location: '22.22°N, 68.78°E',
      timestamp: '2026-10-08T06:00:00Z',
      confidence: '100%',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      category: 'AIS',
    },
    {
      id: 'obs-drone-01',
      source: 'Tactical Drone UAV-7',
      type: 'Aerial Optical & FLIR Video',
      sensor: 'EO/IR Thermal Boson 640',
      target: 'Fast Interceptor Craft (Speedboat)',
      location: '22.38°N, 68.82°E',
      timestamp: '2026-10-08T05:30:00Z',
      confidence: '96%',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      category: 'DRONE',
    },
    {
      id: 'obs-osint-01',
      source: 'OpenSanctions & OFAC SDN',
      type: 'Sanctions & Watchlist Intelligence',
      sensor: 'UN / OFAC Maritime Registry',
      target: 'MT OLYMPIC SPIRIT (IMO: 9283742)',
      location: '22.19°N, 68.91°E',
      timestamp: '2026-10-07T14:00:00Z',
      confidence: '100%',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      category: 'OSINT',
    },
    {
      id: 'obs-nav-01',
      source: 'NAVAREA VIII Advisory Notice',
      type: 'Navigational Warning & Geofence',
      sensor: 'Indian Hydrographic Office',
      target: 'INS Okha Naval Defense Exclusion Zone',
      location: '22.46°N, 68.75°E',
      timestamp: '2026-10-06T00:00:00Z',
      confidence: '100%',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      category: 'OSINT',
    },
  ];

  const filteredObservations = observations.filter(
    (o) => filterSource === 'ALL' || o.category === filterSource
  );

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] overflow-y-auto bg-[#050811] text-slate-200 p-6 space-y-6 font-mono select-none custom-scrollbar">
      {/* Title Header */}
      <div className="border-b border-white/[0.08] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider font-['Chakra_Petch']">
              MODULE 3 — MULTIMODAL DATA FUSION &amp; CONFLICT RESOLVER
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fuse satellite radar, drone optical, cooperative AIS and OSINT intelligence. Resolve conflicts, identify dark transponder gaps, and retain source provenance.
          </p>
        </div>

        {/* Spatial & Temporal Gating Controls */}
        <div className="flex items-center gap-4 bg-[#090d16] border border-white/[0.08] rounded p-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px]">Spatial Gate:</span>
            <span className="font-bold text-cyan-400 tabular-nums">{spatialGateKm} km</span>
          </div>
          <div className="h-4 w-px bg-white/[0.1]" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px]">Temporal Gate:</span>
            <span className="font-bold text-amber-400 tabular-nums">±{temporalGateHours} hr</span>
          </div>
        </div>
      </div>

      {/* Discrepancies and Conflicts Box */}
      <div className="bg-[#090d16] border border-rose-500/30 rounded-lg p-5 space-y-4 shadow-[0_0_20px_rgba(244,63,94,0.06)]">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            CROSS-MODAL DISCREPANCIES &amp; INCONSISTENCIES IDENTIFIED ({conflicts.length})
          </div>
          <span className="text-[10px] text-slate-400">
            Automated Spatio-Temporal Disambiguation Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conflicts.map((conf) => (
            <div
              key={conf.id}
              className="p-3.5 bg-[#060a14] border border-rose-500/20 rounded-lg space-y-2 hover:border-rose-400/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {conf.severity}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {conf.status}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-100">{conf.title}</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">{conf.description}</p>

              <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold truncate max-w-[220px]">
                  Target: {conf.target}
                </span>
                <button
                  onClick={() => onFocusTarget(conf.targetId)}
                  className="text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" /> Inspect Target
                </button>
              </div>

              <div className="p-2 rounded bg-black/40 border border-white/[0.04] text-[10px] text-slate-400">
                <strong className="text-slate-300">Resolution Directive:</strong> {conf.resolution}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Observation Provenance Records */}
      <div className="bg-[#090d16] border border-white/[0.08] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              ORIGINAL OBSERVATION SOURCE PROVENANCE RECORDS
            </h3>
            <span className="text-[10px] text-slate-400">
              Every fused target retains immutable attribution to raw sensors and intelligence feeds.
            </span>
          </div>

          {/* Filter by Source */}
          <div className="flex items-center bg-[#070b14] border border-white/[0.08] rounded p-0.5 text-[10px]">
            {(['ALL', 'SAR', 'AIS', 'DRONE', 'OSINT'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterSource(s)}
                className={`px-2 py-1 rounded font-semibold ${
                  filterSource === s
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0c1322] text-[10px] text-slate-400 uppercase">
                <th className="p-3">ORIGINAL SOURCE</th>
                <th className="p-3">SENSOR / PROTOCOL</th>
                <th className="p-3">OBSERVED TARGET</th>
                <th className="p-3">GEOLOCATION</th>
                <th className="p-3">CONFIDENCE</th>
                <th className="p-3">TIMESTAMP (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-[11px]">
              {filteredObservations.map((obs) => (
                <tr key={obs.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-3">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${obs.badgeColor}`}
                    >
                      {obs.source}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{obs.sensor}</td>
                  <td className="p-3 font-bold text-slate-100">{obs.target}</td>
                  <td className="p-3 font-mono text-cyan-300">{obs.location}</td>
                  <td className="p-3 font-bold text-emerald-400">{obs.confidence}</td>
                  <td className="p-3 text-slate-400 font-mono">
                    {new Date(obs.timestamp).toUTCString().slice(0, 22)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
