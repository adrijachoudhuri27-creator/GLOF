import React, { useState, useEffect } from 'react';
import { GlacialLake } from '../types';
import { Layers, Loader2, CheckCircle2, Box, Mountain } from 'lucide-react';

interface Props {
  lake: GlacialLake;
}

type BandMode = 'rgb' | 'ndwi' | 'ndsi' | 'dem';

const SATELLITE_IMG_SRC = '/src/assets/images/himalayan_glacial_lake_satellite_1795417188697.jpg';
const DEM_IMG_SRC = '/src/assets/images/himalayan_glacial_lake_dem_1795417188268.jpg';

export const SatelliteImagery: React.FC<Props> = ({ lake }) => {
  const [bandMode, setBandMode] = useState<BandMode>('rgb');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [results, setResults] = useState<{
    boundary?: boolean;
    area?: number;
    elevationProfile?: boolean;
  }>({});

  // Reset analysis overlays when switching lakes
  useEffect(() => {
    setResults({});
    setActiveTool(null);
    setImgError(false);
  }, [lake.id]);

  const runTool = (tool: 'boundary' | 'area' | 'dem') => {
    setActiveTool(tool);
    setTimeout(() => {
      if (tool === 'boundary') {
        setResults((prev) => ({ ...prev, boundary: !prev.boundary }));
      }
      if (tool === 'area') {
        setResults((prev) => ({ ...prev, area: lake.area_km2 }));
      }
      if (tool === 'dem') {
        const nextIsDem = bandMode !== 'dem';
        setBandMode(nextIsDem ? 'dem' : 'rgb');
        setResults((prev) => ({ ...prev, elevationProfile: nextIsDem }));
      }
      setActiveTool(null);
    }, 650);
  };

  const expansion10Y = (((lake.area_km2 - lake.area_10y_ago_km2) / lake.area_10y_ago_km2) * 100).toFixed(1);

  const imageFilterClass =
    bandMode === 'ndwi'
      ? 'hue-rotate-180 contrast-125 saturate-150 brightness-90'
      : bandMode === 'ndsi'
        ? 'grayscale contrast-150 brightness-110'
        : bandMode === 'dem'
          ? 'contrast-110 saturate-110'
          : 'contrast-105';

  return (
    <div className="space-y-6">
      <div className="bg-[#0D1117] p-6 rounded-xl border border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/15 border border-sky-500/20 rounded-lg">
              <Layers className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Rasterio / Sentinel-2 & SRTM DEM View — {lake.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5 tabular-nums">
                {lake.location_lat.toFixed(3)}°N, {lake.location_lng.toFixed(3)}°E · {lake.elevation.toFixed(0)} m ASL · {lake.region}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#07090E] border border-white/10 rounded-lg">
            {[
              { id: 'rgb', label: 'True Color RGB' },
              { id: 'ndwi', label: 'NDWI Water' },
              { id: 'ndsi', label: 'NDSI Snow/Ice' },
              { id: 'dem', label: 'SRTM 30m DEM' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setBandMode(mode.id as BandMode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  bandMode === mode.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative aspect-video bg-[#07090E] rounded-lg border border-white/10 overflow-hidden">
          {!imgError ? (
            <img
              src={bandMode === 'dem' ? DEM_IMG_SRC : SATELLITE_IMG_SRC}
              alt={`${lake.name} ${bandMode === 'dem' ? 'SRTM Digital Elevation Model' : 'Sentinel-2 Multispectral View'}`}
              onError={() => setImgError(true)}
              className={`w-full h-full object-cover transition-all duration-500 ${imageFilterClass}`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950/40 text-slate-400">
              <Mountain className="w-12 h-12 text-sky-400/50 mb-3" />
              <p className="text-sm font-medium text-slate-200">{lake.name} Basin Imagery</p>
              <p className="text-xs font-mono text-slate-500 mt-1">
                {lake.location_lat.toFixed(3)}°N, {lake.location_lng.toFixed(3)}°E
              </p>
            </div>
          )}

          {/* Vector Lake Boundary Overlay */}
          {results.boundary && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path
                  d="M42,46 C44,39 51,38 55,41 C58,44 57,54 54,62 C51,69 44,69 42,61 C40,55 41,50 42,46 Z"
                  fill="rgba(16, 185, 129, 0.14)"
                  stroke="#10B981"
                  strokeWidth="0.6"
                  strokeDasharray="1.6,1.2"
                />
                <path
                  d="M43,48 C45,42 50,41 53,43 C55,46 54,54 52,60 C50,65 45,65 43,59 Z"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="0.35"
                  strokeDasharray="1,1"
                />
              </svg>
              <div className="absolute top-4 right-4 bg-[#07090E]/90 border border-emerald-500/40 px-3 py-1.5 rounded text-[11px] font-mono text-emerald-300 tabular-nums">
                GeoPandas Polygon Extracted · 2016 ({lake.area_10y_ago_km2.toFixed(2)} km²) vs 2026 ({lake.area_km2.toFixed(2)} km²)
              </div>
            </div>
          )}

          {/* Scrim & Metadata Bar */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-10 pb-4 px-5 flex flex-wrap justify-between items-end gap-3">
            <div className="space-y-1">
              <div className="text-xs font-mono text-sky-400">
                {bandMode === 'dem'
                  ? 'SRTM 30m Digital Elevation Model · Hypsometric Relief'
                  : `Sentinel-2 L2A · ${bandMode.toUpperCase()} Composite`}
              </div>
              <div className="text-xs text-slate-300 font-mono">
                10-Year Shoreline Growth: +{expansion10Y}% · Dam Type: {lake.dam_type}
              </div>
            </div>
            <div className="text-xs font-mono text-slate-300 tabular-nums">
              {bandMode === 'dem'
                ? `Elev ${lake.elevation.toFixed(0)}m · Slope Index ${lake.slope_index.toFixed(2)}`
                : 'Bands B03 / B04 / B8A (10m GSD)'}
            </div>
          </div>
        </div>
      </div>

      {/* Spectral Indices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0D1117] p-5 rounded-xl border border-white/10">
          <div className="text-xs font-mono text-slate-400">NDWI (Water Index)</div>
          <div className="text-2xl font-mono font-semibold text-sky-400 mt-1 tabular-nums">
            {lake.ndwi_mean.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Green-NIR open water reflectance</div>
        </div>
        <div className="bg-[#0D1117] p-5 rounded-xl border border-white/10">
          <div className="text-xs font-mono text-slate-400">NDSI (Snow & Ice Index)</div>
          <div className="text-2xl font-mono font-semibold text-cyan-300 mt-1 tabular-nums">
            {lake.ndsi_mean.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Glacier accumulation & calving zone</div>
        </div>
        <div className="bg-[#0D1117] p-5 rounded-xl border border-white/10">
          <div className="text-xs font-mono text-slate-400">NDVI (Vegetation Index)</div>
          <div className="text-2xl font-mono font-semibold text-emerald-400 mt-1 tabular-nums">
            {lake.ndvi_mean.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Downstream moraine stabilization</div>
        </div>
      </div>

      {/* Interactive Geospatial Analysis Tools */}
      <div className="bg-[#0D1117] p-6 rounded-xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Geospatial & Raster Processing Tools</h3>
          <span className="text-xs font-mono text-slate-500">Rasterio · GeoPandas · QGIS</span>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-[#07090E] rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-200">Lake Boundary Detection (NDWI Thresholding)</span>
              {results.boundary && (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Polygon overlaid
                </span>
              )}
            </div>
            <button
              onClick={() => runTool('boundary')}
              disabled={activeTool !== null}
              className="px-3.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              {activeTool === 'boundary' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...
                </>
              ) : results.boundary ? (
                'Hide Boundary'
              ) : (
                'Run Algorithm'
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-[#07090E] rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-200">Surface Area & 10-Year Delta Calculation</span>
              {results.area !== undefined && (
                <span className="text-xs font-mono text-emerald-400 tabular-nums">
                  {results.area.toFixed(3)} km² (+{expansion10Y}% since 2016)
                </span>
              )}
            </div>
            <button
              onClick={() => runTool('area')}
              disabled={activeTool !== null}
              className="px-3.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              {activeTool === 'area' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Computing...
                </>
              ) : (
                'Calculate Area'
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-[#07090E] rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-200">Terrain Elevation Relief (SRTM 30m DEM)</span>
              {bandMode === 'dem' && (
                <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
                  <Box className="w-3.5 h-3.5" /> DEM Active
                </span>
              )}
            </div>
            <button
              onClick={() => runTool('dem')}
              disabled={activeTool !== null}
              className="px-3.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              {activeTool === 'dem' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering...
                </>
              ) : bandMode === 'dem' ? (
                'Switch to RGB'
              ) : (
                'Toggle DEM View'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
