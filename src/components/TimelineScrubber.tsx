import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Radio,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface TimelineScrubberProps {
  startTimeMs: number;
  endTimeMs: number;
  currentTimeMs: number;
  isLive: boolean;
  onSeek: (timeMs: number) => void;
  onToggleLive: (isLive: boolean) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
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

  useEffect(() => {
    if (!isPlaying || isLive) return;

    const interval = setInterval(() => {
      const stepMs = 15 * 60 * 1000 * speed;
      const nextTime = currentTimeMs + stepMs;

      if (nextTime >= endTimeMs) {
        onSeek(endTimeMs);
        setIsPlaying(false);
      } else {
        onSeek(nextTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isLive, currentTimeMs, endTimeMs, speed, onSeek]);

  const progressPercent = Math.min(
    100,
    Math.max(0, ((currentTimeMs - startTimeMs) / (endTimeMs - startTimeMs)) * 100)
  );

  const formatShortUtc = (ms: number) => {
    return new Date(ms).toISOString().replace('T', ' ').slice(5, 16) + 'Z';
  };

  return (
    <footer className="h-13 bg-[#080c16]/95 backdrop-blur-md border-t border-white/[0.07] px-4 flex items-center justify-between select-none z-30 font-mono text-xs">
      {/* Left: Playback buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onSeek(Math.max(startTimeMs, currentTimeMs - 2 * 3600 * 1000))}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] rounded transition-colors"
          title="Step Back 2 Hours"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={isLive}
          className={`px-2.5 py-1 rounded flex items-center gap-1.5 text-xs font-semibold transition-colors ${
            isPlaying
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25'
          } disabled:opacity-40`}
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-cyan-300" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={() => onSeek(Math.min(endTimeMs, currentTimeMs + 2 * 3600 * 1000))}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] rounded transition-colors"
          title="Step Forward 2 Hours"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {/* Speed button */}
        <div className="flex bg-[#0d1322] p-0.5 rounded border border-white/[0.06] ml-1">
          {[1, 5, 20].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-1.5 py-0.5 text-[10px] rounded ${
                speed === s
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Center: Clean Scrubber Track */}
      <div className="flex-1 max-w-2xl px-6 space-y-1">
        <div className="flex justify-between items-center text-[10px] text-slate-400">
          <span>{formatShortUtc(startTimeMs)}</span>
          <span className="text-slate-200 font-semibold flex items-center gap-1 tabular-nums">
            <Clock className="w-3 h-3 text-cyan-400" />
            {formatShortUtc(currentTimeMs)}
          </span>
          <span>{formatShortUtc(endTimeMs)}</span>
        </div>

        <div className="relative flex items-center">
          <input
            type="range"
            min={startTimeMs}
            max={endTimeMs}
            step={15 * 60 * 1000}
            value={currentTimeMs}
            onChange={(e) => {
              onSeek(Number(e.target.value));
              if (isLive) onToggleLive(false);
            }}
            className="w-full accent-cyan-400 h-1 bg-[#131b2e] rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Right: Live toggle & Reset */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            onSeek(startTimeMs);
            setIsPlaying(false);
          }}
          className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors"
          title="Reset to start of 7-day window"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onToggleLive(!isLive)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
            isLive
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 bg-[#0d1322] border border-white/[0.08]'
          }`}
        >
          <Radio className={`w-3 h-3 ${isLive ? 'animate-pulse text-emerald-400' : ''}`} />
          <span>{isLive ? 'Live' : 'Replay'}</span>
        </button>
      </div>
    </footer>
  );
};
