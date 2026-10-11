import React, { useState, useId } from 'react';
import {
  Ship,
  Upload,
  FileSpreadsheet,
  Compass,
  MapPin,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  ChevronRight,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Vessel, Track, TrackPoint } from '../domain/models.ts';

interface Module2VesselTrackingProps {
  vessels: Vessel[];
  tracks: Record<string, Track>;
  onSelectVessel: (vesselId: string) => void;
  onRefreshState: () => void;
}

const SAMPLE_DEFENSE_CSV = `vessel_id,vessel_name,latitude,longitude,timestamp,speed_knots,course_deg,flag
419000124,ICGS VARAD (PATROL),22.2840,68.7420,2026-10-08T01:00:00Z,14.2,185.0,India
419000124,ICGS VARAD (PATROL),22.2210,68.7390,2026-10-08T02:30:00Z,15.8,182.0,India
419000124,ICGS VARAD (PATROL),22.1550,68.7450,2026-10-08T04:00:00Z,13.5,178.0,India
419000124,ICGS VARAD (PATROL),22.0900,68.7520,2026-10-08T05:30:00Z,14.0,175.0,India
636019882,MT SEA DRAGON,22.4200,69.0500,2026-10-06T12:00:00Z,12.5,225.0,Liberia
636019882,MT SEA DRAGON,22.3800,68.9900,2026-10-06T14:30:00Z,11.8,220.0,Liberia
636019882,MT SEA DRAGON,22.2500,68.8600,2026-10-07T08:00:00Z,0.8,110.0,Liberia
636019882,MT SEA DRAGON,22.1800,68.9200,2026-10-08T04:00:00Z,1.2,095.0,Liberia`;

