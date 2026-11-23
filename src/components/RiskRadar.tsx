import React from 'react';
import * as d3 from 'd3';
import { GlacialLake } from '../types';

interface Props {
  lake: GlacialLake;
}

export const RiskRadar: React.FC<Props> = ({ lake }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!svgRef.current) return;

    const width = 420;
    const height = 380;
    const margin = 64;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    const expansionRatio = Math.min(
      1,
      Math.max(0.05, (lake.area_km2 - lake.area_10y_ago_km2) / Math.max(0.1, lake.area_10y_ago_km2) * 2)
    );

    const features = [
      { name: 'Dam Instability', value: Math.min(1, Math.max(0.05, lake.dam_stability_index)) },
      { name: 'Volume Index', value: Math.min(1, Math.max(0.05, lake.volume_million_m3 / 12)) },
      { name: 'Slope Gradient', value: Math.min(1, Math.max(0.05, lake.slope_index)) },
      { name: 'Glacier Coupling', value: Math.min(1, Math.max(0.05, 1 - lake.distance_to_glacier_km / 4)) },
      { name: 'Thermal Index', value: Math.min(1, Math.max(0.05, lake.temperature_index)) },
      { name: '10Y Expansion', value: expansionRatio },
    ];

    const angleSlice = (Math.PI * 2) / features.length;
    const levels = 5;

    // Polygonal spider rings
    for (let j = 0; j < levels; j++) {
      const r = (radius / levels) * (j + 1);
      const ringPoints = features.map((_, i) => {
        const x = r * Math.cos(angleSlice * i - Math.PI / 2);
        const y = r * Math.sin(angleSlice * i - Math.PI / 2);
        return `${x},${y}`;
      });
      g.append('polygon')
        .attr('points', ringPoints.join(' '))
        .attr('fill', 'none')
        .attr('stroke', '#1E293B')
        .attr('stroke-width', 1);
    }

    // Axes & vertex labels
    features.forEach((f, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#334155')
        .attr('stroke-width', 1);

      const labelR = radius + 24;
      g.append('text')
        .attr('x', labelR * Math.cos(angle))
        .attr('y', labelR * Math.sin(angle) + 3)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94A3B8')
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text(f.name);
    });

    const line = d3
      .lineRadial<{ value: number }>()
      .radius((d) => d.value * radius)
      .angle((_d, i) => i * angleSlice);

    const dataPoints = [...features, features[0]];

    g.append('path')
      .datum(dataPoints)
      .attr('d', line as any)
      .attr('fill', 'rgba(56, 189, 248, 0.22)')
      .attr('stroke', '#38BDF8')
      .attr('stroke-width', 2);

    // Vertex data markers
    features.forEach((f, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      g.append('circle')
        .attr('cx', f.value * radius * Math.cos(angle))
        .attr('cy', f.value * radius * Math.sin(angle))
        .attr('r', 3.5)
        .attr('fill', '#38BDF8')
        .attr('stroke', '#090D14')
        .attr('stroke-width', 1.2);
    });
  }, [lake]);

  return (
    <div className="bg-[#0D1117] p-6 rounded-xl border border-white/10 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Geospatial Risk Factor Profile</h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">6-Indicator Normalized Polygon</p>
        </div>
        <span className="text-xs font-mono text-sky-400 tabular-nums">
          Score {(lake.risk_score * 100).toFixed(0)}/100
        </span>
      </div>
      <svg ref={svgRef} viewBox="0 0 420 380" className="w-full max-w-[420px] h-auto" />
    </div>
  );
};
