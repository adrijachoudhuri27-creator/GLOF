import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GlacialLake } from '../types';

export type BreachScenario = 'Average' | 'Moderate' | 'Worst';

interface Props {
  lake: GlacialLake;
  scenario: BreachScenario;
}

export function computeHydrology(lake: GlacialLake, scenario: BreachScenario) {
  const breachFraction = scenario === 'Worst' ? 1.0 : scenario === 'Moderate' ? 0.5 : 0.25;
  const releasedVolM3 = lake.volume_million_m3 * 1e6 * breachFraction;
  // Empirical Froehlich / Walder-O'Connor peak discharge scaling (m3/s)
  const peakDischarge = Math.round(0.607 * Math.pow(releasedVolM3, 0.295) * (1 + lake.slope_index * 0.45));
  const maxDepth = Number((1.8 + breachFraction * 6.4 * (0.7 + lake.slope_index * 0.5)).toFixed(1));
  const arrivalMin = Math.max(8, Math.round(42 / (0.8 + lake.slope_index * 0.7) / Math.sqrt(breachFraction + 0.35)));
  return { breachFraction, peakDischarge, maxDepth, arrivalMin };
}

export const FloodMap: React.FC<Props> = ({ lake, scenario }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [probe, setProbe] = useState<{ elev: number; depth: number } | null>(null);
  const { peakDischarge, maxDepth, arrivalMin } = computeHydrology(lake, scenario);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 640;
    const height = 400;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const n = 64;
    const m = 40;
    const values = new Array<number>(n * m);

    // Generate realistic glacial valley topography draining left-to-right
    for (let j = 0; j < m; ++j) {
      for (let i = 0; i < n; ++i) {
        const x = i / (n - 1);
        const y = j / (m - 1);
        // Winding valley thalweg centerline
        const riverY = 0.5 + 0.14 * Math.sin(x * Math.PI * 2.1);
        const distToChannel = Math.abs(y - riverY);
        const downslope = (1 - x) * 18;
        const valleyWalls = 42 * Math.pow(distToChannel, 1.45);
        const lakeBowl = Math.hypot(x - 0.18, y - 0.5) < 0.11 ? -6 : 0;
        values[j * n + i] = lake.elevation - 220 + downslope + valleyWalls + lakeBowl;
      }
    }

    const minElev = Math.min(...values);
    const maxElev = Math.max(...values);
    const terrainColor = d3.scaleSequential(d3.interpolateRgb('#111827', '#334155')).domain([minElev, maxElev]);

    const cellW = width / n;
    const cellH = height / m;

    // Draw elevation grid
    const grid = svg.append('g');
    for (let j = 0; j < m; ++j) {
      for (let i = 0; i < n; ++i) {
        const elev = values[j * n + i];
        grid
          .append('rect')
          .attr('x', i * cellW)
          .attr('y', j * cellH)
          .attr('width', cellW + 0.5)
          .attr('height', cellH + 0.5)
          .attr('fill', terrainColor(elev));
      }
    }

    // Draw topographic contour lines
    const contours = d3.contours().size([n, m]).thresholds(10)(values);
    svg
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#475569')
      .attr('stroke-opacity', 0.45)
      .attr('stroke-width', 0.7)
      .selectAll('path')
      .data(contours)
      .enter()
      .append('path')
      .attr('d', d3.geoPath(d3.geoIdentity().scale(cellW)));

    // Compute flood inundation mask along downstream valley channel
    const floodReachX = scenario === 'Worst' ? 0.96 : scenario === 'Moderate' ? 0.84 : 0.68;
    const floodWidthFactor = scenario === 'Worst' ? 0.14 : scenario === 'Moderate' ? 0.095 : 0.06;

    const floodGroup = svg.append('g');
    for (let j = 0; j < m; ++j) {
      for (let i = 0; i < n; ++i) {
        const x = i / (n - 1);
        const y = j / (m - 1);
        const riverY = 0.5 + 0.14 * Math.sin(x * Math.PI * 2.1);
        const distToChannel = Math.abs(y - riverY);
        const isLake = Math.hypot(x - 0.18, y - 0.5) < 0.095;
        const inFloodPlume = x >= 0.16 && x <= floodReachX && distToChannel < floodWidthFactor * (1 - x * 0.25);

        if (isLake || inFloodPlume) {
          const depth = isLake
            ? 8.5
            : Math.max(0.4, maxDepth * (1 - distToChannel / floodWidthFactor) * (1 - x * 0.35));
          floodGroup
            .append('rect')
            .attr('x', i * cellW)
            .attr('y', j * cellH)
            .attr('width', cellW + 0.4)
            .attr('height', cellH + 0.4)
            .attr('fill', isLake ? 'rgba(6, 182, 212, 0.78)' : `rgba(56, 189, 248, ${Math.min(0.75, 0.22 + depth / 11)})`);
        }
      }
    }

    // Downstream Infrastructure & Settlements
    const nodes = [
      { x: 0.18, y: 0.50, name: lake.name, color: '#38BDF8', kind: 'Source Lake' },
      { x: 0.32, y: 0.54, name: 'Moraine Dam Crest', color: '#F59E0B', kind: 'Breach Point' },
      { x: 0.55, y: 0.44, name: 'Upstream Bridge', color: '#EF4444', kind: 'Infrastructure' },
      { x: 0.74, y: 0.37, name: 'Valley Settlement', color: '#EF4444', kind: 'Population' },
      { x: 0.89, y: 0.49, name: 'Hydropower Intake', color: '#EF4444', kind: 'Critical Asset' },
    ];

    nodes.forEach((node) => {
      svg
        .append('circle')
        .attr('cx', node.x * width)
        .attr('cy', node.y * height)
        .attr('r', 5)
        .attr('fill', node.color)
        .attr('stroke', '#090D14')
        .attr('stroke-width', 1.5);

      svg
        .append('text')
        .attr('x', node.x * width + 8)
        .attr('y', node.y * height - 6)
        .attr('fill', '#F8FAFC')
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text(node.name);
    });

    // Interactive hover probe
    svg.on('mousemove', (event) => {
      const [mx, my] = d3.pointer(event);
      const gi = Math.min(n - 1, Math.max(0, Math.floor((mx / width) * n)));
      const gj = Math.min(m - 1, Math.max(0, Math.floor((my / height) * m)));
      const x = gi / (n - 1);
      const y = gj / (m - 1);
      const riverY = 0.5 + 0.14 * Math.sin(x * Math.PI * 2.1);
      const dist = Math.abs(y - riverY);
      const inPlume = x >= 0.16 && x <= floodReachX && dist < floodWidthFactor * (1 - x * 0.25);
      const depth = inPlume ? Number((maxDepth * (1 - dist / floodWidthFactor) * (1 - x * 0.35)).toFixed(1)) : 0;
      setProbe({ elev: Math.round(values[gj * n + gi]), depth });
    }).on('mouseleave', () => setProbe(null));
  }, [lake, scenario, maxDepth]);

  return (
    <div className="bg-[#0D1117] p-6 rounded-xl border border-white/10">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Hydrodynamic Breach & Inundation Corridor</h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5 tabular-nums">
            Peak Qp: {peakDischarge.toLocaleString()} m³/s · Max Depth: {maxDepth} m · Arrival: {arrivalMin} min
          </p>
        </div>
        {probe && (
          <div className="text-xs font-mono text-sky-300 bg-[#07090E] border border-white/10 px-3 py-1.5 rounded tabular-nums">
            Elev: {probe.elev} m · Flood Depth: {probe.depth} m
          </div>
        )}
      </div>

      <svg ref={svgRef} viewBox="0 0 640 400" className="w-full h-auto rounded-lg cursor-crosshair border border-white/10" />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 font-mono">
        <div className="flex flex-wrap items-center gap-5">
          <span className="text-sky-400">■ Modeled Inundation Extent</span>
          <span className="text-amber-400">● Breach Crest</span>
          <span className="text-red-400">● Exposed Infrastructure / Settlements</span>
        </div>
        <span className="text-slate-500">Hover valley map to probe elevation & depth</span>
      </div>
    </div>
  );
};
