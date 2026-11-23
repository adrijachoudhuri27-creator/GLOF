import React from 'react';
import { GlacialLake, LakeMetric } from '../types';
import { FileText, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { computeHydrology } from './FloodMap';

interface Props {
  lake: GlacialLake;
  metrics: LakeMetric[];
}

export const RiskReport: React.FC<Props> = ({ lake, metrics }) => {
  const hydroWorst = computeHydrology(lake, 'Worst');
  const expansion10Y = (((lake.area_km2 - lake.area_10y_ago_km2) / lake.area_10y_ago_km2) * 100).toFixed(1);

  const exportCsv = () => {
    const headers = [
      'timestamp',
      'lake_id',
      'lake_name',
      'water_level_m',
      'surface_area_km2',
      'temperature_c',
      'precipitation_mm',
      'ice_thickness_m',
      'lstm_risk_prob',
      'predicted_signal',
    ];
    const rows = metrics.map((m) => [
      m.timestamp.slice(0, 10),
      lake.id,
      `"${lake.name}"`,
      m.water_level,
      m.surface_area,
      m.temperature,
      m.precipitation,
      m.ice_thickness,
      m.lstm_risk_prob,
      m.predicted_signal,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${lake.id}_${lake.name.replace(/\s+/g, '_')}_10Y_GLOF_Metrics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0D1117] p-8 rounded-xl border border-white/10 max-w-4xl mx-auto">
      <div className="flex flex-wrap justify-between items-start gap-4 border-b border-white/10 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-sky-500/15 border border-sky-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-sky-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              GLOF Hazard & Early Warning Technical Report
            </h2>
          </div>
          <p className="text-slate-400 font-mono text-xs tabular-nums">
            Report ID: GLOF-{lake.id}-{format(new Date(), 'yyyyMMdd')} · {lake.name} ({lake.region})
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#07090E] hover:bg-white/5 border border-white/15 text-slate-200 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download 10Y CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
        <section>
          <h3 className="text-xs font-mono uppercase tracking-wider text-sky-400 mb-4">
            Geospatial & Physical Characteristics
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Lake Name & ID', value: `${lake.name} (${lake.id})` },
              { label: 'Himalayan Basin', value: lake.region },
              { label: 'Coordinates', value: `${lake.location_lat.toFixed(4)}°N, ${lake.location_lng.toFixed(4)}°E` },
              { label: 'Elevation', value: `${lake.elevation.toFixed(0)} m ASL` },
              { label: 'Surface Area (2026)', value: `${lake.area_km2.toFixed(2)} km²` },
              { label: '10-Year Expansion (2016–2026)', value: `${lake.area_10y_ago_km2.toFixed(2)} -> ${lake.area_km2.toFixed(2)} km² (+${expansion10Y}%)` },
              { label: 'Estimated Volume', value: `${lake.volume_million_m3.toFixed(2)} million m³` },
              { label: 'Dam Structure', value: lake.dam_type },
            ].map((item, i) => (
              <div key={i} className="flex justify-between gap-4 text-sm border-b border-white/5 pb-2">
                <span className="text-slate-400">{item.label}</span>
                <span className="text-white font-mono text-xs text-right tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 mb-4">
            LSTM & Risk Factors
          </h3>
          <div className="space-y-3">
            {[
              {
                label: 'LSTM Outburst Probability',
                value: `${(lake.lstm_probability * 100).toFixed(1)}%`,
                status: `Signal: ${lake.lstm_predicted_class}`,
              },
              {
                label: 'Dam Instability Index',
                value: lake.dam_stability_index.toFixed(2),
                status: lake.dam_stability_index > 0.6 ? 'Critical Moraine' : lake.dam_stability_index > 0.4 ? 'Moderate' : 'Stable',
              },
              {
                label: 'Slope Gradient Index',
                value: lake.slope_index.toFixed(2),
                status: lake.slope_index > 0.65 ? 'Steep' : 'Moderate',
              },
              {
                label: 'Glacier Terminus Distance',
                value: `${lake.distance_to_glacier_km.toFixed(2)} km`,
                status: lake.distance_to_glacier_km < 0.35 ? 'Direct Coupling' : 'Buffered',
              },
              {
                label: 'NDWI / NDSI Spectral Mean',
                value: `${lake.ndwi_mean.toFixed(2)} / ${lake.ndsi_mean.toFixed(2)}`,
                status: 'Sentinel-2 L2A',
              },
              {
                label: 'Population Exposed',
                value: lake.population_at_risk.toLocaleString(),
                status: lake.infrastructure_at_risk,
              },
            ].map((item, i) => (
              <div key={i} className="flex justify-between gap-4 text-sm border-b border-white/5 pb-2">
                <span className="text-slate-400">{item.label}</span>
                <div className="text-right">
                  <div className="text-white font-mono text-xs tabular-nums">{item.value}</div>
                  <div className="text-[11px] text-slate-500 max-w-[200px] truncate">{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mb-10">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-4">
          Worst-Case 100% Dam Breach Hydrodynamic Summary
        </h3>
        <div className="bg-[#07090E] p-6 rounded-lg border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-slate-400">Modeled Peak Discharge</div>
            <div className="text-2xl font-mono font-semibold text-white mt-1 tabular-nums">
              {hydroWorst.peakDischarge.toLocaleString()} m³/s
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Max Valley Inundation Depth</div>
            <div className="text-2xl font-mono font-semibold text-white mt-1 tabular-nums">
              {hydroWorst.maxDepth} m
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Lead Arrival Window</div>
            <div className="text-2xl font-mono font-semibold text-amber-400 mt-1 tabular-nums">
              {hydroWorst.arrivalMin} min
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-3">
          Decision-Support Recommendations
        </h3>
        <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5">
          <li>Maintain automated Bi-LSTM sequence scoring across 12-month sliding hydrological windows (98.5% validation accuracy).</li>
          <li>Prioritize Sentinel-2 NDWI shoreline change tracking and SRTM/LiDAR moraine crest deformation checks during peak July–September melt.</li>
          <li>Coordinate telemetry warning thresholds with {lake.region} downstream hydropower and emergency management authorities.</li>
        </ul>
      </section>
    </div>
  );
};
