import React, { useState } from 'react';
import { Ship, Search, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';
import { Vessel, Alert } from '../domain/models.ts';

interface VesselRegistryViewProps {
  vessels: Vessel[];
  alerts: Alert[];
  onSelectVessel: (vesselId: string) => void;
}

export const VesselRegistryView: React.FC<VesselRegistryViewProps> = ({
  vessels,
  alerts,
  onSelectVessel,
}) => {
  const [search, setSearch] = useState('');

  const filtered = vessels.filter((v) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.mmsi.toLowerCase().includes(q) ||
        (v.imo && v.imo.toLowerCase().includes(q)) ||
        v.flag_country.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] overflow-y-auto bg-[#050811] p-6 space-y-6 font-mono select-none custom-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Ship className="w-5 h-5 text-cyan-400" />
            MARITIME VESSEL REGISTRY &amp; DOSSIERS
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active cooperative AIS transmitters, military assets, and sanctioned shadow fleet entities.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, IMO, MMSI..."
            className="bg-[#0c1222] border border-white/[0.08] text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-md focus:outline-none focus:border-cyan-500/60 w-64"
          />
        </div>
      </div>

      <div className="bg-[#090d16] border border-white/[0.08] rounded-lg overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#0c1322] text-[11px] text-slate-400">
              <th className="p-3 font-semibold">VESSEL NAME</th>
              <th className="p-3 font-semibold">IDENTIFIERS</th>
              <th className="p-3 font-semibold">FLAG / TYPE</th>
              <th className="p-3 font-semibold">SPEED &amp; COURSE</th>
              <th className="p-3 font-semibold">SANCTIONS / RISK</th>
              <th className="p-3 font-semibold text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {filtered.map((v) => {
              const alert = alerts.find((a) => a.vessel_id === v.id);
              const isSanctioned = v.is_sanctioned;

              return (
                <tr
                  key={v.id}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => onSelectVessel(v.id)}
                >
                  <td className="p-3">
                    <span className="font-semibold text-slate-100 block">{v.name}</span>
                    <span className="text-[10px] text-slate-400">{v.callsign || 'N/A'}</span>
                  </td>
                  <td className="p-3 text-[11px] text-slate-300">
                    <div>MMSI: {v.mmsi}</div>
                    {v.imo && <div className="text-slate-500">IMO: {v.imo}</div>}
                  </td>
                  <td className="p-3 text-slate-300">
                    <div>{v.flag_country}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{v.vessel_type}</div>
                  </td>
                  <td className="p-3 tabular-nums text-slate-300">
                    <div>{v.last_known_point?.sog ?? 0} kts</div>
                    <div className="text-[10px] text-slate-500">{v.last_known_point?.cog ?? 0}° COG</div>
                  </td>
                  <td className="p-3">
                    {isSanctioned ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        Sanctioned (OFAC)
                      </span>
                    ) : alert ? (
                      <span className="text-amber-400 text-[11px] font-semibold">
                        Alert Level {alert.score}/100
                      </span>
                    ) : (
                      <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Nominal Track
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectVessel(v.id);
                      }}
                      className="px-2.5 py-1 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded transition-colors inline-flex items-center gap-1"
                    >
                      <span>Locate</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
