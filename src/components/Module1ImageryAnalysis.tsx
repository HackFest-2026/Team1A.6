import React, { useState, useRef, useId } from 'react';
import {
  Upload,
  Satellite,
  Eye,
  Crosshair,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCw,
  Layers,
  Image as ImageIcon,
  Video,
  Sparkles,
  ShieldAlert,
  Compass,
  Zap,
} from 'lucide-react';
import { Detection } from '../domain/models.ts';

interface Module1ImageryAnalysisProps {
  onDetectionSaved: (newDet: any) => void;
  onFocusOnMap: (lat: number, lon: number) => void;
}

interface DetectedBox {
  id: string;
  label: string;
  category: 'vessel' | 'vehicle' | 'drone' | 'infrastructure';
  confidence: number;
  bbox: [number, number, number, number]; // [top, left, width, height] %
  estimatedLengthM: number;
  lat: number;
  lon: number;
  isDarkVessel: boolean;
  model: string;
}

const PRELOADED_FRAMES = [
  {
    id: 'frame-drone-okha-01',
    name: 'Tactical UAV-7 Optical Frame (INS Okha Approach)',
    type: 'Drone EO/IR Video Frame',
    sensor: 'Flir Boson 640 Thermal Optical',
    baseLat: 22.38,
    baseLon: 68.82,
    previewGradient: 'from-slate-900 via-indigo-950 to-slate-900',
    objects: [
      {
        id: 'det-opt-901',
        label: 'Fast Interceptor Craft (Speedboat)',
        category: 'vessel' as const,
        confidence: 0.94,
        bbox: [32, 28, 16, 22] as [number, number, number, number],
        estimatedLengthM: 19,
        lat: 22.382,
        lon: 68.824,
        isDarkVessel: true,
        model: 'YOLOv8-Naval Maritime Tactical',
      },
      {
        id: 'det-opt-902',
        label: 'Coastal Patrol Corvette',
        category: 'vessel' as const,
        confidence: 0.98,
        bbox: [55, 62, 22, 26] as [number, number, number, number],
        estimatedLengthM: 105,
        lat: 22.378,
        lon: 68.831,
        isDarkVessel: false,
        model: 'YOLOv8-Naval Maritime Tactical',
      },
    ],
  },
  {
    id: 'frame-sar-saurashtra-02',
    name: 'Sentinel-1 SAR Radar Chip (Saurashtra Basin)',
    type: 'Satellite Synthetic Aperture Radar',
    sensor: 'Sentinel-1 C-Band SAR (VV/VH)',
    baseLat: 22.25,
    baseLon: 68.86,
    previewGradient: 'from-blue-950 via-slate-950 to-cyan-950',
    objects: [
      {
        id: 'det-sar-801',
        label: 'Crude Oil Tanker (Non-Broadcasting)',
        category: 'vessel' as const,
        confidence: 0.95,
        bbox: [40, 42, 24, 30] as [number, number, number, number],
        estimatedLengthM: 278,
        lat: 22.252,
        lon: 68.861,
        isDarkVessel: true,
        model: 'AI2 Skylight Faster R-CNN (xView3 nov20-combo8)',
      },
    ],
  },
  {
    id: 'frame-drone-dhow-03',
    name: 'Drone High-Altitude Recon (Gulf of Kutch Fairway)',
    type: 'UAV High-Definition Optical Recon',
    sensor: 'Sony Alpha ILX-LR1 EO Optical Sensor',
    baseLat: 22.45,
    baseLon: 69.12,
    previewGradient: 'from-emerald-950 via-slate-900 to-teal-950',
    objects: [
      {
        id: 'det-opt-803',
        label: 'Motorized Wooden Dhow',
        category: 'vessel' as const,
        confidence: 0.89,
        bbox: [25, 50, 18, 18] as [number, number, number, number],
        estimatedLengthM: 28,
        lat: 22.454,
        lon: 69.123,
        isDarkVessel: true,
        model: 'Maritime Optical Multihead Detector',
      },
    ],
  },
];

