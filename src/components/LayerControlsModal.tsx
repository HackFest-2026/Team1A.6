import React from 'react';
import { X, Layers, Check } from 'lucide-react';

interface LayerControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  layers: {
    tracks: boolean;
    sarDetections: boolean;
    zones: boolean;
    rendezvousLinks: boolean;
    radarRings: boolean;
    grid: boolean;
  };
  onToggleLayer: (layerKey: keyof LayerControlsModalProps['layers']) => void;
}

export const LayerControlsModal: React.FC<LayerControlsModalProps> = ({
  isOpen,
  onClose,
  layers,
  onToggleLayer,
}) => {
  if (!isOpen) return null;

  const layerItems: { key: keyof LayerControlsModalProps['layers']; label: string; desc: string }[] = [
    {
      key: 'sarDetections',
      label: 'Sentinel-1 SAR Radar Detections',
      desc: 'Show satellite synthetic aperture radar contacts (dark vessels & matched).',
    },
    {
      key: 'tracks',
      label: 'Cooperative AIS Trajectories',
      desc: 'Display historical vessel wake breadcrumbs and motion vectors.',
    },
    {
      key: 'zones',
      label: 'Geospatial Zones & Boundaries',
      desc: 'Indian EEZ boundary, INS Okha naval exclusion area, and tanker fairways.',
    },
    {
      key: 'rendezvousLinks',
      label: 'STS Encounter & Rendezvous Vectors',
      desc: 'Show tactical proximity link lines between ship-to-ship transferring targets.',
    },
    {
      key: 'radarRings',
      label: 'Naval Radar Range Rings',
      desc: 'Concentric range rings from Porbandar and Okha radar surveillance nodes.',
    },
    {
      key: 'grid',
      label: 'Geodetic WGS84 Degree Grid',
      desc: 'Nautical latitude and longitude coordinate graticule lines.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#070a12] border border-[#1a233a] rounded-lg shadow-2xl flex flex-col overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="p-4 border-b border-[#1a233a] flex items-center justify-between bg-[#0a0f1d]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              TACTICAL MAP LAYER VISIBILITY
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Layer list */}
        <div className="p-4 space-y-2">
          {layerItems.map((item) => {
            const isEnabled = layers[item.key];
            return (
              <div
                key={item.key}
                onClick={() => onToggleLayer(item.key)}
                className={`p-3 rounded border cursor-pointer transition-colors flex items-center justify-between ${
                  isEnabled
                    ? 'bg-cyan-950/30 border-cyan-800/60 text-slate-100'
                    : 'bg-[#090e1c] border-[#172238] text-slate-400 hover:border-slate-600'
                }`}
              >
                <div>
                  <h3 className="font-bold text-xs">{item.label}</h3>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">{item.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                    isEnabled
                      ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  {isEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1a233a] bg-[#0a0f1d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
