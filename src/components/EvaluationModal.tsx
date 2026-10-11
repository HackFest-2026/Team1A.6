import React, { useState, useEffect } from 'react';
import {
  X,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { GroundTruthBenchmark } from '../domain/models.ts';

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [benchmark, setBenchmark] = useState<GroundTruthBenchmark | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/evaluation')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.benchmark) {
          setBenchmark(data.benchmark);
        }
      })
      .catch((err) => console.error('Failed to load evaluation:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#070a12] border border-[#1a233a] rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1a233a] flex items-center justify-between bg-[#0a0f1d]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                GROUND TRUTH EVALUATION &amp; BENCHMARK SUITE
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                SENTINEL-1 SAR CORRELATION ENGINE ACCURACY
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
          {loading || !benchmark ? (
            <div className="p-8 text-center text-slate-400">
              Computing spatial confusion matrix...
            </div>
          ) : (
            <>
              {/* Top Score Cards */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 bg-[#0a1122] border border-[#1b2a47] rounded text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">PRECISION</span>
                  <span className="text-xl font-bold text-emerald-400 tabular-nums">
                    {(benchmark.precision * 100).toFixed(1)}%
                  </span>
                  <span className="text-[9px] text-slate-500 block">TP / (TP + FP)</span>
                </div>
                <div className="p-3 bg-[#0a1122] border border-[#1b2a47] rounded text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">RECALL</span>
                  <span className="text-xl font-bold text-cyan-400 tabular-nums">
                    {(benchmark.recall * 100).toFixed(1)}%
                  </span>
                  <span className="text-[9px] text-slate-500 block">TP / (TP + FN)</span>
                </div>
                <div className="p-3 bg-[#0a1122] border border-[#1b2a47] rounded text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">F1 SCORE</span>
                  <span className="text-xl font-bold text-amber-400 tabular-nums">
                    {benchmark.f1_score.toFixed(3)}
                  </span>
                  <span className="text-[9px] text-slate-500 block">HARMONIC MEAN</span>
                </div>
                <div className="p-3 bg-[#0a1122] border border-[#1b2a47] rounded text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">ACCURACY</span>
                  <span className="text-xl font-bold text-indigo-400 tabular-nums">
                    {(benchmark.accuracy * 100).toFixed(1)}%
                  </span>
                  <span className="text-[9px] text-slate-500 block">OVERALL ACC.</span>
                </div>
              </div>

              {/* Confusion Matrix Table */}
              <div className="p-3 bg-[#090e1c] border border-[#172238] rounded space-y-2">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  SPATIO-TEMPORAL FUSION CONFUSION MATRIX
                </h3>

                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="border-b border-[#1f2d47] text-[10px] text-slate-400">
                      <th className="p-2 text-left">GROUND TRUTH \ PREDICTION</th>
                      <th className="p-2 text-rose-400">PREDICTED DARK</th>
                      <th className="p-2 text-emerald-400">PREDICTED COOPERATIVE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#172238] text-xs">
                    <tr>
                      <td className="p-2 text-left font-semibold text-slate-300">
                        ACTUAL DARK VESSEL
                      </td>
                      <td className="p-2 bg-emerald-950/30 text-emerald-300 font-bold">
                        {benchmark.true_positives} (TRUE POSITIVES)
                      </td>
                      <td className="p-2 bg-rose-950/20 text-rose-300">
                        {benchmark.false_negatives} (FALSE NEGATIVES)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-left font-semibold text-slate-300">
                        ACTUAL COOPERATIVE VESSEL
                      </td>
                      <td className="p-2 bg-rose-950/20 text-rose-300">
                        {benchmark.false_positives} (FALSE POSITIVES)
                      </td>
                      <td className="p-2 bg-emerald-950/30 text-emerald-300 font-bold">
                        {benchmark.true_negatives} (TRUE NEGATIVES)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* xView3 Maritime Benchmark Details */}
              <div className="p-3 bg-[#081226] border border-cyan-800/40 rounded space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center justify-between text-cyan-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    DIU xVIEW3 MARITIME PRIZE CHALLENGE (AI2 SKYLIGHT MODEL)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Model: nov20-combo8 (ResNet-50 FPN)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Trained using the AI2 Skylight approach (<code className="text-cyan-300">favyen2/sar_vessel_detect</code>) on Sentinel-1 SAR IW GRDH images.
                  Uses 800x800 tiling with 20px overlap, semi-supervised pseudo-labeling on train scenes with NMS 10 and confidence &ge; 0.8,
                  and three dedicated prediction heads: <strong className="text-slate-300">is_vessel</strong> (98.5% acc), <strong className="text-slate-300">is_fishing</strong> (IUU detector), and <strong className="text-slate-300">vessel length</strong> regression.
                </p>
              </div>

              {/* Honest Limitations & Defense Caveats */}
              <div className="p-3 bg-[#0a0f1d] border border-amber-800/40 rounded space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  OPERATIONAL SENSOR CAVEATS &amp; LIMITATIONS
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[10px] leading-relaxed">
                  <li>
                    <strong>Terrestrial AIS Coverage Gaps</strong>: Vessels beyond 40-50 NM from shore
                    rely on satellite AIS constellation passes, which can produce latency windows.
                  </li>
                  <li>
                    <strong>SAR False Alarms</strong>: High sea states (Beaufort &gt; 6) and azimuth
                    ghost reflections near oil rigs / SPM buoys may create spurious radar blips.
                  </li>
                  <li>
                    <strong>Small Craft Thresholds</strong>: Wooden dhows and small fishing craft under
                    15m length frequently lack AIS transponders without hostile intent.
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1a233a] bg-[#0a0f1d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors"
          >
            DISMISS BENCHMARK
          </button>
        </div>
      </div>
    </div>
  );
};
