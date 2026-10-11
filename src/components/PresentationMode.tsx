import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Compass,
  Play,
  RotateCcw,
  CheckCircle,
  Satellite,
  ShieldAlert,
} from 'lucide-react';

interface PresentationModeProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToScenarioStep: (timeMs: number, targetId: string) => void;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  isOpen,
  onClose,
  onJumpToScenarioStep,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const scenarioSteps = [
    {
      title: 'Phase 1: Transit Fairway & Commercial Baselines',
      timestamp: '2026-10-06T06:00:00Z',
      timeMs: new Date('2026-10-06T06:00:00Z').getTime(),
      targetId: 'vessel-sea-dragon',
      summary:
        'MT SEA DRAGON transits east toward the Gulf of Kutch oil terminals under normal AIS broadcast at 12.8 knots. Regional maritime traffic is within nominal bounds.',
      takeaway:
        'Hexagonal ingestion normalizes cooperative tracks and indexes spatial positions into geodesic bounding tiles.',
    },
    {
      title: 'Phase 2: Intentional AIS Dark Window (Transponder Shut-Off)',
      timestamp: '2026-10-07T00:00:00Z',
      timeMs: new Date('2026-10-07T00:00:00Z').getTime(),
      targetId: 'vessel-sea-dragon',
      summary:
        'At 12:00Z on Oct 6, MT SEA DRAGON abruptly terminates AIS transmissions. For 14 consecutive hours, zero pings are received while the vessel changes heading toward the INS Okha naval perimeter.',
      takeaway:
        'ais_gap detector triggers (+25 points) identifying an anomalous unbroadcasted interval covering >40 NM.',
    },
    {
      title: 'Phase 3: Multi-Modal Sentinel-1 SAR Radar Detection',
      timestamp: '2026-10-07T02:00:00Z',
      timeMs: new Date('2026-10-07T02:00:00Z').getTime(),
      targetId: 'sar-det-001',
      summary:
        'Copernicus Sentinel-1 satellite SAR pass (scene S1A_IW_GRDH_1SDV) detects high-contrast metallic contact (est. length 280m) at [22.25°N, 68.86°E]. Spatio-temporal fusion finds 0 matching AIS tracks in space-time gate.',
      takeaway:
        'dark_vessel detector correlates SAR radar blip against interpolated dead-reckoned tracks, classifying it as an UNMATCHED DARK VESSEL with 94% radar confidence.',
    },
    {
      title: 'Phase 4: Clandestine Ship-to-Ship Transfer & Naval Interdiction',
      timestamp: '2026-10-08T06:00:00Z',
      timeMs: new Date('2026-10-08T06:00:00Z').getTime(),
      targetId: 'vessel-sea-dragon',
      summary:
        'Sea Dragon resumes AIS at low speed (1.4 kts) and conducts sustained parallel drift (<400m) with OFAC-sanctioned VLCC MT OLYMPIC SPIRIT. Duty Officer logs human-in-the-loop ESCALATION, tasking ICGS SAMARTH for interception.',
      takeaway:
        'Composite threat score reaches 95/100 (CRITICAL). Multi-modal evidence citations are automatically synthesized into an executive Naval SITREP via Gemini 3.8 Flash.',
    },
  ];

  const currentStep = scenarioSteps[currentStepIdx];

  const handleApplyStep = (idx: number) => {
    setCurrentStepIdx(idx);
    const step = scenarioSteps[idx];
    onJumpToScenarioStep(step.timeMs, step.targetId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#070a12] border border-[#1a233a] rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1a233a] flex items-center justify-between bg-[#0a0f1d]">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                GUIDED OPERATIONAL SCENARIO WALKTHROUGH
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                ARABIAN SEA SHADOW TANKER STS INTERDICTION DEMO
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#151f33]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 font-mono text-xs">
          {/* Step indicator rail */}
          <div className="flex items-center justify-between border-b border-[#1a233a] pb-3">
            {scenarioSteps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyStep(idx)}
                className={`flex-1 py-1.5 px-2 text-center rounded border transition-all ${
                  currentStepIdx === idx
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                    : 'bg-[#0a0f1d] text-slate-400 hover:text-slate-200 border-[#1a233a]'
                }`}
              >
                PHASE {idx + 1}
              </button>
            ))}
          </div>

          {/* Current Step Card */}
          <div className="p-4 bg-[#0a1122] border border-[#1f2d47] rounded space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                  SCENARIO STEP {currentStepIdx + 1} OF {scenarioSteps.length}
                </span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                  {currentStep.title}
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 bg-[#080d1a] px-2 py-1 rounded border border-[#1e2a44]">
                TIME: {currentStep.timestamp.slice(0, 16)}Z
              </span>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {currentStep.summary}
            </p>

            <div className="p-2.5 bg-[#070b16] border border-cyan-900/50 rounded text-[11px] text-cyan-300 font-mono">
              <strong className="block text-cyan-400 font-semibold mb-0.5">
                ENGINE ARCHITECTURAL TAKEAWAY:
              </strong>
              {currentStep.takeaway}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1a233a] bg-[#0a0f1d] flex items-center justify-between">
          <button
            onClick={() => handleApplyStep(Math.max(0, currentStepIdx - 1))}
            disabled={currentStepIdx === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-[#151f33] disabled:opacity-30 rounded transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> PREVIOUS
          </button>

          <button
            onClick={() => handleApplyStep(currentStepIdx)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded font-bold transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> JUMP MAP TO THIS PHASE
          </button>

          <button
            onClick={() =>
              handleApplyStep(Math.min(scenarioSteps.length - 1, currentStepIdx + 1))
            }
            disabled={currentStepIdx === scenarioSteps.length - 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-[#151f33] disabled:opacity-30 rounded transition-colors"
          >
            NEXT <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
