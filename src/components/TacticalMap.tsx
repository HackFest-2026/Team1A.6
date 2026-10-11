import React, { useState } from 'react';
import {
  Vessel,
  Track,
  Detection,
  Zone,
  Alert,
} from '../domain/models.ts';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  Satellite,
  ShieldAlert,
} from 'lucide-react';

interface TacticalMapProps {
  vessels: Vessel[];
  tracks: Record<string, Track>;
  detections: Detection[];
  zones: Zone[];
  alerts: Alert[];
  selectedTargetId: string | null;
  onSelectTarget: (id: string) => void;
  layers: {
    tracks: boolean;
    sarDetections: boolean;
    zones: boolean;
    rendezvousLinks: boolean;
    radarRings: boolean;
    grid: boolean;
  };
  activeQuickFilter: 'ALL' | 'DARK' | 'CRITICAL' | 'STS';
  setActiveQuickFilter: (filter: 'ALL' | 'DARK' | 'CRITICAL' | 'STS') => void;
}

const LON_MIN = 65.5;
const LON_MAX = 72.5;
const LAT_MIN = 19.5;
const LAT_MAX = 24.2;

export const TacticalMap: React.FC<TacticalMapProps> = ({
  vessels,
  tracks,
  detections,
  zones,
  alerts,
  selectedTargetId,
  onSelectTarget,
  layers,
  activeQuickFilter,
  setActiveQuickFilter,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [hoveredTarget, setHoveredTarget] = useState<any | null>(null);

  const project = (lon: number, lat: number) => {
    const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * 1000;
    const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 800;
    return { x, y };
  };

  const getVesselColor = (vessel: Vessel) => {
    if (vessel.vessel_type === 'military') return '#38bdf8'; // Coast guard / Navy
    const alert = alerts.find((a) => a.vessel_id === vessel.id);
    if (!alert) return '#34d399'; // Nominal commercial
    if (alert.threat_level === 'CRITICAL') return '#f43f5e';
    if (alert.threat_level === 'HIGH') return '#fb923c';
    return '#38bdf8';
  };

  // Indian West Coastline path approximation
  const coastlinePoints = [
    [68.1, 23.7],
    [68.5, 23.3],
    [69.0, 22.9],
    [69.7, 22.8],
    [70.2, 23.0],
    [70.5, 22.7],
    [69.9, 22.5],
    [69.0, 22.4],
    [69.6, 21.6],
    [70.3, 20.9],
    [71.0, 20.7],
    [72.1, 21.1],
    [72.3, 22.2],
    [72.8, 21.6],
    [72.8, 21.1],
    [72.9, 19.8],
    [72.8, 18.9],
  ];

  const coastlineSvgPath = coastlinePoints
    .map((pt, idx) => {
      const p = project(pt[0], pt[1]);
      return `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(' ');

  // Quick filter filtering logic for map targets
  const visibleVessels = vessels.filter((v) => {
    if (activeQuickFilter === 'ALL') return true;
    const alert = alerts.find((a) => a.vessel_id === v.id);
    if (activeQuickFilter === 'CRITICAL') return alert?.threat_level === 'CRITICAL';
    if (activeQuickFilter === 'STS')
      return alert?.findings.some((f) => f.rule_id === 'rendezvous');
    if (activeQuickFilter === 'DARK') return false; // Detections only
    return true;
  });

  const visibleDetections = detections.filter((d) => {
    if (activeQuickFilter === 'ALL') return true;
    if (activeQuickFilter === 'DARK') return d.is_dark_vessel;
    if (activeQuickFilter === 'CRITICAL') return d.is_dark_vessel;
    return true;
  });

  return (
    <div className="relative flex-1 h-[calc(100vh-3.25rem-3.75rem)] bg-[#050811] overflow-hidden select-none">
      {/* 1. Floating Top Center Quick Filter Chips */}
      <div className="absolute top-3 left-3 z-20 hidden md:flex items-center gap-2 bg-[#090e1a]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/[0.08] shadow-lg text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold text-slate-100 font-['Chakra_Petch'] uppercase tracking-wider">
          MODULE 5: COMMON OPERATING PICTURE
        </span>
      </div>

      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-[#090e1a]/90 backdrop-blur-md px-2 py-1 rounded-full border border-white/[0.08] shadow-lg text-xs font-mono">
        <button
          onClick={() => setActiveQuickFilter('ALL')}
          className={`px-3 py-1 rounded-full transition-colors ${
            activeQuickFilter === 'ALL'
              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Contacts ({vessels.length + detections.length})
        </button>
        <button
          onClick={() => setActiveQuickFilter('DARK')}
          className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors ${
            activeQuickFilter === 'DARK'
              ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
              : 'text-slate-400 hover:text-rose-300'
          }`}
        >
          <Satellite className="w-3 h-3 text-rose-400" />
          Dark Vessels ({detections.filter((d) => d.is_dark_vessel).length})
        </button>
        <button
          onClick={() => setActiveQuickFilter('STS')}
          className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors ${
            activeQuickFilter === 'STS'
              ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
              : 'text-slate-400 hover:text-amber-300'
          }`}
        >
          <Compass className="w-3 h-3 text-amber-400" />
          STS Rendezvous
        </button>
        <button
          onClick={() => setActiveQuickFilter('CRITICAL')}
          className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors ${
            activeQuickFilter === 'CRITICAL'
              ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
              : 'text-slate-400 hover:text-rose-300'
          }`}
        >
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          Critical Threats ({alerts.filter((a) => a.threat_level === 'CRITICAL').length})
        </button>
      </div>

      {/* 2. Floating Minimal Zoom HUD Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 bg-[#090e1a]/90 backdrop-blur-md p-1 rounded-md border border-white/[0.08]">
        <button
          onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/[0.04] rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/[0.04] rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoomLevel(1.0);
            setPanOffset({ x: 0, y: 0 });
          }}
          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/[0.04] rounded transition-colors"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Floating Bottom Coordinates HUD Probe */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-none bg-[#090e1a]/85 backdrop-blur px-2.5 py-1 rounded border border-white/[0.07] text-[10px] font-mono text-slate-400">
        GRID: 22.0000°N, 69.0000°E · WGS-84 GEODETIC · SCALE 1:250K
      </div>

      {/* 4. Main Clean SVG Map */}
      <svg
        viewBox="0 0 1000 800"
        className="w-full h-full cursor-crosshair"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: '50% 50%',
          transition: 'transform 0.15s ease-out',
        }}
      >
        <defs>
          <pattern
            id="restrictedHatchMinimal"
            width="10"
            height="10"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="10" stroke="#f43f5e" strokeWidth="1" strokeOpacity="0.25" />
          </pattern>
        </defs>

        {/* Ocean Background */}
        <rect width="1000" height="800" fill="#050811" />

        {/* Range Circles (Quiet, minimal opacity) */}
        {layers.radarRings && (
          <g opacity="0.15" pointerEvents="none">
            <circle cx="500" cy="400" r="180" fill="none" stroke="#334155" strokeDasharray="3 3" />
            <circle cx="500" cy="400" r="320" fill="none" stroke="#334155" strokeDasharray="4 4" />
            <circle cx="500" cy="400" r="460" fill="none" stroke="#334155" strokeDasharray="5 5" />
          </g>
        )}

        {/* Nautical Degree Lines */}
        {layers.grid && (
          <g opacity="0.2" pointerEvents="none">
            {[66, 67, 68, 69, 70, 71, 72].map((lon) => {
              const p = project(lon, 22);
              return (
                <g key={`lon-${lon}`}>
                  <line x1={p.x} y1="0" x2={p.x} y2="800" stroke="#1e293b" strokeWidth="1" />
                  <text x={p.x + 3} y="792" fill="#475569" fontSize="8" fontFamily="monospace">
                    {lon}°E
                  </text>
                </g>
              );
            })}
            {[20, 21, 22, 23, 24].map((lat) => {
              const p = project(69, lat);
              return (
                <g key={`lat-${lat}`}>
                  <line x1="0" y1={p.y} x2="1000" y2={p.y} stroke="#1e293b" strokeWidth="1" />
                  <text x="8" y={p.y - 3} fill="#475569" fontSize="8" fontFamily="monospace">
                    {lat}°N
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Landmass & Coastline */}
        <polygon
          points={`${coastlinePoints
            .map((pt) => {
              const p = project(pt[0], pt[1]);
              return `${p.x},${p.y}`;
            })
            .join(' ')} 1000,800 1000,0`}
          fill="#0a0f1d"
        />
        <path
          d={coastlineSvgPath}
          fill="none"
          stroke="#1e293b"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Quiet Coastline Port Labels */}
        <g fontSize="8" fontFamily="monospace" fill="#475569" pointerEvents="none">
          <text x={project(69.8, 22.8).x} y={project(69.8, 22.8).y - 5}>Mundra</text>
          <text x={project(70.2, 23.0).x} y={project(70.2, 23.0).y - 5}>Kandla</text>
          <text x={project(68.9, 22.4).x} y={project(68.9, 22.4).y - 5}>INS Okha</text>
          <text x={project(69.5, 21.6).x} y={project(69.5, 21.6).y - 5}>Porbandar</text>
        </g>

        {/* Zones (Quiet, transparent) */}
        {layers.zones &&
          zones.map((zone) => {
            const ring = zone.coordinates[0];
            if (!ring) return null;
            const pointsStr = ring
              .map((pt) => {
                const p = project(pt[0], pt[1]);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(' ');

            const isRestricted = zone.zone_type === 'naval_restricted';

            return (
              <g key={zone.id}>
                <polygon
                  points={pointsStr}
                  fill={isRestricted ? 'url(#restrictedHatchMinimal)' : `${zone.color}05`}
                  stroke={zone.color || '#00f0ff'}
                  strokeWidth="1"
                  strokeOpacity={isRestricted ? '0.7' : '0.4'}
                  strokeDasharray={isRestricted ? '4 3' : '6 3'}
                />
                <text
                  x={project(ring[0][0], ring[0][1]).x + 6}
                  y={project(ring[0][0], ring[0][1]).y + 12}
                  fill={zone.color || '#00f0ff'}
                  fontSize="8"
                  fontFamily="monospace"
                  opacity="0.6"
                >
                  {zone.name.toUpperCase()}
                </text>
              </g>
            );
          })}

        {/* Ship-to-Ship Rendezvous link vector */}
        {layers.rendezvousLinks && (
          <g>
            {(() => {
              const seaDragon = vessels.find((v) => v.id === 'vessel-sea-dragon');
              const olympicSpirit = vessels.find((v) => v.id === 'vessel-olympic-spirit');
              if (seaDragon?.last_known_point && olympicSpirit?.last_known_point) {
                const p1 = project(seaDragon.last_known_point.lon, seaDragon.last_known_point.lat);
                const p2 = project(olympicSpirit.last_known_point.lon, olympicSpirit.last_known_point.lat);
                return (
                  <g opacity="0.85">
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                    />
                    <text
                      x={(p1.x + p2.x) / 2 + 10}
                      y={(p1.y + p2.y) / 2 + 3}
                      fill="#f59e0b"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      STS Rendezvous (&lt;400m)
                    </text>
                  </g>
                );
              }
              return null;
            })()}
          </g>
        )}

        {/* Historical Tracks (Fading subtle trails) */}
        {layers.tracks &&
          Object.values(tracks).map((track) => {
            if (!track.points || track.points.length < 2) return null;
            const pointsStr = track.points
              .map((pt, idx) => {
                const p = project(pt.lon, pt.lat);
                return `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
              })
              .join(' ');

            const vessel = vessels.find((v) => v.id === track.vessel_id);
            const color = vessel ? getVesselColor(vessel) : '#06b6d4';

            return (
              <g key={track.vessel_id} opacity="0.35">
                <path d={pointsStr} fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 2" />
              </g>
            );
          })}

        {/* SAR Detections (Quiet, precise) */}
        {layers.sarDetections &&
          visibleDetections.map((det) => {
            const p = project(det.lon, det.lat);
            const isDark = det.is_dark_vessel;
            const isSelected = selectedTargetId === det.id;

            return (
              <g
                key={det.id}
                transform={`translate(${p.x}, ${p.y})`}
                className="cursor-pointer"
                onClick={() => onSelectTarget(det.id)}
                onMouseEnter={() => setHoveredTarget({ ...det, type: 'sar' })}
                onMouseLeave={() => setHoveredTarget(null)}
              >
                {isDark ? (
                  <g>
                    <circle
                      r="12"
                      fill="#f43f5e15"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle r="3" fill="#f43f5e" />
                    {isSelected && (
                      <circle r="18" fill="none" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 3" />
                    )}
                    <text x="14" y="-3" fill="#f43f5e" fontSize="8" fontFamily="monospace" fontWeight="bold">
                      Dark Vessel
                    </text>
                  </g>
                ) : (
                  <g opacity="0.6">
                    <circle r="6" fill="#10b98115" stroke="#10b981" strokeWidth="1" />
                    <circle r="2" fill="#10b981" />
                  </g>
                )}
              </g>
            );
          })}

        {/* Moving Vessels (Minimal Chevrons) */}
        {visibleVessels.map((vessel) => {
          if (!vessel.last_known_point) return null;
          const p = project(vessel.last_known_point.lon, vessel.last_known_point.lat);
          const color = getVesselColor(vessel);
          const heading = vessel.last_known_point.heading || vessel.last_known_point.cog || 0;
          const isSelected =
            selectedTargetId === vessel.id ||
            alerts.some((a) => a.id === selectedTargetId && a.vessel_id === vessel.id);

          return (
            <g
              key={vessel.id}
              transform={`translate(${p.x}, ${p.y})`}
              className="cursor-pointer"
              onClick={() => onSelectTarget(vessel.id)}
              onMouseEnter={() => setHoveredTarget({ ...vessel, type: 'vessel' })}
              onMouseLeave={() => setHoveredTarget(null)}
            >
              {/* Sleek Selection Ring */}
              {isSelected && (
                <circle
                  r="18"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
              )}

              {/* Minimal Velocity Line */}
              {vessel.last_known_point.sog > 1 && (
                <line
                  x1="0"
                  y1="0"
                  x2={Math.sin((heading * Math.PI) / 180) * (vessel.last_known_point.sog * 1.5)}
                  y2={-Math.cos((heading * Math.PI) / 180) * (vessel.last_known_point.sog * 1.5)}
                  stroke={color}
                  strokeWidth="1"
                  opacity="0.6"
                />
              )}

              {/* Minimal Chevron */}
              <g transform={`rotate(${heading})`}>
                <polygon points="0,-8 5,6 0,3 -5,6" fill={color} stroke="#050811" strokeWidth="0.8" />
              </g>

              {/* Vessel Label */}
              <text
                x="8"
                y="-4"
                fill={color}
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {vessel.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Card (Quiet, unobtrusive) */}
      {hoveredTarget && (
        <div className="absolute bottom-10 left-3 z-30 pointer-events-none bg-[#080d1a]/95 border border-white/[0.08] p-2.5 rounded shadow-xl font-mono text-xs text-slate-200 min-w-56 backdrop-blur-md">
          {hoveredTarget.type === 'vessel' ? (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-slate-300 font-bold border-b border-white/[0.06] pb-1">
                <span>{hoveredTarget.name}</span>
                <span className="text-[10px] text-slate-400 font-normal">{hoveredTarget.flag_country}</span>
              </div>
              <div className="text-[10px] text-slate-400 space-y-0.5 pt-0.5">
                <p>MMSI: <span className="text-slate-200">{hoveredTarget.mmsi}</span> · TYPE: <span className="text-slate-200">{hoveredTarget.vessel_type}</span></p>
                <p>SPEED: <span className="text-slate-200 tabular-nums">{hoveredTarget.last_known_point?.sog} kts</span> · COURSE: <span className="text-slate-200 tabular-nums">{hoveredTarget.last_known_point?.cog}°</span></p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-rose-300 font-bold border-b border-white/[0.06] pb-1">
                <span>SAR Contact {hoveredTarget.id}</span>
                <span className="text-[10px] text-slate-400 font-normal">Sentinel-1</span>
              </div>
              <div className="text-[10px] text-slate-400 pt-0.5">
                <p>CONFIDENCE: <span className="text-slate-200">{Math.round(hoveredTarget.confidence * 100)}%</span></p>
                <p>STATUS: <span className="text-rose-400 font-semibold">{hoveredTarget.is_dark_vessel ? 'Unmatched Dark Vessel' : 'Matched AIS'}</span></p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
