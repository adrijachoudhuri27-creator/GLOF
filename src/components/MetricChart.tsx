import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { LakeMetric } from '../types';
import { format } from 'date-fns';

interface Props {
  metrics: LakeMetric[];
  title: string;
  dataKey: keyof LakeMetric;
  color: string;
  unit?: string;
  decimals?: number;
  higherIsWorse?: boolean;
}

export const MetricChart: React.FC<Props> = ({
  metrics,
  title,
  dataKey,
  color,
  unit = '',
  decimals = 2,
  higherIsWorse = true,
}) => {
  const chartData = metrics.map((m) => ({
    ...m,
    formattedDate: format(new Date(m.timestamp), metrics.length > 36 ? 'MMM yy' : 'MMM dd, yy'),
  }));

  const hasData = metrics.length > 0;
  const firstVal = Number(metrics[0]?.[dataKey] ?? 0);
  const latestVal = Number(metrics[metrics.length - 1]?.[dataKey] ?? 0);
  const delta = latestVal - firstVal;
  const isWorse = higherIsWorse ? delta > 0 : delta < 0;

  return (
    <div className="bg-[#0D1117] p-5 rounded-xl border border-white/10 h-[310px] flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-semibold text-white tabular-nums">
              {hasData ? latestVal.toFixed(decimals) : '—'}
            </span>
            <span className="text-xs font-mono text-slate-400">{unit}</span>
          </div>
        </div>
        <div className="text-right font-mono text-xs tabular-nums">
          <div className={!hasData ? 'text-slate-500' : isWorse ? 'text-amber-400' : 'text-emerald-400'}>
            {hasData ? `${delta >= 0 ? '+' : ''}${delta.toFixed(decimals)} ${unit}` : '—'}
          </div>
          <div className="text-[11px] text-slate-500">Window change</div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis
              dataKey="formattedDate"
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0B0F17',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'IBM Plex Mono, monospace',
              }}
              itemStyle={{ color: '#F8FAFC' }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fillOpacity={1}
              fill={`url(#gradient-${dataKey})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
