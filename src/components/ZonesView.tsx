import React from 'react';
import { Layers, Shield, Anchor, MapPin } from 'lucide-react';
import { Zone } from '../domain/models.ts';

interface ZonesViewProps {
  zones: Zone[];
  onFocusZone: (zone: Zone) => void;
}

export const ZonesView: React.FC<ZonesViewProps> = ({ zones, onFocusZone }) => {
  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] overflow-y-auto bg-[#050811] p-6 space-y-6 font-mono select-none custom-scrollbar">
      <div className="border-b border-white/[0.08] pb-4">
        <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          GEOSPATIAL MARITIME ZONES &amp; DEFENSE GEOFENCES
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Declared boundaries, naval live-fire firing ranges, and commercial traffic separation corridors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zones.map((z) => (
          <div
            key={z.id}
            onClick={() => onFocusZone(z)}
            className="p-4 bg-[#090d16] border border-white/[0.08] rounded-lg hover:border-cyan-500/40 transition-all cursor-pointer space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  ZONE TYPE: {z.zone_type.toUpperCase()} · {z.country}
                </span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">{z.name}</h3>
              </div>
              <div
                className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: z.color || '#00e5ff' }}
              />
            </div>

            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              {z.description || 'Geofenced maritime sector monitored for intrusion and uncoordinated loitering.'}
            </p>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
              <span>Vertex Count: {z.coordinates[0]?.length || 0} points</span>
              <span className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold">
                <MapPin className="w-3 h-3" /> View On Map
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
