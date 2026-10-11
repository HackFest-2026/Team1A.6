import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Compass,
} from 'lucide-react';

interface NlQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyParsedFilter: (parsed: {
    threatLevel?: string;
    ruleType?: string;
    zoneName?: string;
    searchKeyword?: string;
    explanation?: string;
  }) => void;
}

export const NlQueryModal: React.FC<NlQueryModalProps> = ({
  isOpen,
  onClose,
  onApplyParsedFilter,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const exampleQuestions = [
    'Which detections have no plausible AIS match?',
    'Show potential ship-to-ship encounters.',
    'Which alerts have the highest threat scores?',
    'Which vessels have significant AIS reporting gaps?',
    'Identify contacts inside the INS Okha Naval Exercise zone',
  ];

  const handleExecuteQuery = async (customText?: string) => {
    const textToSend = customText || query;
    if (!textToSend.trim()) return;

    setIsLoading(true);
    setParsedResult(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/gemini/nl-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend }),
      });
      const data = await res.json();
      if (data.success && data.parsed) {
        setParsedResult(data.parsed);
      } else {
        setErrorMsg(data.error || 'Unable to parse query filter.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error executing query.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilter = () => {
    if (parsedResult) {
      onApplyParsedFilter(parsedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-2xl bg-[#090e1b] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#0d1424]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Natural-Language Geospatial Query Assistant
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Query the Common Operating Picture using natural English commands translated by Gemini 3.8 Flash
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Query Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Enter Surveillance Query:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteQuery();
                  }}
                  placeholder="e.g. Which detections have no plausible AIS match?"
                  className="w-full bg-[#050812] border border-white/[0.1] rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60 placeholder:text-slate-600"
                />
              </div>
              <button
                onClick={() => handleExecuteQuery()}
                disabled={isLoading || !query.trim()}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isLoading ? (
                  <span>Translating...</span>
                ) : (
                  <>
                    <span>Execute</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Example Questions */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Suggested Example Questions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {exampleQuestions.map((eq, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(eq);
                    handleExecuteQuery(eq);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-xs transition-colors text-left"
                >
                  {eq}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Structured Result Display */}
          {parsedResult && (
            <div className="p-4 rounded-xl bg-[#0e1628] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Translated Structured Filter
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Model: Gemini 3.8 Flash
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {parsedResult.explanation}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] font-mono text-xs">
                {parsedResult.threatLevel && (
                  <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
                    <span className="text-slate-500 block text-[10px]">THREAT LEVEL:</span>
                    <span className="text-rose-400 font-bold">{parsedResult.threatLevel}</span>
                  </div>
                )}
                {parsedResult.ruleType && (
                  <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
                    <span className="text-slate-500 block text-[10px]">ANOMALY RULE:</span>
                    <span className="text-cyan-300">{parsedResult.ruleType}</span>
                  </div>
                )}
                {parsedResult.zoneName && (
                  <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
                    <span className="text-slate-500 block text-[10px]">TARGET GEOFENCE:</span>
                    <span className="text-amber-300">{parsedResult.zoneName}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleApplyFilter}
                  className="w-full py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Apply Filter to Active Surveillance Map
                </button>
              </div>
            </div>
          )}

          {/* AI Disclosure Notice */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <strong>Intelligence Protocol Note:</strong> Natural language translations generate dashboard filters based on user queries. Generated summaries are interpretive aids and should not be cited as empirical evidentiary records.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
