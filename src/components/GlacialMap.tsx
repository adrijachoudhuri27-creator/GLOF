import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GlacialLake } from '../types';

interface Props {
  lakes: GlacialLake[];
  selectedLakeId: string | null;
  onSelectLake: (id: string) => void;
}

// Simplified Northern India / Himalayan Region geographic boundaries ([lng, lat])
const NORTHERN_INDIA_ARC: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: { name: 'Indian Himalayan Arc' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [73.8, 32.8], [74.5, 34.4], [75.8, 35.1], [77.8, 34.9], [79.2, 33.8],
      [79.6, 32.5], [78.8, 31.4], [80.2, 30.8], [81.0, 29.8], [80.3, 28.8],
      [84.5, 27.6], [88.0, 27.1], [88.1, 28.1], [88.9, 28.0], [89.1, 27.1],
      [91.5, 27.0], [92.1, 27.9], [94.8, 29.0], [96.5, 28.8], [97.1, 27.8],
      [95.6, 26.8], [92.8, 26.6], [89.8, 26.4], [88.0, 26.6], [85.0, 26.8],
      [81.5, 27.8], [79.0, 29.2], [77.5, 30.2], [76.2, 31.3], [74.8, 32.0],
      [73.8, 32.8]
    ]]
  }
};

// Main Himalayan Crestline & River Basins for spatial context
const HIMALAYAN_RIDGE: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: { name: 'Greater Himalayan Crest' },
  geometry: {
    type: 'LineString',
    coordinates: [
      [74.6, 34.5], [76.2, 33.4], [77.6, 32.5], [79.1, 31.0],
      [80.4, 30.1], [83.5, 28.8], [86.8, 28.0], [88.4, 27.9],
      [91.7, 27.7], [94.5, 28.7]
    ]
  }
};

const REGION_LABELS = [
  { name: 'Ladakh & J&K', lng: 76.2, lat: 34.0 },
  { name: 'Himachal Pradesh', lng: 77.3, lat: 32.0 },
  { name: 'Uttarakhand', lng: 79.4, lat: 30.3 },
  { name: 'Sikkim Himalaya', lng: 88.5, lat: 27.5 },
  { name: 'Arunachal Pradesh', lng: 92.6, lat: 27.6 },
];

