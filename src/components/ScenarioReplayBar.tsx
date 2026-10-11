import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  Clock,
  Radio,
  Sliders,
} from 'lucide-react';

interface ScenarioReplayBarProps {
  startTimeMs: number;
  endTimeMs: number;
  currentTimeMs: number;
  isLive: boolean;
  onSeek: (timeMs: number) => void;
  onToggleLive: (isLive: boolean) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export const ScenarioReplayBar: React.FC<ScenarioReplayBarProps> = ({
  startTimeMs,
  endTimeMs,
  currentTimeMs,
  isLive,
  onSeek,
  onToggleLive,
  speed,
  onSpeedChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-advance timeline on play
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        const nextTime = currentTimeMs + 3600 * 1000 * speed * 0.25;
        if (nextTime >= endTimeMs) {
          onSeek(endTimeMs);
          setIsPlaying(false);
        } else {
          onSeek(nextTime);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTimeMs, endTimeMs, speed, onSeek]);

  const progressPct = Math.min(
    100,
    Math.max(0, ((currentTimeMs - startTimeMs) / (endTimeMs - startTimeMs || 1)) * 100)
  );

  const formatUtc = (ms: number) => {
    return new Date(ms).toUTCString().replace('GMT', 'UTC');
  };

  const handleStep = (hours: number) => {
    const next = Math.max(startTimeMs, Math.min(endTimeMs, currentTimeMs + hours * 3600 * 1000));
    onSeek(next);
  };

  return (
    <div className="h-14 px-6 bg-[#080d1a] border-t border-white/[0.08] flex items-center justify-between select-none z-30 shrink-0 font-sans text-xs">
      {/* 1. Left Replay Badge & Current Time */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[11px] font-semibold flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-amber-400" />
          Simulated Scenario Replay
        </span>

        <div className="hidden md:flex flex-col font-mono text-slate-300 text-xs">
          <span className="font-semibold text-slate-100">
            {formatUtc(currentTimeMs)}
          </span>
        </div>
      </div>

      {/* 2. Center Timeline Scrubbing Controls */}
      <div className="flex-1 max-w-2xl mx-6 flex items-center gap-3">
        {/* Playback Button Cluster */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStep(-4)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors"
            title="Step back 4 hours"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors shadow-sm"
            title={isPlaying ? 'Pause Replay' : 'Play Scenario'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          <button
            onClick={() => handleStep(4)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors"
            title="Step forward 4 hours"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              onSeek(startTimeMs);
              setIsPlaying(false);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors"
            title="Reset to Start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Range Slider Track */}
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={startTimeMs}
            max={endTimeMs}
            value={currentTimeMs}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      {/* 3. Right Speed Selector */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-slate-400 hidden lg:inline">Speed:</span>
        <div className="flex items-center bg-[#0d1424] p-0.5 rounded-lg border border-white/[0.08] text-[11px] font-mono">
          {[0.5, 1.0, 2.0, 5.0].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 rounded transition-colors ${
                speed === s
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