export const Module2VesselTracking: React.FC<Module2VesselTrackingProps> = ({
  vessels,
  tracks,
  onSelectVessel,
  onRefreshState,
}) => {
  const [csvText, setCsvText] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedVesselId, setSelectedVesselId] = useState<string>(vessels[0]?.id || '');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const fileInputId = useId();

  const selectedVessel = vessels.find((v) => v.id === selectedVesselId) || vessels[0];
  const selectedTrack = selectedVessel ? tracks[selectedVessel.id] : null;

  // Filter vessels for search
  const filteredVessels = vessels.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.mmsi.toLowerCase().includes(q) ||
      (v.imo && v.imo.toLowerCase().includes(q)) ||
      v.flag_country.toLowerCase().includes(q)
    );
  });

  // Handle parsing CSV text into structured points
  const parseAndImportCsv = async (rawCsv: string) => {
    setIsImporting(true);
    setImportStatus(null);
    try {
      const lines = rawCsv.trim().split('\n').filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('CSV must contain a header row and at least one data row.');
      }

      const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
      const latIdx = header.findIndex((h) => h.includes('lat'));
      const lonIdx = header.findIndex((h) => h.includes('lon') || h.includes('lng'));
      const idIdx = header.findIndex((h) => h.includes('id') || h.includes('mmsi'));
      const timeIdx = header.findIndex((h) => h.includes('time') || h.includes('date'));
      const nameIdx = header.findIndex((h) => h.includes('name'));
      const speedIdx = header.findIndex((h) => h.includes('speed') || h.includes('sog'));
      const courseIdx = header.findIndex((h) => h.includes('course') || h.includes('cog'));
      const flagIdx = header.findIndex((h) => h.includes('flag'));

      if (latIdx === -1 || lonIdx === -1 || idIdx === -1 || timeIdx === -1) {
        throw new Error('Required CSV columns missing! CSV must contain: latitude, longitude, vessel_id, and timestamp.');
      }

      const points: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        const lat = parseFloat(parts[latIdx]);
        const lon = parseFloat(parts[lonIdx]);
        const vesselId = parts[idIdx];
        const timestamp = parts[timeIdx];

        if (!isNaN(lat) && !isNaN(lon) && vesselId && timestamp) {
          points.push({
            vesselId,
            vesselName: nameIdx !== -1 ? parts[nameIdx] : undefined,
            lat,
            lon,
            timestamp,
            sog: speedIdx !== -1 ? parseFloat(parts[speedIdx]) || 12 : 12,
            cog: courseIdx !== -1 ? parseFloat(parts[courseIdx]) || 180 : 180,
            flag: flagIdx !== -1 ? parts[flagIdx] : 'Unknown',
          });
        }
      }

      if (points.length === 0) {
        throw new Error('No valid track points found in CSV rows.');
      }

      const res = await fetch('/api/tracks/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
      });
      const data = await res.json();

      if (data.success) {
        setImportStatus(`Successfully parsed & imported ${points.length} track points across ${data.imported?.vesselCount || 'new'} vessels!`);
        onRefreshState();
      } else {
        throw new Error(data.error || 'Failed to import CSV');
      }
    } catch (err: any) {
      setImportStatus(`CSV Import Error: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseAndImportCsv(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] overflow-y-auto bg-[#050811] text-slate-200 p-6 space-y-6 font-mono select-none custom-scrollbar">
      {/* Title Header */}
      <div className="border-b border-white/[0.08] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Ship className="w-5 h-5" />
            </div>
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider font-['Chakra_Petch']">
              MODULE 2 — VESSEL TRACKING &amp; GEOSPATIAL MAPPING
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Import vessel tracking data from CSV (latitude, longitude, vessel ID, timestamp), plot positions, and visualize historical movement tracks.
          </p>
        </div>

        {/* CSV Upload & Sample Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCsvText(SAMPLE_DEFENSE_CSV);
              parseAndImportCsv(SAMPLE_DEFENSE_CSV);
            }}
            className="px-3 py-1.5 rounded bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-semibold border border-emerald-500/40 flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Load Sample Defense CSV
          </button>

          <label
            htmlFor={fileInputId}
            className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all shadow"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV File
          </label>
          <input
            id={fileInputId}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {importStatus && (
        <div
          className={`p-3 rounded text-xs flex items-center gap-2 border ${
            importStatus.includes('Error')
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
          }`}
        >
          {importStatus.includes('Error') ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{importStatus}</span>
        </div>
      )}

      {/* Main Grid: Left Fleet Roster / Right Historical Movement Tracks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Tracked Vessels Roster & Search */}
        <div className="lg:col-span-5 bg-[#090d16] border border-white/[0.08] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              TRACKED FLEET REGISTRY ({filteredVessels.length})
            </span>
            <div className="relative">
              <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search MMSI, name..."
                className="bg-[#060a14] border border-white/[0.08] text-[11px] text-slate-200 pl-6 pr-2 py-1 rounded focus:outline-none focus:border-cyan-500 w-36"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
            {filteredVessels.map((v) => {
              const isSelected = v.id === selectedVesselId;
              const trackPointsCount = tracks[v.id]?.points?.length || 0;
              const hasAlert = v.is_sanctioned;

              return (
                <div
                  key={v.id}
                  onClick={() => {
                    setSelectedVesselId(v.id);
                    setActiveStepIndex(0);
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/25 border-cyan-500/60 ring-1 ring-cyan-500/40'
                      : 'bg-[#060a14] border-white/[0.06] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      {v.name}
                      {hasAlert && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      )}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-white/[0.08] uppercase">
                      {v.vessel_type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>MMSI: {v.mmsi}</span>
                    <span>Flag: {v.flag_country}</span>
                  </div>

                  {v.last_known_point && (
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-1 border-t border-white/[0.04]">
                      <span>
                        {v.last_known_point.lat.toFixed(3)}°N, {v.last_known_point.lon.toFixed(3)}°E
                      </span>
                      <span className="text-cyan-400 font-bold">
                        {trackPointsCount} Trajectory Pings
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7 Cols: Movement Tracks & Historical Waypoint Playback */}
        <div className="lg:col-span-7 bg-[#090d16] border border-white/[0.08] rounded-lg p-5 space-y-4">
          {selectedVessel ? (
            <>
              {/* Vessel Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">SELECTED VESSEL DOSSIER</span>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    {selectedVessel.name}
                    <span className="text-xs font-normal text-slate-400">
                      (MMSI: {selectedVessel.mmsi})
                    </span>
                  </h3>
                </div>

                <button
                  onClick={() => onSelectVessel(selectedVessel.id)}
                  className="px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  View Target on Tactical Map
                </button>
              </div>

              {/* Vessel Current Position telemetry */}
              {selectedVessel.last_known_point && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-[#060a14] border border-white/[0.06] rounded text-center">
                    <span className="text-[9px] text-slate-500 uppercase block">Latitude</span>
                    <span className="text-xs font-bold text-slate-200">
                      {selectedVessel.last_known_point.lat.toFixed(4)}°N
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#060a14] border border-white/[0.06] rounded text-center">
                    <span className="text-[9px] text-slate-500 uppercase block">Longitude</span>
                    <span className="text-xs font-bold text-slate-200">
                      {selectedVessel.last_known_point.lon.toFixed(4)}°E
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#060a14] border border-white/[0.06] rounded text-center">
                    <span className="text-[9px] text-slate-500 uppercase block">Speed Over Ground</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {selectedVessel.last_known_point.sog || 0} knots
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#060a14] border border-white/[0.06] rounded text-center">
                    <span className="text-[9px] text-slate-500 uppercase block">Course Over Ground</span>
                    <span className="text-xs font-bold text-cyan-400">
                      {selectedVessel.last_known_point.cog || 0}°
                    </span>
                  </div>
                </div>
              )}

              {/* Historical Movement Track Waypoint Chronology */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    HISTORICAL MOVEMENT TRACK WAYPOINTS ({selectedTrack?.points?.length || 0})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Chronological AIS Pings
                  </span>
                </div>

                {selectedTrack && selectedTrack.points && selectedTrack.points.length > 0 ? (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                    {selectedTrack.points.map((pt, idx) => (
                      <div
                        key={`${pt.timestamp}-${idx}`}
                        className="p-2.5 bg-[#060a14] border border-white/[0.06] rounded flex items-center justify-between text-xs hover:border-cyan-500/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold flex items-center justify-center border border-cyan-500/30">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-200">
                              {pt.lat.toFixed(4)}°N, {pt.lon.toFixed(4)}°E
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {new Date(pt.timestamp).toUTCString().slice(0, 22)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="text-[10px] text-emerald-400 font-bold block">
                              {pt.sog || 0} kn
                            </span>
                            <span className="text-[9px] text-slate-500 block">Speed</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-cyan-400 font-bold block">
                              {pt.cog || 0}°
                            </span>
                            <span className="text-[9px] text-slate-500 block">Course</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-white/[0.08] rounded-lg">
                    No historical track points loaded for this vessel. Use "Import CSV File" or "Load Sample Defense CSV" above.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs">
              Select a vessel to inspect its movement tracks.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