export const GlacialMap: React.FC<Props> = ({ lakes, selectedLakeId, onSelectLake }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [hoveredLake, setHoveredLake] = useState<GlacialLake | null>(null);

  const regions = ['All', ...Array.from(new Set(lakes.map(l => l.region)))];
  const visibleLakes = regionFilter === 'All' ? lakes : lakes.filter(l => l.region === regionFilter);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 760;
    const height = 400;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const projection = d3.geoMercator()
      .center([83.4, 30.8])
      .scale(2280)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Canvas backdrop
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#090D14');

    // Latitude / Longitude graticule
    const graticule = d3.geoGraticule().step([2, 2]);
    svg.append('path')
      .datum(graticule)
      .attr('d', path as any)
      .attr('fill', 'none')
      .attr('stroke', '#1E293B')
      .attr('stroke-width', 0.6)
      .attr('stroke-dasharray', '2,3');

    // Indian Himalayan Arc boundary
    svg.append('path')
      .datum(NORTHERN_INDIA_ARC as any)
      .attr('d', path as any)
      .attr('fill', '#111827')
      .attr('fill-opacity', 0.65)
      .attr('stroke', '#334155')
      .attr('stroke-width', 1.2);

    // Greater Himalayan Crestline
    svg.append('path')
      .datum(HIMALAYAN_RIDGE as any)
      .attr('d', path as any)
      .attr('fill', 'none')
      .attr('stroke', '#38BDF8')
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4');

    // Regional labels
    REGION_LABELS.forEach(reg => {
      const coords = projection([reg.lng, reg.lat]);
      if (!coords) return;
      svg.append('text')
        .attr('x', coords[0])
        .attr('y', coords[1] + 22)
        .attr('text-anchor', 'middle')
        .attr('fill', '#475569')
        .attr('font-size', '9px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('letter-spacing', '0.06em')
        .text(reg.name.toUpperCase());
    });

    // Draw lakes
    const lakeGroups = svg.selectAll('.lake-node')
      .data(lakes)
      .enter()
      .append('g')
      .attr('class', 'lake-node')
      .attr('cursor', 'pointer')
      .style('opacity', d => (regionFilter === 'All' || d.region === regionFilter ? 1 : 0.2))
      .on('click', (_event, d) => onSelectLake(d.id))
      .on('mouseenter', (_event, d) => setHoveredLake(d))
      .on('mouseleave', () => setHoveredLake(null));

    // Selection halo ring (static selection indicator)
    lakeGroups
      .filter(d => d.id === selectedLakeId)
      .append('circle')
      .attr('cx', d => projection([d.location_lng, d.location_lat])?.[0] || 0)
      .attr('cy', d => projection([d.location_lng, d.location_lat])?.[1] || 0)
      .attr('r', 12)
      .attr('fill', 'none')
      .attr('stroke', '#38BDF8')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3,2');

    // Lake point marker scaled slightly by area
    lakeGroups.append('circle')
      .attr('cx', d => projection([d.location_lng, d.location_lat])?.[0] || 0)
      .attr('cy', d => projection([d.location_lng, d.location_lat])?.[1] || 0)
      .attr('r', d => (d.id === selectedLakeId ? 7.5 : 4.2 + Math.min(2.5, d.area_km2 * 1.1)))
      .attr('fill', d => {
        if (d.current_risk_level === 'Critical') return '#EF4444';
        if (d.current_risk_level === 'High') return '#F59E0B';
        if (d.current_risk_level === 'Moderate') return '#38BDF8';
        return '#10B981';
      })
      .attr('stroke', d => (d.id === selectedLakeId ? '#FFFFFF' : '#090D14'))
      .attr('stroke-width', d => (d.id === selectedLakeId ? 1.8 : 1));

    // Label only selected or Critical lakes to avoid clutter
    lakeGroups
      .filter(d => d.id === selectedLakeId || d.current_risk_level === 'Critical')
      .append('text')
      .attr('x', d => (projection([d.location_lng, d.location_lat])?.[0] || 0) + 10)
      .attr('y', d => (projection([d.location_lng, d.location_lat])?.[1] || 0) + 3)
      .text(d => d.name)
      .attr('fill', d => (d.id === selectedLakeId ? '#F8FAFC' : '#94A3B8'))
      .attr('font-size', d => (d.id === selectedLakeId ? '10px' : '8.5px'))
      .attr('font-weight', d => (d.id === selectedLakeId ? '600' : '400'))
      .attr('font-family', 'IBM Plex Mono, monospace')
      .style('pointer-events', 'none');

  }, [lakes, selectedLakeId, regionFilter, onSelectLake]);

  return (
    <div className="bg-[#0D1117] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
        <div>
          <h3 className="text-sm font-semibold text-white">Indian Himalayan Glacial Lake Network</h3>
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
            Showing {visibleLakes.length} of {lakes.length} monitored glacial lakes · EPSG:4326 Mercator
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#07090E] border border-white/10 rounded-lg">
          {regions.map(region => (
            <button
              key={region}
              onClick={() => setRegionFilter(region)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                regionFilter === region
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {region === 'All' ? 'All Regions' : region.replace(' Himalaya', '')}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg ref={svgRef} viewBox="0 0 760 400" className="w-full h-auto block cursor-crosshair" />

        {hoveredLake && (
          <div className="absolute top-3 left-3 bg-[#07090E]/95 border border-white/15 rounded-lg px-3.5 py-2.5 pointer-events-none max-w-xs">
            <div className="text-xs font-semibold text-white">{hoveredLake.name}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {hoveredLake.region} · {hoveredLake.elevation.toFixed(0)} m
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px] font-mono tabular-nums">
              <span className="text-slate-400">Area: <strong className="text-slate-200">{hoveredLake.area_km2.toFixed(2)} km²</strong></span>
              <span className="text-slate-400">LSTM: <strong className="text-sky-400">{(hoveredLake.lstm_probability * 100).toFixed(1)}%</strong></span>
              <span className="text-slate-400">Dam: <strong className="text-slate-200">{hoveredLake.dam_type}</strong></span>
              <span className="text-slate-400">Risk: <strong className={
                hoveredLake.current_risk_level === 'Critical' ? 'text-red-400' :
                hoveredLake.current_risk_level === 'High' ? 'text-amber-400' :
                hoveredLake.current_risk_level === 'Moderate' ? 'text-sky-400' : 'text-emerald-400'
              }>{hoveredLake.current_risk_level}</strong></span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-t border-white/10 text-xs font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-5">
          <span className="text-red-400">✖ Critical ({lakes.filter(l => l.current_risk_level === 'Critical').length})</span>
          <span className="text-amber-400">▲ High ({lakes.filter(l => l.current_risk_level === 'High').length})</span>
          <span className="text-sky-400">◆ Moderate ({lakes.filter(l => l.current_risk_level === 'Moderate').length})</span>
          <span className="text-emerald-400">● Low ({lakes.filter(l => l.current_risk_level === 'Low').length})</span>
        </div>
        <span className="text-slate-500">Click any marker to inspect lake telemetry</span>
      </div>
    </div>
  );
};