export const Module1ImageryAnalysis: React.FC<Module1ImageryAnalysisProps> = ({
  onDetectionSaved,
  onFocusOnMap,
}) => {
  const [selectedFrameId, setSelectedFrameId] = useState<string>(PRELOADED_FRAMES[0].id);
  const [activeModel, setActiveModel] = useState<'yolov8' | 'xview3'>('yolov8');
  const [confidenceCutoff, setConfidenceCutoff] = useState<number>(0.75);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputId = useId();

  const currentFrame = PRELOADED_FRAMES.find((f) => f.id === selectedFrameId) || PRELOADED_FRAMES[0];

  const filteredDetections = currentFrame.objects.filter(
    (obj) => obj.confidence >= confidenceCutoff
  );

  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(
    currentFrame.objects[0]?.id || null
  );

  const selectedBox = currentFrame.objects.find((b) => b.id === selectedBoxId);

  // File Upload Handler (Simulates custom image or video frame extraction)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setSaveSuccessMsg(`Extracted frame from "${file.name}" & processed objects.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }, 600);
  };

  // Save detection results to backend and COP
  const handleSaveDetections = async () => {
    setIsProcessing(true);
    try {
      for (const obj of filteredDetections) {
        const payload = {
          id: obj.id,
          timestamp: new Date().toISOString(),
          lat: obj.lat,
          lon: obj.lon,
          source_scene_id: currentFrame.name,
          sensor_type: currentFrame.type.toLowerCase().includes('sar') ? 'sar' : 'optical',
          confidence: obj.confidence,
          estimated_length_m: obj.estimatedLengthM,
          is_dark_vessel: obj.isDarkVessel,
          detection_source: currentFrame.type,
          label: obj.label,
          bbox: obj.bbox,
        };

        const res = await fetch('/api/detections/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          onDetectionSaved(data.detection);
        }
      }

      setSaveSuccessMsg(`Successfully saved ${filteredDetections.length} detections to system!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error saving detections:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] overflow-y-auto bg-[#050811] text-slate-200 p-6 space-y-6 font-mono select-none custom-scrollbar">
      {/* Module Title Banner */}
      <div className="border-b border-white/[0.08] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Eye className="w-5 h-5" />
            </div>
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider font-['Chakra_Petch']">
              MODULE 1 — SATELLITE &amp; DRONE IMAGE ANALYSIS
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Upload imagery or drone video frames, detect ships/vehicles, display bounding boxes &amp; save detection results to system.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <label
            htmlFor={fileInputId}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-white/[0.1] flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Image / Video
          </label>
          <input
            id={fileInputId}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={handleSaveDetections}
            disabled={isProcessing || filteredDetections.length === 0}
            className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Detection Results
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded text-xs text-emerald-300 flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Frame Selection Rail */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRELOADED_FRAMES.map((frame) => {
          const isSelected = frame.id === selectedFrameId;
          return (
            <button
              key={frame.id}
              onClick={() => {
                setSelectedFrameId(frame.id);
                setSelectedBoxId(frame.objects[0]?.id || null);
              }}
              className={`p-3 text-left rounded-lg border transition-all ${
                isSelected
                  ? 'bg-cyan-950/25 border-cyan-500/60 ring-1 ring-cyan-500/40'
                  : 'bg-[#090d16] border-white/[0.08] hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase truncate">
                  {frame.type}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {frame.objects.length} Objects
                </span>
              </div>
              <div className="text-xs font-bold text-slate-100 truncate">
                {frame.name}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>Sensor: {frame.sensor.split(' ')[0]}</span>
                <span>
                  {frame.baseLat.toFixed(2)}°N, {frame.baseLon.toFixed(2)}°E
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Analysis Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Interactive Frame Canvas with Bounding Boxes */}
        <div className="lg:col-span-8 bg-[#090d16] border border-white/[0.08] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                FRAME DETECTION VIEWPORT — {currentFrame.name}
              </h3>
              <span className="text-[10px] text-slate-400">
                Resolution: 1920x1080 · Coordinate Center: [{currentFrame.baseLat}°N, {currentFrame.baseLon}°E]
              </span>
            </div>

            {/* Model Selector */}
            <div className="flex items-center bg-[#070b14] border border-white/[0.08] rounded p-0.5 text-[10px]">
              <button
                onClick={() => setActiveModel('yolov8')}
                className={`px-2 py-1 rounded font-semibold ${
                  activeModel === 'yolov8'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                YOLOv8 Maritime Drone
              </button>
              <button
                onClick={() => setActiveModel('xview3')}
                className={`px-2 py-1 rounded font-semibold ${
                  activeModel === 'xview3'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                xView3 Faster R-CNN (SAR)
              </button>
            </div>
          </div>

          {/* Interactive Simulation Frame Screen */}
          <div
            className={`relative aspect-video w-full rounded-lg border border-white/[0.1] overflow-hidden bg-gradient-to-br ${currentFrame.previewGradient} shadow-2xl flex items-center justify-center`}
          >
            {/* Visual background simulation grid lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

            {/* Water Waves and Ocean Texture Simulation */}
            <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
              <Satellite className="w-96 h-96 text-cyan-400/20" />
            </div>

            {/* Drone HUD Reticle */}
            <div className="absolute top-3 left-3 text-[10px] text-emerald-400 font-mono bg-black/60 px-2 py-1 rounded border border-emerald-500/30 pointer-events-none">
              LIVE SENSOR STREAM · FOV 45° · ALT: 3,200 FT
            </div>

            <div className="absolute bottom-3 left-3 text-[10px] text-slate-300 font-mono bg-black/60 px-2 py-1 rounded border border-white/[0.1] pointer-events-none">
              {currentFrame.sensor}
            </div>

            {/* Bounding Boxes */}
            {filteredDetections.map((box) => {
              const isSelected = box.id === selectedBoxId;
              const [top, left, width, height] = box.bbox;

              return (
                <div
                  key={box.id}
                  onClick={() => setSelectedBoxId(box.id)}
                  style={{
                    top: `${top}%`,
                    left: `${left}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                  className={`absolute border-2 cursor-pointer transition-all rounded ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.5)] z-20'
                      : box.isDarkVessel
                      ? 'border-rose-500 bg-rose-500/10 hover:border-rose-400'
                      : 'border-emerald-400 bg-emerald-400/10 hover:border-emerald-300'
                  }`}
                >
                  {/* Bounding Box Label Tag */}
                  <div
                    className={`absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-black flex items-center gap-1 shadow ${
                      isSelected
                        ? 'bg-cyan-300'
                        : box.isDarkVessel
                        ? 'bg-rose-400'
                        : 'bg-emerald-400'
                    }`}
                  >
                    <span>{box.label}</span>
                    <span className="opacity-80">({Math.round(box.confidence * 100)}%)</span>
                  </div>

                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white" />
                </div>
              );
            })}
          </div>

          {/* Lower status ribbon */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/[0.05]">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Dark / Non-Cooperative ({filteredDetections.filter((d) => d.isDarkVessel).length})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Cooperative / Verified ({filteredDetections.filter((d) => !d.isDarkVessel).length})
              </span>
            </div>

            <span className="text-[10px] text-slate-500">
              Click any bounding box to inspect attributes or pinpoint coordinates.
            </span>
          </div>
        </div>

        {/* Right 4 Cols: Detection Controls & Selected Object Dossier */}
        <div className="lg:col-span-4 space-y-4">
          {/* Confidence Slider Control */}
          <div className="bg-[#090d16] border border-white/[0.08] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                DETECTION CONFIDENCE THRESHOLD
              </span>
              <span className="text-xs text-cyan-400 font-bold tabular-nums">
                {Math.round(confidenceCutoff * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0.50"
              max="0.99"
              step="0.05"
              value={confidenceCutoff}
              onChange={(e) => setConfidenceCutoff(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>50% (Recall)</span>
              <span>75% (Balanced)</span>
              <span>99% (Precision)</span>
            </div>
          </div>

          {/* Selected Object Detail Card */}
          {selectedBox ? (
            <div className="bg-[#090d16] border border-white/[0.08] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  OBJECT DOSSIER ({selectedBox.id})
                </span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                    selectedBox.isDarkVessel
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {selectedBox.isDarkVessel ? 'Dark Target' : 'Cooperative'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Class Label</span>
                  <span className="font-bold text-slate-100 text-sm">{selectedBox.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.05]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Confidence</span>
                    <span className="font-bold text-cyan-400">
                      {(selectedBox.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Estimated Length</span>
                    <span className="font-bold text-slate-200">
                      {selectedBox.estimatedLengthM} meters
                    </span>
                  </div>
                </div>

                <div className="pt-1 border-t border-white/[0.05]">
                  <span className="text-[10px] text-slate-500 block">Coordinates (WGS84)</span>
                  <span className="font-mono text-slate-200">
                    {selectedBox.lat.toFixed(4)}°N, {selectedBox.lon.toFixed(4)}°E
                  </span>
                </div>

                <div className="pt-1 border-t border-white/[0.05]">
                  <span className="text-[10px] text-slate-500 block">Detector Model</span>
                  <span className="text-slate-300 text-[11px]">{selectedBox.model}</span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onFocusOnMap(selectedBox.lat, selectedBox.lon)}
                    className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-cyan-500/30 transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Plot &amp; Track on Tactical Map
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#090d16] border border-white/[0.08] rounded-lg p-6 text-center text-xs text-slate-500">
              No object currently selected. Click a bounding box on the image canvas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
