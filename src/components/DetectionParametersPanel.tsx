import React from 'react';
import {
  Sliders,
  X,
  Info,
  ShieldAlert,
  Satellite,
  Compass,
  Radio,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface DetectionParametersPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParameterItem {
  name: string;
  category: 'AIS Kinematics' | 'SAR Satellite' | 'Spatial Correlation' | 'Geofencing';
  currentValue: string;
  defaultValue: string;
  unit: string;
  isConfigurable: boolean;
  explanation: string;
  operationalEffect: string;
  tradeOffNote: string;
}

const PARAMETERS: ParameterItem[] = [
  {
    name: 'AIS Transponder Reporting Gap Threshold',
    category: 'AIS Kinematics',
    currentValue: '3.0',
    defaultValue: '3.0',
    unit: 'hours',
    isConfigurable: true,
    explanation:
      'The maximum allowable duration between successive Automatic Identification System (AIS) position reports before an intentional shut-off is flagged.',
    operationalEffect:
      'Flags vessels that drop off public AIS tracking while maintaining positive headway, calculating implied distance and transit speed.',
    tradeOffNote:
      'Note: An AIS gap is not definitive proof of malicious activity; high-frequency radio shadow, stormy sea states, or terrestrial receiver outages can also cause signal dropouts.',
  },
  {
    name: 'SAR–AIS Spatial Correlation Radius',
    category: 'Spatial Correlation',
    currentValue: '5.0',
    defaultValue: '5.0',
    unit: 'kilometers (2.7 NM)',
    isConfigurable: true,
    explanation:
      'Spatial search buffer used to associate a Synthetic Aperture Radar (SAR) detection with the interpolated position of an AIS-broadcasting vessel.',
    operationalEffect:
      'If no cooperative vessel track intersects this radius within the temporal window, the contact is designated as a Dark Vessel candidate.',
    tradeOffNote:
      'Trade-off: A larger spatial radius increases candidate match recovery in windy drift conditions, but also increases false-positive associations with nearby non-target vessels.',
  },
  {
    name: 'SAR Temporal Correlation Window',
    category: 'Spatial Correlation',
    currentValue: '60',
    defaultValue: '60',
    unit: 'minutes',
    isConfigurable: true,
    explanation:
      'Maximum allowable time offset between the Sentinel-1 satellite SAR acquisition timestamp and the nearest valid AIS position report.',
    operationalEffect:
      'Applies great-circle dead reckoning between bounding AIS pings to determine the exact vessel location at the exact second of radar imaging.',
    tradeOffNote:
      'Tightening the temporal gate reduces interpolation error; widening it allows matching during intermittent satellite-AIS (S-AIS) pass intervals.',
  },
  {
    name: 'Ship-to-Ship (STS) Proximity Gate',
    category: 'AIS Kinematics',
    currentValue: '500',
    defaultValue: '500',
    unit: 'meters',
    isConfigurable: true,
    explanation:
      'Threshold distance between two vessels operating at slow drift speeds (< 2.5 knots) outside of designated anchorages.',
    operationalEffect:
      'Flags uncoordinated parallel drifting that matches known illicit oil bunkering, cargo transfer, or transshipment rendezvous profiles.',
    tradeOffNote:
      'Trade-off: Proximity alone does not confirm cargo transfer; pilot boarding operations, towing assist, or bunkering in calm water also trigger close proximity.',
  },
  {
    name: 'Kinematic Velocity Jump Gate (Anti-Spoofing)',
    category: 'AIS Kinematics',
    currentValue: '35.0',
    defaultValue: '35.0',
    unit: 'knots',
    isConfigurable: false,
    explanation:
      'Maximum physically plausible velocity between successive AIS points for displacement commercial vessels.',
    operationalEffect:
      'Calculates the implied velocity across sequential pings. Values exceeding 35 knots indicate deliberate GNSS offset spoofing or cloned MMSI transponders.',
    tradeOffNote:
      'Fixed physical constraint: Displacement tankers and cargo vessels cannot exceed hull speeds of 25–30 knots under ordinary propulsion.',
  },
  {
    name: 'Anomalous Loitering Speed Gate',
    category: 'AIS Kinematics',
    currentValue: '2.0',
    defaultValue: '2.0',
    unit: 'knots',
    isConfigurable: true,
    explanation:
      'Upper speed boundary for classifying sustained drifting or circle patterns outside designated port anchorages.',
    operationalEffect:
      'Triggers an alert when a vessel maintains slow speed (< 2.0 kts) for > 4.0 hours outside verified commercial anchorage grounds.',
    tradeOffNote:
      'Fishing vessels in drift nets and engine breakdown cases may also loiter; contextual zone awareness is applied to reduce false alarms.',
  },
  {
    name: 'SAR Vessel Detection Confidence Gate',
    category: 'SAR Satellite',
    currentValue: '0.80',
    defaultValue: '0.80',
    unit: 'probability (0.0 – 1.0)',
    isConfigurable: true,
    explanation:
      'Confidence cutoff for the Faster R-CNN ResNet-50 FPN neural network when classifying radar pixel backscatter clusters as maritime vessels.',
    operationalEffect:
      'Eliminates radar sea clutter, ocean wave crests, and azimuth sidelobes (-12 dB) before generating operational threat alerts.',
    tradeOffNote:
      'Higher confidence (> 0.85) ensures near-zero false alarms but may omit wooden fishing dhows with low radar cross-sections (RCS).',
  },
  {
    name: 'Defense Exclusion Zone Boundary Buffer',
    category: 'Geofencing',
    currentValue: '0.0',
    defaultValue: '0.0',
    unit: 'meters (exact boundary)',
    isConfigurable: false,
    explanation:
      'Ray-casting polygon containment check against INS Okha Naval Exercise & Defense Exclusion Zone coordinates.',
    operationalEffect:
      'Instantaneous alert trigger when any vessel or SAR contact coordinate intersects military live-firing polygons.',
    tradeOffNote:
      'Strict legal boundary enforced under coastal defense operational protocol; zero tolerance buffer applied.',
  },
];

export const DetectionParametersPanel: React.FC<DetectionParametersPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('ALL');

  if (!isOpen) return null;

  const categories = ['ALL', 'AIS Kinematics', 'SAR Satellite', 'Spatial Correlation', 'Geofencing'];
  const filtered = selectedCategory === 'ALL'
    ? PARAMETERS
    : PARAMETERS.filter((p) => p.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#0b101c] border border-white/[0.1] rounded-xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#0e1526]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Detection Parameters &amp; Explainability Registry
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Active analytical thresholds, kinematic gates, and correlation tolerances governing automated threat detection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors"
            title="Close Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-5 py-3 border-b border-white/[0.06] bg-[#090d18] flex items-center gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          <div className="p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3 text-xs text-slate-300">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-cyan-300">Operational Integrity Statement:</strong> All parameters displayed here represent the actual programmatic thresholds used in the fusion engine and detector pipelines. Changing thresholds alters the balance between detection sensitivity and false-alarm rejection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((param, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#0e1526] border border-white/[0.07] hover:border-white/[0.14] transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                      {param.category}
                    </span>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                    {param.name}
                  </h3>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
                      {param.currentValue}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {param.unit}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                    {param.explanation}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/[0.05] text-[11px]">
                  <div>
                    <span className="text-slate-400 font-medium block mb-0.5">Detector Outcome:</span>
                    <p className="text-slate-300 leading-relaxed">{param.operationalEffect}</p>
                  </div>
                  <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200/90 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      Trade-Off &amp; False-Positive Context
                    </div>
                    {param.tradeOffNote}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#0e1526] flex items-center justify-between text-xs text-slate-400">
          <span>Engine: Hexagonal Fusion Core v1.4.2 · WGS-84 Geodetic Math</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
