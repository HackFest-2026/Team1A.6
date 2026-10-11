import React, { useState } from 'react';
import {
  X,
  FileText,
  Sparkles,
  Copy,
  Download,
  Check,
  RotateCw,
  Shield,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface BriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateBriefing: () => Promise<string>;
}

export const BriefingModal: React.FC<BriefingModalProps> = ({
  isOpen,
  onClose,
  onGenerateBriefing,
}) => {
  const [briefingText, setBriefingText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const text = await onGenerateBriefing();
      setBriefingText(text);
    } catch (err) {
      console.error('Failed to generate briefing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(briefingText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([briefingText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naval_threat_sitrep_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-3xl bg-[#090e1b] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#0d1424]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Executive Maritime Situation Report (SITREP)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                AI Intelligence synthesis powered by Gemini 3.8 Flash citing exact evidence IDs
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

        {/* Action Bar */}
        <div className="px-6 py-3 border-b border-white/[0.06] bg-[#0b1120] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {briefingText ? 'Regenerate Briefing' : 'Generate Intelligence Briefing'}
            </button>
          </div>

          {briefingText && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs transition-colors"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {isCopied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download SITREP (.md)
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-200">
                Synthesizing Maritime Telemetry &amp; Citing Evidence Records...
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Processing active fused alerts, transponder gaps, and Sentinel-1 radar returns via Gemini 3.8 Flash intelligence model.
              </p>
            </div>
          ) : briefingText ? (
            <div className="p-5 rounded-xl bg-[#0c1222] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-xs font-mono text-slate-400">
                <span>CLASSIFIED // WESTERN COMMAND USE ONLY</span>
                <span>UTC: {new Date().toUTCString()}</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-slate-200 space-y-3 whitespace-pre-wrap font-sans leading-relaxed">
                {briefingText}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center space-y-2">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                No Situation Report Generated Yet
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click "Generate Intelligence Briefing" above to synthesize active high-scoring threats and calculate actionable interdiction directives.
              </p>
            </div>
          )}

          {/* Evidence Citation Note */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px] text-slate-400 flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-300">Evidence Citation Policy:</strong> All operational directives produced by the situation report cite exact underlying Evidence IDs (such as <code className="text-cyan-300 font-mono">[ev-gap-vessel-sea-dragon-2]</code>) to eliminate hallucinated facts and guarantee intelligence explainability.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
