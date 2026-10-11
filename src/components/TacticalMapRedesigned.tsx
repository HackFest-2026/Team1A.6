import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Minimize2,
  Layers,
  X,
  Compass,
  Satellite,
  ShieldAlert,
  Ship,
  Eye,
  Info,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  FileText,
  Clock,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp,
  Shield,
  Anchor,
  Share2,
  RotateCcw,
  Menu,
  Check,
} from 'lucide-react';

export interface MapLayerConfig {
  vesselPositions: boolean;
  vesselTracks: boolean;
  aisReportingGaps: boolean;
  sarDetections: boolean;
  unmatchedDarkContacts: boolean;
  stsEncounters: boolean;
  suspiciousMovements: boolean;
  zoneAlerts: boolean;
  maritimeBoundaries: boolean;
  restrictedZones: boolean;
  coordinateGrid: boolean;
  radarRangeRings: boolean;
  sarSwathOverlay: boolean;
}

export const DEFAULT_MAP_LAYERS: MapLayerConfig = {
  vesselPositions: true,
  vesselTracks: true,
  aisReportingGaps: true,
  sarDetections: true,
  unmatchedDarkContacts: true,
  stsEncounters: true,
  suspiciousMovements: false,
  zoneAlerts: true,
  maritimeBoundaries: true,
  restrictedZones: true,
  coordinateGrid: false,
  radarRangeRings: false,
  sarSwathOverlay: true, // Show realistic Sentinel-1 satellite SAR swath raster by default
};

interface TacticalMapRedesignedProps {
  vessels: Vessel[];
  tracks: Record<string, Track>;
  detections: Detection[];
  zones: Zone[];
  alerts: Alert[];
  selectedTargetId: string | null;
  onSelectTarget: (id: string) => void;
  layers: MapLayerConfig;
  onUpdateLayers: (layers: MapLayerConfig) => void;
  activeQuickFilter?: 'ALL' | 'DARK' | 'CRITICAL' | 'STS';
  onQuickFilterChange?: (filter: 'ALL' | 'DARK' | 'CRITICAL' | 'STS') => void;
  onInvestigateTarget?: (targetId: string) => void;
  onOpenBriefing?: () => void;
}

const LON_MIN = 65.5;
const LON_MAX = 72.5;
const LAT_MIN = 19.5;
const LAT_MAX = 24.2;

// Vessel photo selector based on real assets
const getVesselPhoto = (vesselId: string, vesselType: string) => {
  if (vesselId.includes('ciudad') || vesselType === 'passenger') {
    return '/images/ferry.jpg';
  }
  if (vesselId.includes('sea-dragon') || vesselId.includes('olympic-spirit') || vesselType === 'tanker') {
    return '/images/tanker.jpg';
  }
  if (vesselId.includes('samarth') || vesselType === 'military') {
    return '/images/patrol.jpg';
  }
  return '/images/cargo.jpg';
};

