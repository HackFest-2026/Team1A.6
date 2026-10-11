import React, { useState, useEffect } from 'react';
import {
  Plane,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Eye,
  EyeOff,
  Crosshair,
  ShieldAlert,
  Activity,
  Cpu,
  Compass,
  MapPin,
  ChevronRight,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Film,
  Camera,
} from 'lucide-react';
import { UavDetection, CameraMetadata, VisDroneCategory } from '../domain/models.ts';

interface ArmyUavWorkspaceProps {
  onAddDetectionsToMap?: (detections: any[]) => void;
}

const VISDRONE_CLASSES: VisDroneCategory[] = [
  'pedestrian',
  'people',
  'bicycle',
  'car',
  'van',
  'truck',
  'tricycle',
  'awning-tricycle',
  'bus',
  'motor',
];

export const ArmyUavWorkspace: React.FC<ArmyUavWorkspaceProps> = ({ onAddDetectionsToMap }) => {
  const [activeMediaTab, setActiveMediaTab] = useState<'image' | 'video'>('image');
  const [confThreshold, setConfThreshold] = useState<number>(0.50);
  const [enableTracking, setEnableTracking] = useState<boolean>(true);
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [selectedDetection, setSelectedDetection] = useState<UavDetection | null>(null);

  // Video playback simulation state
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Camera Georeferencing inputs
  const [cameraMeta, setCameraMeta] = useState<CameraMetadata>({
    cameraLat: 22.314,
    cameraLon: 68.825,
    altitudeM: 350,
    headingDeg: 45,
    pitchDeg: -80,
    fovDeg: 78,
  });
  const [enableGeoreferencing, setEnableGeoreferencing] = useState<boolean>(true);

  // Inference state
  const [isInferring, setIsInferring] = useState<boolean>(false);
  const [inferenceData, setInferenceData] = useState<any>(null);

  // Fetch initial inference
  const runInference = async () => {
    setIsInferring(true);
    try {
      if (activeMediaTab === 'image') {
        const res = await fetch('/api/uav/infer-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imagePath: 'UAV_RECON_AOI_KUTCH.JPG',
            confThreshold,
            cameraMetadata: enableGeoreferencing ? cameraMeta : null,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setInferenceData(data);
          if (data.detections && data.detections.length > 0) {
            setSelectedDetection(data.detections[0]);
            if (onAddDetectionsToMap) {
              onAddDetectionsToMap(data.detections.filter((d: any) => d.georeferenceStatus === 'GEOREFERENCED'));
            }
          }
        }
      } else {
        const res = await fetch('/api/uav/infer-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoPath: 'UAV_CONVOY_SURVEILLANCE.MP4',
            confThreshold,
            maxFrames: 30,
            enableTracking,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setInferenceData(data);
          setCurrentFrameIdx(0);
        }
      }
    } catch (err) {
      console.error('UAV inference error:', err);
    } finally {
      setIsInferring(false);
    }
  };

  useEffect(() => {
    runInference();
  }, [activeMediaTab, confThreshold, enableTracking, enableGeoreferencing]);

  // Video playback timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && inferenceData?.frames) {
      interval = setInterval(() => {
        setCurrentFrameIdx((prev) => {
          if (prev >= inferenceData.frames.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isPlaying, inferenceData]);

  const activeDetections: UavDetection[] =
    activeMediaTab === 'image'
      ? inferenceData?.detections || []
      : inferenceData?.frames?.[currentFrameIdx]?.detections || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050811] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Header Toolbar */}
      <div className="p-4 bg-[#0a1020] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-wide uppercase font-sans">
                Army / UAV Aerial Intelligence
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                VisDrone YOLOv8
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {inferenceData?.inference_mode || 'DEMO PIPELINE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tactical Drone Reconnaissance · Multi-Category Vehicle &amp; Personnel Detection · Video Tracking
            </p>
          </div>
        </div>

        {/* Media mode switch */}
        <div className="flex items-center gap-2 bg-[#060a14] p-1 rounded-xl border border-white/[0.08] text-xs font-medium">
          <button
            onClick={() => {
              setActiveMediaTab('image');
              setIsPlaying(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeMediaTab === 'image'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Still Image
          </button>
          <button
            onClick={() => {
              setActiveMediaTab('video');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeMediaTab === 'video'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Video Track (DeepSORT)
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Visual Viewport */}
        <div className="flex-1 flex flex-col bg-[#070b16] relative overflow-hidden border-r border-white/[0.08]">
          {/* Viewport Sub-header / Controls */}
          <div className="px-4 py-2.5 bg-[#090e1c] border-b border-white/[0.06] flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-mono text-[11px]">
                FEED: {activeMediaTab === 'image' ? 'UAV-OPTICAL-RECON-7.RAW' : 'UAV-IR-SURVEILLANCE-FLIR.MP4'}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 font-mono text-[11px]">1280 × 720 px</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400 font-mono text-[11px]">
                {activeDetections.length} Target Objects
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBoxes(!showBoxes)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] transition-colors ${
                  showBoxes ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-white/[0.1] text-slate-400'
                }`}
              >
                {showBoxes ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                Boxes
              </button>
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] transition-colors ${
                  showLabels ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'border-white/[0.1] text-slate-400'
                }`}
              >
                Labels
              </button>
            </div>
          </div>

          {/* SVG / Canvas Viewport */}
          <div className="flex-1 relative flex items-center justify-center p-4 bg-[#03060f] overflow-hidden">
            {/* Base Simulated Aerial Drone Camera Frame */}
            <div className="relative w-full max-w-4xl aspect-[16/9] bg-[#0b1326] rounded-xl overflow-hidden border border-white/[0.12] shadow-2xl">
              {/* Drone HUD Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4">
                <div className="flex justify-between font-mono text-[11px] text-cyan-400/80">
                  <span>ALT: {cameraMeta.altitudeM}M AGL</span>
                  <span>PITCH: {cameraMeta.pitchDeg}°</span>
                  <span>HDG: {cameraMeta.headingDeg}°</span>
                  <span>LAT: {cameraMeta.cameraLat?.toFixed(4)}N</span>
                  <span>LON: {cameraMeta.cameraLon?.toFixed(4)}E</span>
                </div>

                {/* Center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border border-cyan-400/40 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-75" />
                  </div>
                </div>

                <div className="flex justify-between font-mono text-[10px] text-slate-400">
                  <span>SENSOR: EO/IR TELEMETRY</span>
                  <span>VISDRONE YOLOV8 ENSEMBLE</span>
                </div>
              </div>

              {/* Synthetic Aerial Reconnaissance Background Scene */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1280 720">
                <defs>
                  <linearGradient id="groundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="50%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#1e1b4b" />
                  </linearGradient>
                </defs>
                <rect width="1280" height="720" fill="url(#groundGrad)" />

                {/* Road Network */}
                <path
                  d="M 0 350 L 1280 350"
                  stroke="#334155"
                  strokeWidth="110"
                  strokeLinecap="round"
                />
                <path
                  d="M 0 350 L 1280 350"
                  stroke="#94a3b8"
                  strokeWidth="4"
                  strokeDasharray="20 15"
                />
                <path
                  d="M 450 0 L 450 720"
                  stroke="#334155"
                  strokeWidth="80"
                  strokeLinecap="round"
                />

                {/* Detections Bounding Boxes */}
                {showBoxes &&
                  activeDetections.map((det) => {
                    const [x1, y1, x2, y2] = det.bbox;
                    const w = x2 - x1;
                    const h = y2 - y1;
                    const isSelected = selectedDetection?.id === det.id;

                    const isPerson = det.class === 'pedestrian' || det.class === 'people';
                    const isVehicle = det.class === 'car' || det.class === 'van' || det.class === 'truck' || det.class === 'bus';

                    const strokeColor = isPerson ? '#a855f7' : isVehicle ? '#38bdf8' : '#f59e0b';

                    return (
                      <g
                        key={det.id}
                        onClick={() => setSelectedDetection(det)}
                        className="cursor-pointer group"
                      >
                        <rect
                          x={x1}
                          y={y1}
                          width={w}
                          height={h}
                          fill={isSelected ? `${strokeColor}25` : `${strokeColor}10`}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? '3' : '1.8'}
                          rx="3"
                          className="transition-all"
                        />

                        {/* Tracker ID badge if tracking enabled */}
                        {det.tracker_id && (
                          <g>
                            <rect
                              x={x1}
                              y={y1 - 18}
                              width="50"
                              height="16"
                              rx="3"
                              fill="#090d1a"
                              stroke={strokeColor}
                              strokeWidth="1"
                            />
                            <text
                              x={x1 + 4}
                              y={y1 - 6}
                              fill={strokeColor}
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              TRK#{det.tracker_id}
                            </text>
                          </g>
                        )}

                        {/* Label Pill */}
                        {showLabels && (
                          <g>
                            <rect
                              x={x1}
                              y={y2 + 2}
                              width={w > 90 ? w : 90}
                              height="18"
                              rx="3"
                              fill="#090d1a"
                              stroke={strokeColor}
                              strokeWidth="1"
                            />
                            <text
                              x={x1 + 4}
                              y={y2 + 14}
                              fill="#f8fafc"
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {det.class} {(det.confidence * 100).toFixed(0)}%
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
              </svg>
            </div>
          </div>

          {/* Video Scrub Bar if in Video Mode */}
          {activeMediaTab === 'video' && inferenceData?.frames && (
            <div className="p-3 bg-[#090e1c] border-t border-white/[0.08] flex items-center gap-4 text-xs">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => setCurrentFrameIdx(0)}
                className="p-1.5 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex-1 flex items-center gap-3">
                <span className="font-mono text-[11px] text-slate-400">
                  F{currentFrameIdx + 1}/{inferenceData.frames.length}
                </span>
                <input
                  type="range"
                  min="0"
                  max={inferenceData.frames.length - 1}
                  value={currentFrameIdx}
                  onChange={(e) => setCurrentFrameIdx(parseInt(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="font-mono text-[11px] text-cyan-400">
                  {((currentFrameIdx / 25) * 1000).toFixed(0)} ms
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Parameters, Classes & Selected Object Inspection */}
        <div className="w-80 lg:w-96 bg-[#080d1a] p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs">
          {/* Controls Card */}
          <div className="p-3.5 rounded-xl bg-[#0c1426] border border-white/[0.08] space-y-3">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Detection &amp; Tracking Configuration
            </h3>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Confidence Threshold</span>
                <span className="font-mono text-amber-400">{(confThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.95"
                step="0.05"
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Multi-Object Tracking (DeepSORT)</span>
              <input
                type="checkbox"
                checked={enableTracking}
                onChange={(e) => setEnableTracking(e.target.checked)}
                className="rounded border-white/[0.2] bg-slate-800 text-amber-500 focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
              <span className="text-slate-300">Photogrammetric Georeferencing</span>
              <input
                type="checkbox"
                checked={enableGeoreferencing}
                onChange={(e) => setEnableGeoreferencing(e.target.checked)}
                className="rounded border-white/[0.2] bg-slate-800 text-cyan-500 focus:ring-0"
              />
            </div>
          </div>

          {/* Target Detection Breakdown by VisDrone Category */}
          <div className="p-3.5 rounded-xl bg-[#0c1426] border border-white/[0.08] space-y-2.5">
            <h4 className="font-bold text-slate-200 text-xs">VisDrone Category Census</h4>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              {VISDRONE_CLASSES.map((cls) => {
                const count = inferenceData?.class_counts?.[cls] || 0;
                return (
                  <div
                    key={cls}
                    className={`p-1.5 rounded-lg border flex items-center justify-between ${
                      count > 0
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-white/[0.02] border-white/[0.04] text-slate-500'
                    }`}
                  >
                    <span className="capitalize">{cls}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Contact Inspector */}
          {selectedDetection ? (
            <div className="p-3.5 rounded-xl bg-[#0c1426] border border-cyan-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 uppercase tracking-wide text-xs">
                  Target Inspection Dossier
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {selectedDetection.georeferenceStatus}
                </span>
              </div>

              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">ID:</span>
                  <span>{selectedDetection.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CLASS:</span>
                  <span className="text-amber-300 font-bold capitalize">{selectedDetection.className}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CONFIDENCE:</span>
                  <span className="text-emerald-400 font-bold">{(selectedDetection.confidence * 100).toFixed(1)}%</span>
                </div>
                {selectedDetection.trackerId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">TRACK ID:</span>
                    <span className="text-cyan-400 font-bold">#{selectedDetection.trackerId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">PIXEL BBOX:</span>
                  <span>[{selectedDetection.bbox.join(', ')}]</span>
                </div>

                {selectedDetection.geoCoordinate && (
                  <div className="pt-1.5 mt-1.5 border-t border-white/[0.06] text-cyan-300">
                    <div className="flex items-center gap-1 font-sans text-xs font-semibold mb-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      Calculated Coordinates (WGS-84)
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">LATITUDE:</span>
                      <span>{selectedDetection.geoCoordinate.lat}° N</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">LONGITUDE:</span>
                      <span>{selectedDetection.geoCoordinate.lon}° E</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-slate-500 text-xs">
              Click any bounding box in the viewport to inspect kinematic &amp; spatial parameters.
            </div>
          )}

          {/* Model Health / Latency Banner */}
          <div className="mt-auto p-3 rounded-xl bg-[#070b16] border border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>ENGINE LATENCY</span>
            <span className="text-emerald-400 font-bold">{inferenceData?.latency_ms || 42} ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