export const TacticalMapRedesigned: React.FC<TacticalMapRedesignedProps> = ({
  vessels,
  tracks,
  detections,
  zones,
  alerts,
  selectedTargetId,
  onSelectTarget,
  layers,
  onUpdateLayers,
  activeQuickFilter = 'ALL',
  onQuickFilterChange,
  onInvestigateTarget,
  onOpenBriefing,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [searchFilter, setSearchFilter] = useState('');
  const [isLayerDrawerOpen, setIsLayerDrawerOpen] = useState(false);
  const [showRiskSummary, setShowRiskSummary] = useState(true);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [showSeaVantageFilter, setShowSeaVantageFilter] = useState(false);
  const [seaVantageTab, setSeaVantageTab] = useState<'fleet' | 'company'>('fleet');
  const [isShipToggleOn, setIsShipToggleOn] = useState(true);
  const [selectedFleetFilter, setSelectedFleetFilter] = useState<string>('all');
  
  // Accordion states for ST Engineering Popover (Image 2)
  const [isAisSarExpanded, setIsAisSarExpanded] = useState(true);
  const [isVesselInfoExpanded, setIsVesselInfoExpanded] = useState(true);
  const [isSarDataExpanded, setIsSarDataExpanded] = useState(true);
  const [activeTrackVisible, setActiveTrackVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Synchronize fullscreen state with browser API
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          containerRef.current.requestFullscreen().catch(() => {
            document.documentElement.requestFullscreen().catch(console.warn);
          });
        } else {
          document.documentElement.requestFullscreen().catch(console.warn);
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(console.warn);
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  // Coordinate projection from WGS-84 to 1000x800 SVG canvas
  const project = (lon: number, lat: number) => {
    const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * 1000;
    const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 800;
    return { x, y };
  };

  // Western India / Saurashtra / Gujarat coastline geometry
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

  // Filter contacts by quick filter, search & SeaVantage checklist
  const visibleVessels = useMemo(() => {
    return vessels.filter((v) => {
      if (!isShipToggleOn) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        if (
          !v.name.toLowerCase().includes(q) &&
          !v.mmsi.toLowerCase().includes(q) &&
          !v.flag_country.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (selectedFleetFilter === 'india' && v.flag_country !== 'India') return false;
      if (selectedFleetFilter === 'spain' && v.flag_country !== 'Spain') return false;
      if (selectedFleetFilter === 'sanctioned' && !v.is_sanctioned && v.id !== 'vessel-sea-dragon') return false;

      if (activeQuickFilter === 'ALL') return true;
      const alert = alerts.find((a) => a.vessel_id === v.id);
      if (activeQuickFilter === 'CRITICAL') return alert?.threat_level === 'CRITICAL';
      if (activeQuickFilter === 'STS')
        return alert?.findings.some((f) => f.rule_id === 'rendezvous');
      if (activeQuickFilter === 'DARK') return false;
      return true;
    });
  }, [vessels, alerts, activeQuickFilter, searchFilter, isShipToggleOn, selectedFleetFilter]);

  const visibleDetections = useMemo(() => {
    return detections.filter((d) => {
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        if (!d.id.toLowerCase().includes(q) && !d.source_scene_id.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (selectedFleetFilter === 'india' || selectedFleetFilter === 'spain') return false;
      if (activeQuickFilter === 'ALL') return true;
      if (activeQuickFilter === 'DARK') return d.is_dark_vessel;
      if (activeQuickFilter === 'CRITICAL') return d.is_dark_vessel;
      return false;
    });
  }, [detections, activeQuickFilter, searchFilter, selectedFleetFilter]);

  // Selected target metadata
  const selectedVessel = vessels.find((v) => v.id === selectedTargetId);
  const selectedDetection = detections.find((d) => d.id === selectedTargetId);
  const selectedAlert = alerts.find(
    (a) => a.id === selectedTargetId || a.vessel_id === selectedTargetId
  );

  // Projected popover anchor coordinate in SVG coordinate space (0-1000, 0-800)
  const popoverAnchor = useMemo(() => {
    if (selectedVessel && selectedVessel.last_known_point) {
      return project(selectedVessel.last_known_point.lon, selectedVessel.last_known_point.lat);
    }
    if (selectedDetection) {
      return project(selectedDetection.lon, selectedDetection.lat);
    }
    return null;
  }, [selectedVessel, selectedDetection]);

  const toggleLayer = (key: keyof MapLayerConfig) => {
    onUpdateLayers({
      ...layers,
      [key]: !layers[key],
    });
  };

  // Convert SVG coordinates to percentage for responsiveness
  const anchorPctX = popoverAnchor ? (popoverAnchor.x / 1000) * 100 : 50;
  const anchorPctY = popoverAnchor ? (popoverAnchor.y / 800) * 100 : 50;
  // Position card above the marker if in lower half of screen, otherwise below
  const isCardAbove = anchorPctY > 40;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#070d1e] overflow-hidden select-none font-sans"
    >
      {/* 1. TOP FLOATING BRAND & SEARCH BAR (Image 1 & Image 2 style) */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Floating Search Pill */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#0c1428]/92 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/[0.12] shadow-2xl w-80 lg:w-96 text-xs transition-all">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search locations, ships, MMSI..."
            className="w-full bg-transparent border-none text-slate-100 placeholder:text-slate-400 focus:outline-none text-xs"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Quick Filter Pills (Images 1, 2, 4) */}
        {onQuickFilterChange && (
          <div className="pointer-events-auto hidden md:flex items-center gap-1 bg-[#0c1428]/92 backdrop-blur-md px-2 py-1 rounded-full border border-white/[0.12] shadow-2xl text-xs font-medium">
            {(
              [
                { id: 'ALL', label: `All Ships (${vessels.length + detections.length})` },
                { id: 'DARK', label: `Dark Vessels (${detections.filter((d) => d.is_dark_vessel).length})` },
                { id: 'STS', label: 'STS Rendezvous' },
                { id: 'CRITICAL', label: `Critical Alerts (${alerts.filter((a) => a.threat_level === 'CRITICAL').length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => onQuickFilterChange(tab.id)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  activeQuickFilter === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Right: Quick Tools */}
        <div className="pointer-events-auto flex items-center gap-2">
          {selectedTargetId && (
            <button
              onClick={() => onSelectTarget('')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold transition-colors shadow-lg"
            >
              <X className="w-3.5 h-3.5" />
              Clear Focus
            </button>
          )}

          <button
            onClick={() => setShowSeaVantageFilter(!showSeaVantageFilter)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-lg flex items-center gap-1.5 border ${
              showSeaVantageFilter
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-[#0c1428]/90 border-white/[0.1] text-slate-300 hover:text-white'
            }`}
            title="Toggle SeaVantage Fleet Filter"
          >
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            Fleet Filter
          </button>

          <button
            onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-lg flex items-center gap-1.5 border ${
              showNotificationsDrawer
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-[#0c1428]/90 border-white/[0.1] text-slate-300 hover:text-white'
            }`}
            title="Toggle Notifications Drawer (Image 4)"
          >
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            Alerts ({alerts.length})
          </button>

          <button
            onClick={() => setShowRiskSummary(!showRiskSummary)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-lg flex items-center gap-1.5 border ${
              showRiskSummary
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-[#0c1428]/90 border-white/[0.1] text-slate-300 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Risk Summary
          </button>
        </div>
      </div>

      {/* 2. FLOATING RIGHT MAP TOOL DOCK (Images 1, 2, 3 style) */}
      <div className="absolute top-16 right-3 z-30 flex flex-col gap-1.5 bg-[#0c1428]/92 backdrop-blur-md p-1.5 rounded-xl border border-white/[0.12] shadow-2xl">
        <button
          onClick={() => setIsLayerDrawerOpen(!isLayerDrawerOpen)}
          className={`p-2 rounded-lg transition-colors ${
            isLayerDrawerOpen ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-white/[0.06]'
          }`}
          title="Layer Management"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={() => toggleLayer('sarSwathOverlay')}
          className={`p-2 rounded-lg transition-colors ${
            layers.sarSwathOverlay ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-white/[0.06]'
          }`}
          title="Toggle Sentinel-1 SAR Swath Overlay (ST Engineering Image 2)"
        >
          <Satellite className="w-4 h-4" />
        </button>

        <button
          onClick={() => toggleLayer('vesselTracks')}
          className={`p-2 rounded-lg transition-colors ${
            layers.vesselTracks ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:bg-white/[0.06]'
          }`}
          title="Toggle Historical Trajectory Tracks"
        >
          <Compass className="w-4 h-4" />
        </button>

        <div className="w-full h-px bg-white/[0.1] my-0.5" />

        <button
          onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={toggleFullscreen}
          className={`p-2 rounded-lg transition-colors ${
            isFullscreen ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          onClick={() => {
            setZoomLevel(1.0);
            setPanOffset({ x: 0, y: 0 });
          }}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
          title="Reset Map Center"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 3. FLOATING SEAVANTAGE FLEET & COMPANY FILTER PANEL (Image 3 style) */}
      {showSeaVantageFilter && (
        <div className="absolute top-16 right-16 z-30 w-72 bg-[#0c1428]/95 backdrop-blur-md border border-white/[0.14] rounded-2xl shadow-2xl overflow-hidden text-xs">
          {/* Header with Fleet / Company Tabs */}
          <div className="bg-[#101b33] p-1 flex border-b border-white/[0.08]">
            <button
              onClick={() => setSeaVantageTab('fleet')}
              className={`flex-1 py-1.5 text-center font-bold rounded-xl transition-all ${
                seaVantageTab === 'fleet' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fleet
            </button>
            <button
              onClick={() => setSeaVantageTab('company')}
              className={`flex-1 py-1.5 text-center font-bold rounded-xl transition-all ${
                seaVantageTab === 'company' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Company
            </button>
          </div>

          <div className="p-3.5 space-y-3">
            {/* Ship Toggle Switch */}
            <div className="flex items-center justify-between py-1">
              <span className="font-semibold text-slate-200">Ship Layer</span>
              <button
                onClick={() => setIsShipToggleOn(!isShipToggleOn)}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  isShipToggleOn ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {/* Sub-search */}
            <div className="flex items-center gap-2 bg-[#060b17] px-2.5 py-1.5 rounded-lg border border-white/[0.08]">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter fleet..."
                className="w-full bg-transparent border-none text-slate-100 placeholder:text-slate-500 focus:outline-none text-xs"
              />
            </div>

            {/* Checkbox Hierarchy */}
            <div className="space-y-1.5 font-sans pt-1">
              <label
                onClick={() => setSelectedFleetFilter('all')}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-slate-200"
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                  selectedFleetFilter === 'all' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-600'
                }`}>
                  {selectedFleetFilter === 'all' && <Check className="w-3 h-3" />}
                </div>
                <span>All Vessels ({vessels.length})</span>
              </label>

              <div className="pl-5 space-y-1 text-slate-300">
                <label
                  onClick={() => setSelectedFleetFilter('india')}
                  className="flex items-center gap-2 p-1 rounded hover:bg-white/[0.04] cursor-pointer"
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                    selectedFleetFilter === 'india' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-600'
                  }`}>
                    {selectedFleetFilter === 'india' && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span>India Flagged (SAMARTH, ARABIAN GULF)</span>
                </label>

                <label
                  onClick={() => setSelectedFleetFilter('spain')}
                  className="flex items-center gap-2 p-1 rounded hover:bg-white/[0.04] cursor-pointer"
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                    selectedFleetFilter === 'spain' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-600'
                  }`}>
                    {selectedFleetFilter === 'spain' && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span>Spain (CIUDAD DE FELICIDAD)</span>
                </label>

                <label
                  onClick={() => setSelectedFleetFilter('sanctioned')}
                  className="flex items-center gap-2 p-1 rounded hover:bg-white/[0.04] cursor-pointer"
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                    selectedFleetFilter === 'sanctioned' ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-600'
                  }`}>
                    {selectedFleetFilter === 'sanctioned' && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span className="text-rose-300 font-medium">Sanctioned / Shadow Fleet</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FLOATING MERIDIA NOTIFICATIONS DRAWER (Image 4 left rail) */}
      {showNotificationsDrawer && (
        <div className="absolute top-16 left-3 z-30 w-76 lg:w-80 bg-[#0c1428]/95 backdrop-blur-md border border-white/[0.14] rounded-2xl shadow-2xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">Notifications</span>
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold">
                {alerts.length}
              </span>
            </div>
            <button
              onClick={() => setShowNotificationsDrawer(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {alerts.map((al) => (
              <div
                key={al.id}
                onClick={() => {
                  onSelectTarget(al.vessel_id || al.id);
                  if (onInvestigateTarget) onInvestigateTarget(al.id);
                }}
                className="p-2.5 rounded-xl bg-[#070b16] hover:bg-[#11182c] border border-white/[0.06] cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      al.threat_level === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : al.threat_level === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {al.threat_level}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {al.vessel_name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 line-clamp-2">
                  {al.findings[0]?.rule_name || al.primary_rule}
                </p>
                <span className="text-[9px] text-slate-500 block font-mono">
                  {new Date(al.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. FLOATING MERIDIA RISK SUMMARY CARD (Image 4 style) */}
      {showRiskSummary && (
        <div className="absolute top-16 left-3 lg:left-88 z-20 w-80 lg:w-84 bg-[#0c1428]/95 backdrop-blur-md border border-white/[0.12] rounded-2xl shadow-2xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">Risk Summary</span>
              <span className="text-[10px] font-mono text-slate-400">08 Oct 2026</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono">
              Warning
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            A positional discrepancy near INS Okha exclusion perimeter suggests intentional transponder manipulation. An uncoordinated Ship-to-Ship (STS) rendezvous between MT SEA DRAGON and sanctioned tanker MT OLYMPIC SPIRIT was logged.
          </p>

          {/* Checklist items matching Image 4 */}
          <div className="space-y-1.5 pt-2 border-t border-white/[0.06] text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Ship &amp; Flag Watchlist</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                OFAC MATCH
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Ship Movement History</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                Warning (14h Gap)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">STS Rendezvous Event</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                Critical (234m)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Port State Control History</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                OK
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {onOpenBriefing && (
              <button
                onClick={onOpenBriefing}
                className="flex-1 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate SITREP
              </button>
            )}
            <button
              onClick={() => setShowRiskSummary(false)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-medium transition-colors"
            >
              Hide
            </button>
          </div>
        </div>
      )}

      {/* 6. LAYER CONTROL DRAWER */}
      {isLayerDrawerOpen && (
        <div className="absolute top-16 right-16 z-30 w-72 bg-[#0c1428]/95 backdrop-blur-md border border-white/[0.12] rounded-2xl shadow-2xl p-4 text-xs space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Map Layer Controls
            </h4>
            <button
              onClick={() => setIsLayerDrawerOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Satellite &amp; Radar Swath
              </span>
              <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
                <span>Sentinel-1 SAR Swath Patch</span>
                <input
                  type="checkbox"
                  checked={layers.sarSwathOverlay}
                  onChange={() => toggleLayer('sarSwathOverlay')}
                  className="rounded border-white/[0.2] bg-slate-800 text-cyan-500 focus:ring-0"
                />
              </label>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Vessel Activity
              </span>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
                  <span>Vessel Positions</span>
                  <input
                    type="checkbox"
                    checked={layers.vesselPositions}
                    onChange={() => toggleLayer('vesselPositions')}
                    className="rounded border-white/[0.2] bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
                  <span>Vessel Tracks</span>
                  <input
                    type="checkbox"
                    checked={layers.vesselTracks}
                    onChange={() => toggleLayer('vesselTracks')}
                    className="rounded border-white/[0.2] bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
                  <span>AIS Dark Gaps</span>
                  <input
                    type="checkbox"
                    checked={layers.aisReportingGaps}
                    onChange={() => toggleLayer('aisReportingGaps')}
                    className="rounded border-white/[0.2] bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                </label>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Satellite Intelligence
              </span>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
                  <span>SAR Detections</span>
                  <input
                    type="checkbox"
                    checked={layers.sarDetections}
                    onChange={() => toggleLayer('sarDetections')}
                    className="rounded border-white/[0.2] bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
                  <span>Dark Unmatched Contacts</span>
                  <input
                    type="checkbox"
                    checked={layers.unmatchedDarkContacts}
                    onChange={() => toggleLayer('unmatchedDarkContacts')}
                    className="rounded border-white/[0.2] bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                </label>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Anomalies &amp; Zones
              </span>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
                  <span>Ship-to-Ship (STS) Rendezvous</span>
                  <input
                    type="checkbox"
                    checked={layers.stsEncounters}
                    onChange={() => toggleLayer('stsEncounters')}
                    className="rounded border-white/[0.2] bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
                  <span>Naval Restricted Zones</span>
                  <input
                    type="checkbox"
                    checked={layers.restrictedZones}
                    onChange={() => toggleLayer('restrictedZones')}
                    className="rounded border-white/[0.2] bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
                  <span>EEZ Maritime Boundaries</span>
                  <input
                    type="checkbox"
                    checked={layers.maritimeBoundaries}
                    onChange={() => toggleLayer('maritimeBoundaries')}
                    className="rounded border-white/[0.2] bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MAIN SVG OCEAN CANVAS */}
      <svg
        viewBox="0 0 1000 800"
        className="w-full h-full cursor-crosshair"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: '50% 50%',
          transition: 'transform 0.15s ease-out',
        }}
        onClick={() => onSelectTarget('')}
      >
        <defs>
          {/* Subtle ocean grid pattern */}
          <pattern id="seaGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#131e36" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>

          {/* Realistic Sentinel-1 SAR Radar Grayscale Swath Texture (ST Engineering Image 2) */}
          <pattern id="sarSwathNoise" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#152033" />
            <circle cx="4" cy="5" r="1.5" fill="#2d3b55" opacity="0.6" />
            <circle cx="12" cy="14" r="1.8" fill="#3a4c6d" opacity="0.8" />
            <circle cx="17" cy="6" r="1.2" fill="#27344c" opacity="0.5" />
            <circle cx="8" cy="17" r="1.6" fill="#44597d" opacity="0.7" />
          </pattern>

          {/* Defense restricted hazard hatching */}
          <pattern
            id="restrictedMilitaryHatch2"
            width="12"
            height="12"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="12" stroke="#ef4444" strokeWidth="1.2" strokeOpacity="0.25" />
          </pattern>
        </defs>

        {/* Deep navy ocean backdrop */}
        <rect width="1000" height="800" fill="#070d1e" />
        <rect width="1000" height="800" fill="url(#seaGridPattern)" />

        {/* Realistic Sentinel-1 SAR Satellite Swath footprint (ST Engineering Image 2) */}
        {layers.sarSwathOverlay && (
          <g>
            <polygon
              points={`${project(67.5, 22.8).x},${project(67.5, 22.8).y} ${project(69.8, 22.9).x},${project(69.8, 22.9).y} ${project(69.5, 21.6).x},${project(69.5, 21.6).y} ${project(67.2, 21.5).x},${project(67.2, 21.5).y}`}
              fill="url(#sarSwathNoise)"
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="4 4"
              strokeOpacity="0.4"
            />
            <text
              x={project(67.4, 21.6).x + 10}
              y={project(67.4, 21.6).y - 8}
              fill="#38bdf8"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              opacity="0.8"
            >
              SENTINEL-1 IW SAR SWATH FOOTPRINT (COPERNICUS ESA)
            </text>
          </g>
        )}

        {/* Coastline Shoreline and Land Mass (Matching Image 1 Geographic styling) */}
        <path
          d={coastlineSvgPath}
          fill="#131b2d"
          stroke="#263654"
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Coastal Geographic Place Names (Image 1 style) */}
        <text
          x={project(70.2, 22.1).x}
          y={project(70.2, 22.1).y}
          fill="#475569"
          fontSize="11"
          fontWeight="bold"
          fontFamily="system-ui"
          letterSpacing="2"
        >
          INDIA (SAURASHTRA / GUJARAT)
        </text>
        <text x={project(68.95, 22.45).x} y={project(68.95, 22.45).y} fill="#64748b" fontSize="9" fontWeight="600">
          Okha Port
        </text>
        <text x={project(68.97, 22.24).x} y={project(68.97, 22.24).y} fill="#64748b" fontSize="9" fontWeight="600">
          Dwarka
        </text>
        <text x={project(69.6, 21.64).x} y={project(69.6, 21.64).y} fill="#64748b" fontSize="9" fontWeight="600">
          Porbandar
        </text>
        <text x={project(69.75, 22.82).x} y={project(69.75, 22.82).y} fill="#64748b" fontSize="9" fontWeight="600">
          Mundra Port
        </text>
        <text x={project(70.2, 22.95).x} y={project(70.2, 22.95).y} fill="#64748b" fontSize="9" fontWeight="600">
          Kandla Fairway
        </text>
        <text x={project(69.3, 22.65).x} y={project(69.3, 22.65).y} fill="#3b82f6" fontSize="10" fontStyle="italic" opacity="0.6">
          Gulf of Kutch
        </text>

        {/* Maritime Zones Polygons */}
        {zones.map((zone) => {
          if (zone.zone_type === 'eez' && !layers.maritimeBoundaries) return null;
          if (zone.zone_type !== 'eez' && !layers.restrictedZones) return null;

          const points = zone.coordinates[0];
          if (!points) return null;
          const svgPath =
            points
              .map((coord, i) => {
                const p = project(coord[0], coord[1]);
                return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
              })
              .join(' ') + ' Z';

          const isNaval = zone.zone_type === 'naval_restricted';
          const isChoke = zone.zone_type === 'chokepoint';

          return (
            <g key={zone.id}>
              <path
                d={svgPath}
                fill={isNaval ? 'url(#restrictedMilitaryHatch2)' : isChoke ? '#f59e0b08' : '#06b6d408'}
                stroke={isNaval ? '#ef4444' : isChoke ? '#f59e0b' : '#06b6d4'}
                strokeWidth={isNaval ? '1.5' : '1'}
                strokeDasharray={zone.zone_type === 'eez' ? '6 4' : 'none'}
                strokeOpacity={isNaval ? '0.6' : '0.35'}
              />
              {points[0] && (
                <text
                  x={project(points[0][0], points[0][1]).x + 8}
                  y={project(points[0][0], points[0][1]).y + 14}
                  fill={isNaval ? '#ef4444' : isChoke ? '#f59e0b' : '#38bdf8'}
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="system-ui"
                  opacity="0.8"
                >
                  {zone.name.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}

        {/* Historical Vessel Trajectories */}
        {layers.vesselTracks &&
          Object.entries(tracks).map(([vesselId, track]) => {
            const isSelected = selectedTargetId === vesselId;
            const points = track.points;
            if (!points || points.length < 2) return null;

            const dStr = points
              .map((pt, idx) => {
                const p = project(pt.lon, pt.lat);
                return `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
              })
              .join(' ');

            const isDarkTarget = vesselId === 'vessel-sea-dragon';

            return (
              <g key={`track-${vesselId}`} opacity={isSelected ? 1.0 : 0.45}>
                <path
                  d={dStr}
                  fill="none"
                  stroke={isSelected ? '#38bdf8' : isDarkTarget ? '#f43f5e' : '#475569'}
                  strokeWidth={isSelected ? '2.5' : '1.2'}
                  strokeDasharray={isDarkTarget ? '4 3' : 'none'}
                />
                {/* Waypoints with numbers (Image 4 style) */}
                {isSelected &&
                  points.map((pt, idx) => {
                    const p = project(pt.lon, pt.lat);
                    return (
                      <g key={idx}>
                        <circle cx={p.x} cy={p.y} r="3" fill="#38bdf8" stroke="#070d1e" strokeWidth="1" />
                        {idx % 2 === 0 && (
                          <text
                            x={p.x + 4}
                            y={p.y - 4}
                            fill="#94a3b8"
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            {idx + 1}
                          </text>
                        )}
                      </g>
                    );
                  })}
              </g>
            );
          })}

        {/* AIS 14-Hour Dark Gap Window (Dashed Red Line) */}
        {layers.aisReportingGaps && (
          <g>
            <line
              x1={project(68.2, 21.8).x}
              y1={project(68.2, 21.8).y}
              x2={project(68.9, 22.2).x}
              y2={project(68.9, 22.2).y}
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="6 3"
            />
            <rect
              x={(project(68.2, 21.8).x + project(68.9, 22.2).x) / 2 - 45}
              y={(project(68.2, 21.8).y + project(68.9, 22.2).y) / 2 - 10}
              width="90"
              height="18"
              rx="4"
              fill="#1e1018"
              stroke="#ef4444"
              strokeWidth="1"
            />
            <text
              x={(project(68.2, 21.8).x + project(68.9, 22.2).x) / 2}
              y={(project(68.2, 21.8).y + project(68.9, 22.2).y) / 2 + 2}
              fill="#f87171"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              14H AIS DARK GAP
            </text>
          </g>
        )}

        {/* Ship-to-Ship (STS) Rendezvous Visual Tether */}
        {layers.stsEncounters && (
          <g>
            <line
              x1={project(68.92, 22.18).x}
              y1={project(68.92, 22.18).y}
              x2={project(68.94, 22.17).x}
              y2={project(68.94, 22.17).y}
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            <rect
              x={(project(68.92, 22.18).x + project(68.94, 22.17).x) / 2 - 38}
              y={(project(68.92, 22.18).y + project(68.94, 22.17).y) / 2 - 18}
              width="76"
              height="16"
              rx="4"
              fill="#1c160a"
              stroke="#f59e0b"
              strokeWidth="1"
            />
            <text
              x={(project(68.92, 22.18).x + project(68.94, 22.17).x) / 2}
              y={(project(68.92, 22.18).y + project(68.94, 22.17).y) / 2 - 7}
              fill="#fbbf24"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              STS (234m)
            </text>
          </g>
        )}

        {/* SAR Radar Detections (Square / Diamond markers) */}
        {layers.sarDetections &&
          visibleDetections.map((det) => {
            const p = project(det.lon, det.lat);
            const isSelected = selectedTargetId === det.id;
            const isDark = det.is_dark_vessel;

            return (
              <g
                key={det.id}
                transform={`translate(${p.x}, ${p.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTarget(det.id);
                }}
                className="cursor-pointer group"
              >
                {/* Generous invisible hit circle for instant responsiveness */}
                <circle r="22" fill="transparent" />

                {/* Pulsing ring for dark vessels */}
                {isDark && (
                  <circle
                    r="14"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeOpacity="0.5"
                    className="animate-ping"
                  />
                )}

                {/* Selected focus ring */}
                {isSelected && (
                  <circle
                    r="18"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                )}

                {/* Diamond marker oriented like Image 2 */}
                <polygon
                  points="0,-8 7,0 0,8 -7,0"
                  fill={isDark ? '#ef4444' : '#38bdf8'}
                  stroke="#070d1e"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

        {/* Directional Vessel Arrow Markers (Images 1, 2, 3 style) */}
        {layers.vesselPositions &&
          visibleVessels.map((vessel) => {
            if (!vessel.last_known_point) return null;
            const p = project(vessel.last_known_point.lon, vessel.last_known_point.lat);
            const isSelected = selectedTargetId === vessel.id;
            const alert = alerts.find((a) => a.vessel_id === vessel.id);
            const isCritical = alert?.threat_level === 'CRITICAL';
            const isHigh = alert?.threat_level === 'HIGH';
            const heading = vessel.last_known_point.heading || vessel.last_known_point.cog || 0;

            // Colors: Green for nominal, cyan for coast guard, red for critical, amber for warning
            const arrowColor = isCritical
              ? '#ef4444'
              : isHigh
              ? '#f59e0b'
              : vessel.vessel_type === 'military'
              ? '#38bdf8'
              : vessel.vessel_type === 'passenger'
              ? '#eab308' // Golden yellow for passenger (Image 1)
              : '#22c55e'; // Vibrant green matching ST Engineering & MarineTraffic!

            return (
              <g
                key={vessel.id}
                transform={`translate(${p.x}, ${p.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTarget(vessel.id);
                }}
                className="cursor-pointer group"
              >
                {/* Generous invisible hit circle for instant responsiveness */}
                <circle r="22" fill="transparent" />

                {/* Selected halo and compass ring (Image 1 blue halo) */}
                {isSelected && (
                  <g>
                    <circle r="20" fill="#38bdf8" fillOpacity="0.18" />
                    <circle
                      r="18"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                    <circle r="24" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.5" />
                  </g>
                )}

                {/* Directional Arrow Head (Exact geometry from Images 1 & 2) */}
                <g transform={`rotate(${heading})`}>
                  <polygon
                    points="0,-11 7,9 0,5 -7,9"
                    fill={arrowColor}
                    stroke="#070d1e"
                    strokeWidth="1.5"
                  />
                </g>
              </g>
            );
          })}
      </svg>

      {/* 8. TETHERED INSPECTION POPOVER CARDS (THE SIGNATURE FEATURE OF IMAGES 1 & 2) */}
      {selectedVessel && popoverAnchor && (
        <div
          className="absolute z-40 w-96 max-w-[calc(100vw-2rem)] transition-all pointer-events-auto"
          style={{
            left: `${Math.max(16, Math.min(anchorPctX, 84))}%`,
            top: `${Math.max(12, Math.min(anchorPctY, 78))}%`,
            transform: `translate(-50%, ${isCardAbove ? '-100%' : '18px'})`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card Body */}
          <div className="bg-[#0d1527]/96 backdrop-blur-md border border-white/[0.16] rounded-2xl shadow-2xl overflow-hidden text-xs text-slate-200">
            {/* Top Vessel Photo Thumbnail (Images 1 & 2) */}
            <div className="relative h-36 w-full overflow-hidden bg-slate-900">
              <img
                src={getVesselPhoto(selectedVessel.id, selectedVessel.vessel_type)}
                alt={selectedVessel.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d1527] via-transparent to-black/40" />

              {/* Close button */}
              <button
                onClick={() => onSelectTarget('')}
                className="absolute top-2.5 right-2.5 p-1 rounded-full bg-black/60 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Floating Vessel Title Over Photo */}
              <div className="absolute bottom-2 left-3 right-3">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                  {selectedVessel.vessel_type.toUpperCase()} · FLAG: {selectedVessel.flag_country.toUpperCase()}{' '}
                  {selectedVessel.flag_country === 'Spain' ? '🇪🇸' : selectedVessel.flag_country === 'India' ? '🇮🇳' : '🇱🇷'}
                </span>
                <h2 className="text-base font-bold text-white tracking-wide">
                  {selectedVessel.name}
                </h2>
              </div>
            </div>

            {/* IF PASSENGER VESSEL (CIUDAD DE FELICIDAD) -> RENDER IMAGE 1 REPLICA */}
            {selectedVessel.vessel_type === 'passenger' || selectedVessel.id.includes('felicidad') ? (
              <div className="p-4 space-y-3">
                {/* 3 Metrics Row (Nav status, Speed/Course, Draught) */}
                <div className="grid grid-cols-3 gap-2 bg-[#080d1a] p-2.5 rounded-xl border border-white/[0.06] text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block text-[9px]">Navigational status</span>
                    <span className="text-slate-200 font-semibold block truncate">Underway Using Engine</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Speed / Course</span>
                    <span className="text-cyan-300 font-semibold">18.3kn / 90°</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Draught</span>
                    <span className="text-slate-200 font-semibold">6.2m</span>
                  </div>
                </div>

                {/* 3 Buttons Row: [Menu] [Add to fleet] [Vessel details] (Image 1 style) */}
                <div className="flex gap-2 items-center">
                  <button className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                    <Menu className="w-4 h-4" />
                  </button>
                  <button className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow">
                    <Shield className="w-3.5 h-3.5" />
                    Add to fleet
                  </button>
                  <button
                    onClick={() => {
                      if (onInvestigateTarget && selectedAlert) onInvestigateTarget(selectedAlert.id);
                    }}
                    className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
                  >
                    Vessel details
                  </button>
                </div>

                {/* Departure & Arrival Route Progress Bar (Image 1 style) */}
                <div className="p-3 rounded-xl bg-[#080d1a] border border-white/[0.06] space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <div>
                      <span className="text-slate-500 block">Departure</span>
                      <span className="text-slate-200 font-bold">VLC (ES)</span>
                      <span className="text-slate-400 block">03/11/2025 11:09 (UTC +1)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Arrival</span>
                      <span className="text-cyan-300 font-bold">PMI (ES)</span>
                      <span className="text-slate-400 block">04/11/2025 21:09 (UTC +1)</span>
                    </div>
                  </div>

                  {/* Route track bar */}
                  <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="absolute left-0 top-0 h-full w-[65%] bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" />
                  </div>

                  <span className="text-[9.5px] text-slate-500 block text-center font-mono">
                    Received 7 minutes ago (AIS source: Terrestrial)
                  </span>
                </div>
              </div>
            ) : (
              /* IF TANKER OR DEFENSE ASSET -> RENDER ST ENGINEERING GEO-INSIGHTS REPLICA (IMAGE 2) */
              <div className="p-4 space-y-3">
                <div className="text-[10px] font-mono text-slate-400 pb-1 border-b border-white/[0.06]">
                  Received at May 22, 2023, 11:17:39 UTC
                </div>

                {/* Collapsible Accordion 1: AIS & SAR Data (Image 2 format) */}
                <div className="rounded-xl bg-[#080d1a] border border-white/[0.06] overflow-hidden">
                  <button
                    onClick={() => setIsAisSarExpanded(!isAisSarExpanded)}
                    className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-white/[0.02]"
                  >
                    <span className="flex items-center gap-1.5 font-sans">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      AIS &amp; SAR Data
                    </span>
                    {isAisSarExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </button>

                  {isAisSarExpanded && (
                    <div className="p-3 pt-0 text-xs font-mono">
                      <table className="w-full text-left">
                        <thead className="text-[10px] text-slate-500 border-b border-white/[0.04]">
                          <tr>
                            <th className="pb-1 font-normal">Metric</th>
                            <th className="pb-1 font-normal text-cyan-400">AIS</th>
                            <th className="pb-1 font-normal text-slate-300">SAR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04] text-slate-300 text-[11px]">
                          <tr>
                            <td className="py-1.5 text-slate-400 font-sans">Course</td>
                            <td className="py-1.5 text-cyan-300">{selectedVessel.last_known_point?.cog ?? 248.2}°</td>
                            <td className="py-1.5 text-slate-200">66.4° / 246.4°</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 text-slate-400 font-sans">Dimensions</td>
                            <td className="py-1.5 text-cyan-300">{selectedVessel.length_m ?? 183} × {selectedVessel.width_m ?? 32} m</td>
                            <td className="py-1.5 text-slate-200">203.9 × 61.8 m</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Collapsible Accordion 2: Vessel Info (Image 2 format) */}
                <div className="rounded-xl bg-[#080d1a] border border-white/[0.06] overflow-hidden">
                  <button
                    onClick={() => setIsVesselInfoExpanded(!isVesselInfoExpanded)}
                    className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-white/[0.02]"
                  >
                    <span className="flex items-center gap-1.5 font-sans">
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                      Vessel Info
                    </span>
                    {isVesselInfoExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </button>

                  {isVesselInfoExpanded && (
                    <div className="p-3 pt-0 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-slate-500 block">MMSI</span>
                        <span className="text-slate-200 font-semibold">{selectedVessel.mmsi}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">IMO</span>
                        <span className="text-slate-200 font-semibold">{selectedVessel.imo || '9801574'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">Call Sign</span>
                        <span className="text-slate-200 font-semibold">{selectedVessel.callsign || 'VRTJ5'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">Gross Tonnage</span>
                        <span className="text-slate-200 font-semibold">29,260 GT</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Past Track & Vessel Details */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setActiveTrackVisible(!activeTrackVisible)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    Past Track
                  </button>

                  {onInvestigateTarget && selectedAlert && (
                    <button
                      onClick={() => onInvestigateTarget(selectedAlert.id)}
                      className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Vessel Details
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* White Tether V-bracket (ST Engineering Image 2 signature style) */}
          {isCardAbove ? (
            <div className="flex justify-center -mt-0.5">
              <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                <path d="M0 0 L12 11 L24 0" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <div className="flex justify-center -mb-0.5 -mt-3">
              <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                <path d="M0 12 L12 1 L24 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* 9. TETHERED DARK VESSEL CARD (Exact replica of ST Engineering in Image 2!) */}
      {selectedDetection && popoverAnchor && (
        <div
          className="absolute z-40 w-80 max-w-[calc(100vw-2rem)] transition-all pointer-events-auto"
          style={{
            left: `${Math.max(16, Math.min(anchorPctX, 84))}%`,
            top: `${Math.max(12, Math.min(anchorPctY, 78))}%`,
            transform: `translate(-50%, ${isCardAbove ? '-100%' : '18px'})`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card Body */}
          <div className="bg-[#101828]/96 backdrop-blur-md border border-rose-500/40 rounded-2xl shadow-2xl overflow-hidden text-xs text-slate-200">
            {/* Dark Vessel Header */}
            <div className="p-3.5 bg-rose-950/50 border-b border-rose-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Dark Vessel
                </h3>
              </div>
              <button
                onClick={() => onSelectTarget('')}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3.5 py-1.5 bg-black/40 text-[10px] font-mono text-slate-400 border-b border-white/[0.04]">
              Received at May 22, 2023, 11:17:39 UTC
            </div>

            {/* SAR Data Table (exact ST Engineering format from Image 2!) */}
            <div className="p-3.5 space-y-3 font-mono text-xs">
              <div className="rounded-xl bg-[#080d19] border border-white/[0.06] overflow-hidden">
                <button
                  onClick={() => setIsSarDataExpanded(!isSarDataExpanded)}
                  className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-white/[0.02]"
                >
                  <span className="flex items-center gap-1.5 font-sans">
                    <Radio className="w-3.5 h-3.5 text-rose-400" />
                    [•] SAR Data
                  </span>
                  {isSarDataExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {isSarDataExpanded && (
                  <div className="p-3 pt-0 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">SAR</span>
                      <span className="text-slate-200 font-bold">ResNet-50 Radar</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Course:</span>
                      <span className="text-slate-200 font-bold">179.2° / 359.2°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dimensions:</span>
                      <span className="text-rose-300 font-bold">
                        {selectedDetection.estimated_length_m || 101.8} × {selectedDetection.estimated_width_m || 28.3} m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Coordinates:</span>
                      <span className="text-slate-200">
                        {selectedDetection.lat.toFixed(5)}, {selectedDetection.lon.toFixed(5)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Polarization:</span>
                      <span className="text-cyan-300">{selectedDetection.polarization || 'VV'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-200 text-[11px] font-sans">
                No correlating AIS transponder match within 5.0 km / 60 min. Classified as non-cooperative dark contact.
              </div>

              {/* Action button */}
              {onInvestigateTarget && (
                <button
                  onClick={() => onInvestigateTarget(selectedDetection.id)}
                  className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Investigate Dark Vessel
                </button>
              )}
            </div>
          </div>

          {/* White Tether V-bracket (ST Engineering Image 2 signature style) */}
          {isCardAbove ? (
            <div className="flex justify-center -mt-0.5">
              <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                <path d="M0 0 L12 11 L24 0" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <div className="flex justify-center -mb-0.5 -mt-3">
              <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                <path d="M0 12 L12 1 L24 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* 10. BOTTOM GEODETIC SCALE & VESSEL TELEMETRY BAR (Exact Image 1 layout!) */}
      <div className="absolute bottom-2 left-3 right-3 z-20 pointer-events-none flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="bg-[#0c1428]/85 backdrop-blur px-3 py-1 rounded-full border border-white/[0.08]">
          <span className="text-slate-200 font-bold">29K Vessels</span>
          <span className="text-slate-600 mx-2">·</span>
          <span>39° 13.42 N</span>
          <span className="text-slate-600 mx-2">·</span>
          <span>4° 22.85 E</span>
          <span className="text-slate-600 mx-2">·</span>
          <span className="text-cyan-400">(22.247012, 68.954019)</span>
          <span className="text-slate-600 mx-2">·</span>
          <span>Saurashtra Sector</span>
        </div>

        {/* Bottom Right Floating Zoom Controller (Image 1 style) */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0c1428]/90 backdrop-blur px-2.5 py-1 rounded-full border border-white/[0.08] shadow-lg">
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
            className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.1] rounded transition-colors text-xs font-bold"
          >
            +
          </button>
          <span className="px-1.5 text-xs text-slate-200 font-bold">10</span>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
            className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.1] rounded transition-colors text-xs font-bold"
          >
            -
          </button>
          <div className="w-px h-3 bg-white/[0.15] mx-1" />
          <button
            onClick={toggleFullscreen}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/[0.1] rounded transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              setZoomLevel(1.0);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/[0.1] rounded transition-colors"
            title="Reset Map Center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
