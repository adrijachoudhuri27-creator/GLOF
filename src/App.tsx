import React, { useState, useEffect, useMemo } from 'react';
import { GlacialLake, LakeMetric, Alert, LstmModelSummary } from './types';
import { GlacialMap } from './components/GlacialMap';
import { LstmModelView } from './components/LstmModelView';
import { MetricChart } from './components/MetricChart';
import { RiskAssessment } from './components/RiskAssessment';
import { RiskRadar } from './components/RiskRadar';
import { FloodMap, BreachScenario, computeHydrology } from './components/FloodMap';
import { RiskReport } from './components/RiskReport';
import { SatelliteImagery } from './components/SatelliteImagery';
import {
  Mountain,
  Bell,
  LayoutDashboard,
  Layers,
  Cpu,
  Droplets,
  TrendingUp,
  FileText,
  RefreshCw,
  Search,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Page =
  | 'Dashboard'
  | 'LSTM Predictions'
  | 'Time Series (10Y)'
  | 'Satellite & DEM'
  | 'Flood Simulation'
  | 'Risk Reports';

function riskGlyph(level: GlacialLake['current_risk_level']) {
  if (level === 'Critical') return { glyph: '✖', color: 'text-red-400' };
  if (level === 'High') return { glyph: '▲', color: 'text-amber-400' };
  if (level === 'Moderate') return { glyph: '◆', color: 'text-sky-400' };
  return { glyph: '●', color: 'text-emerald-400' };
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [lakes, setLakes] = useState<GlacialLake[]>([]);
  const [selectedLakeId, setSelectedLakeId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<LakeMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [modelSummary, setModelSummary] = useState<LstmModelSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [floodScenario, setFloodScenario] = useState<BreachScenario>('Average');
  const [timeWindowYears, setTimeWindowYears] = useState<1 | 3 | 5 | 10>(10);
  const [lakeSearch, setLakeSearch] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const [lakesRes, alertsRes, modelRes] = await Promise.all([
          fetch('/api/lakes'),
          fetch('/api/alerts'),
          fetch('/api/model-summary'),
        ]);
        if (!lakesRes.ok) throw new Error('Failed to load glacial lake registry');
        const lakesData: GlacialLake[] = await lakesRes.json();
        const alertsData: Alert[] = alertsRes.ok ? await alertsRes.json() : [];
        const modelData: LstmModelSummary | null = modelRes.ok ? await modelRes.json() : null;

        setLakes(lakesData);
        setAlerts(alertsData);
        setModelSummary(modelData);
        if (lakesData.length > 0) {
          setSelectedLakeId(lakesData[0].id);
        }
      } catch (err: any) {
        console.error(err);
        setLoadError(err?.message || 'Unable to connect to telemetry server');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedLakeId) return;
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`/api/lakes/${selectedLakeId}/metrics?years=${timeWindowYears}`);
        if (res.ok) {
          const data: LakeMetric[] = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMetrics();
  }, [selectedLakeId, timeWindowYears]);

  const selectedLake = useMemo(
    () => lakes.find((l) => l.id === selectedLakeId) || lakes[0] || null,
    [lakes, selectedLakeId]
  );

  const filteredLakes = useMemo(() => {
    const q = lakeSearch.trim().toLowerCase();
    if (!q) return lakes;
    return lakes.filter(
      (l) => l.name.toLowerCase().includes(q) || l.region.toLowerCase().includes(q) || l.id.toLowerCase().includes(q)
    );
  }, [lakes, lakeSearch]);

  const groupedRegions = useMemo(
    () => Array.from(new Set(filteredLakes.map((l) => l.region))).sort(),
    [filteredLakes]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-7 h-7 text-sky-400 animate-spin" />
          <p className="text-slate-400 font-mono text-xs tracking-wider uppercase">
            Loading 20 Glacial Lakes & 10-Year Telemetry...
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center p-6">
        <div className="bg-[#0D1117] border border-red-500/30 rounded-xl p-6 max-w-md text-center space-y-3">
          <h2 className="text-base font-semibold text-white">Telemetry Connection Error</h2>
          <p className="text-xs text-slate-400">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const navItems: { id: Page; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'Dashboard', icon: LayoutDashboard },
    { id: 'LSTM Predictions', icon: Cpu },
    { id: 'Time Series (10Y)', icon: TrendingUp },
    { id: 'Satellite & DEM', icon: Layers },
    { id: 'Flood Simulation', icon: Droplets },
    { id: 'Risk Reports', icon: FileText },
  ];

  const highRiskCount = lakes.filter(
    (l) => l.current_risk_level === 'Critical' || l.current_risk_level === 'High'
  ).length;
  const avgExpansionPct =
    lakes.length > 0
      ? (
          lakes.reduce((acc, l) => acc + ((l.area_km2 - l.area_10y_ago_km2) / l.area_10y_ago_km2) * 100, 0) /
          lakes.length
        ).toFixed(1)
      : '0.0';
  const totalPopRisk = lakes.reduce((acc, l) => acc + l.population_at_risk, 0);

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-200 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-[272px] shrink-0 bg-[#0B0F17] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col lg:h-screen lg:sticky lg:top-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sky-500/15 border border-sky-500/30 rounded-lg flex items-center justify-center text-sky-400 shrink-0">
              <Mountain className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white tracking-tight text-sm truncate">GLOF Early Warning</div>
              <div className="text-[11px] text-slate-400 font-mono truncate">Indian Himalayan Region</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 border-b border-white/10">
          {navItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                  active
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                )}
              >
                <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-sky-400' : 'text-slate-500')} />
                <span>{item.id}</span>
              </button>
            );
          })}
        </nav>

        {/* Search & 20 Glacial Lakes Selector */}
        <div className="flex-1 flex flex-col min-h-0 p-3">
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={lakeSearch}
              onChange={(e) => setLakeSearch(e.target.value)}
              placeholder="Filter 20 lakes..."
              aria-label="Filter glacial lakes"
              className="w-full bg-[#07090E] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 max-h-[260px] lg:max-h-none">
            {groupedRegions.map((region) => (
              <div key={region}>
                <div className="px-2 py-1 text-[11px] font-mono text-slate-500">
                  {region}
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {filteredLakes
                    .filter((l) => l.region === region)
                    .map((lake) => {
                      const rg = riskGlyph(lake.current_risk_level);
                      const isSelected = selectedLake?.id === lake.id;
                      return (
                        <button
                          key={lake.id}
                          onClick={() => setSelectedLakeId(lake.id)}
                          className={cn(
                            'w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between gap-2',
                            isSelected
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          )}
                        >
                          <span className="truncate">{lake.name}</span>
                          <span className={cn('text-[11px] font-mono shrink-0 tabular-nums', rg.color)}>
                            {rg.glyph} {(lake.lstm_probability * 100).toFixed(0)}%
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
            {groupedRegions.length === 0 && (
              <p className="text-xs text-slate-500 px-2 py-4 text-center">No lakes match "{lakeSearch}"</p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1440px] mx-auto w-full">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-end gap-6 pb-6 mb-8 border-b border-white/10">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight text-balance">
              GLOF Early Warning & Risk Assessment System
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-1.5 tabular-nums">
              {modelSummary ? `${modelSummary.classificationAccuracy.toFixed(1)}% Classification Accuracy` : '98.5% Classification Accuracy'} · {lakes.length} Glacial Lakes · 10 Years of Data (2016–2026)
            </p>
          </div>

          {selectedLake && (
            <div className="flex items-center gap-4 bg-[#0D1117] px-4 py-2.5 rounded-lg border border-white/10">
              <div>
                <div className="text-xs text-slate-400 font-mono">
                  {selectedLake.id} · {selectedLake.region}
                </div>
                <div className="text-sm font-semibold text-white">
                  {selectedLake.name} · {selectedLake.elevation.toFixed(0)} m
                </div>
              </div>
              <div className="h-7 w-px bg-white/10" />
              <div className="text-right font-mono tabular-nums">
                <div className="text-[11px] text-slate-400">LSTM Signal</div>
                <div className={cn('text-xs font-semibold', riskGlyph(selectedLake.current_risk_level).color)}>
                  {riskGlyph(selectedLake.current_risk_level).glyph} {selectedLake.lstm_predicted_class} ({(selectedLake.lstm_probability * 100).toFixed(1)}%)
                </div>
              </div>
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage + (selectedLake?.id || '')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {currentPage === 'Dashboard' && selectedLake && (
              <div className="space-y-8">
                {/* Primary Map + Warning Signals Split */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                  <div className="xl:col-span-8 flex flex-col gap-6">
                    <GlacialMap
                      lakes={lakes}
                      selectedLakeId={selectedLake.id}
                      onSelectLake={setSelectedLakeId}
                    />

                    {/* 4-Column KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-[#0D1117] p-4 rounded-xl border border-white/10">
                        <div className="text-xs text-slate-400">Glacial Lakes Covered</div>
                        <div className="text-2xl font-mono font-semibold text-white mt-1 tabular-nums">
                          {lakes.length}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">5 Himalayan basins</div>
                      </div>
                      <div className="bg-[#0D1117] p-4 rounded-xl border border-white/10">
                        <div className="text-xs text-slate-400">LSTM Model Accuracy</div>
                        <div className="text-2xl font-mono font-semibold text-sky-400 mt-1 tabular-nums">
                          {modelSummary ? `${modelSummary.classificationAccuracy.toFixed(1)}%` : '98.5%'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">10Y sequence classifier</div>
                      </div>
                      <div className="bg-[#0D1117] p-4 rounded-xl border border-white/10">
                        <div className="text-xs text-slate-400">High / Critical Lakes</div>
                        <div className="text-2xl font-mono font-semibold text-amber-400 mt-1 tabular-nums">
                          {highRiskCount}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">Mean 10Y growth +{avgExpansionPct}%</div>
                      </div>
                      <div className="bg-[#0D1117] p-4 rounded-xl border border-white/10">
                        <div className="text-xs text-slate-400">Population Exposed</div>
                        <div className="text-2xl font-mono font-semibold text-white mt-1 tabular-nums">
                          {(totalPopRisk / 1000).toFixed(1)}k
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">Downstream corridors</div>
                      </div>
                    </div>
                  </div>

                  {/* Active LSTM Early Warning Signals */}
                  <div className="xl:col-span-4 bg-[#0D1117] p-5 rounded-xl border border-white/10 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-400" /> Active Early Warning Signals
                      </h3>
                      <span className="text-xs font-mono text-slate-400 tabular-nums">{alerts.length} alerts</span>
                    </div>

                    <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-[500px] pr-1">
                      {alerts.map((alert) => (
                        <button
                          key={alert.lake_id}
                          onClick={() => setSelectedLakeId(alert.lake_id)}
                          className={cn(
                            'w-full text-left p-3.5 rounded-lg border transition-colors',
                            alert.lake_id === selectedLake.id
                              ? 'bg-white/5 border-sky-500/40'
                              : 'bg-[#07090E] border-white/10 hover:border-white/20'
                          )}
                        >
                          <div className="flex justify-between items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-white truncate">{alert.name}</span>
                            <span
                              className={cn(
                                'text-[11px] font-mono shrink-0 tabular-nums',
                                alert.level === 'Critical'
                                  ? 'text-red-400'
                                  : alert.level === 'High'
                                    ? 'text-amber-400'
                                    : 'text-sky-400'
                              )}
                            >
                              {alert.level} · {(alert.lstm_risk_prob * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mb-1.5">
                            {alert.region} · WL {alert.water_level.toFixed(1)} m
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{alert.message}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* High-Density 20-Lake Risk Registry Table */}
                <div className="bg-[#0D1117] border border-white/10 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        20 Glacial Lakes — 10-Year Historical & Geospatial Risk Matrix
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">
                        Click any row to focus dashboards, LSTM predictions, and flood simulation on that lake
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentPage('LSTM Predictions')}
                      className="px-3.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Inspect LSTM Model (98.5%)
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 font-mono bg-[#07090E]/60">
                          <th className="py-3 px-4 font-medium">Lake</th>
                          <th className="py-3 px-4 font-medium">Region</th>
                          <th className="py-3 px-4 font-medium">Dam Type</th>
                          <th className="py-3 px-4 font-medium text-right">Elevation</th>
                          <th className="py-3 px-4 font-medium text-right">Area (2026)</th>
                          <th className="py-3 px-4 font-medium text-right">10Y Growth</th>
                          <th className="py-3 px-4 font-medium text-right">LSTM Prob</th>
                          <th className="py-3 px-4 font-medium text-right">Pop. Exposed</th>
                          <th className="py-3 px-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {lakes.map((lake) => {
                          const growthPct = (
                            ((lake.area_km2 - lake.area_10y_ago_km2) / lake.area_10y_ago_km2) *
                            100
                          ).toFixed(1);
                          const rg = riskGlyph(lake.current_risk_level);
                          const isSelected = lake.id === selectedLake.id;
                          return (
                            <tr
                              key={lake.id}
                              onClick={() => setSelectedLakeId(lake.id)}
                              className={cn(
                                'cursor-pointer transition-colors',
                                isSelected ? 'bg-sky-500/10' : 'hover:bg-white/[0.03]'
                              )}
                            >
                              <td className="py-2.5 px-4 font-medium text-white whitespace-nowrap">{lake.name}</td>
                              <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">{lake.region}</td>
                              <td className="py-2.5 px-4 text-slate-300 font-mono whitespace-nowrap">{lake.dam_type}</td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-300 tabular-nums">
                                {lake.elevation.toFixed(0)} m
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-200 tabular-nums">
                                {lake.area_km2.toFixed(2)} km²
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-amber-400 tabular-nums">
                                +{growthPct}%
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-sky-400 tabular-nums">
                                {(lake.lstm_probability * 100).toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-300 tabular-nums">
                                {lake.population_at_risk.toLocaleString()}
                              </td>
                              <td className={cn('py-2.5 px-4 font-mono whitespace-nowrap', rg.color)}>
                                {rg.glyph} {lake.current_risk_level}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {currentPage === 'LSTM Predictions' && selectedLake && (
              <div className="space-y-6">
                <LstmModelView lake={selectedLake} metrics={metrics} modelSummary={modelSummary} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RiskRadar lake={selectedLake} />
                  <RiskAssessment lake={selectedLake} metrics={metrics} />
                </div>
              </div>
            )}

            {currentPage === 'Time Series (10Y)' && selectedLake && (
              <div className="space-y-6">
                <div className="bg-[#0D1117] p-5 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      10-Year Historical & Geospatial Risk Trends — {selectedLake.name}
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5 tabular-nums">
                      Showing {metrics.length} monthly observations ({timeWindowYears}Y horizon) · Surface Area 2016: {selectedLake.area_10y_ago_km2.toFixed(2)} km² → 2026: {selectedLake.area_km2.toFixed(2)} km²
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-[#07090E] border border-white/10 rounded-lg">
                    {([1, 3, 5, 10] as const).map((yrs) => (
                      <button
                        key={yrs}
                        onClick={() => setTimeWindowYears(yrs)}
                        className={cn(
                          'px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap shrink-0',
                          timeWindowYears === yrs
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        )}
                      >
                        {yrs}Y
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <MetricChart
                    metrics={metrics}
                    title="Glacial Lake Surface Area"
                    dataKey="surface_area"
                    color="#38BDF8"
                    unit="km²"
                    decimals={3}
                  />
                  <MetricChart
                    metrics={metrics}
                    title="Hydrostatic Water Level"
                    dataKey="water_level"
                    color="#818CF8"
                    unit="m"
                    decimals={2}
                  />
                  <MetricChart
                    metrics={metrics}
                    title="LSTM Outburst Risk Probability"
                    dataKey="lstm_risk_prob"
                    color="#F59E0B"
                    unit="prob"
                    decimals={3}
                  />
                  <MetricChart
                    metrics={metrics}
                    title="Glacier Ice Thickness"
                    dataKey="ice_thickness"
                    color="#10B981"
                    unit="m"
                    decimals={2}
                  />
                </div>

                {/* Early Warning Signal Event Log */}
                <div className="bg-[#0D1117] p-6 rounded-xl border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" /> Detected Early Warning Signal Peaks ({timeWindowYears}Y Window)
                  </h3>
                  <div className="space-y-2.5">
                    {metrics
                      .filter((m) => m.predicted_signal === 'Warning' || m.predicted_signal === 'Critical')
                      .slice(-6)
                      .reverse()
                      .map((m) => (
                        <div
                          key={m.id}
                          className="p-3 bg-[#07090E] rounded-lg border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
                        >
                          <span className={m.predicted_signal === 'Critical' ? 'text-red-400' : 'text-amber-400'}>
                            {m.predicted_signal === 'Critical' ? '✖ Critical Signal' : '▲ Warning Signal'}
                          </span>
                          <span className="text-slate-300 tabular-nums">
                            {m.timestamp.slice(0, 7)} · LSTM Prob {(m.lstm_risk_prob * 100).toFixed(1)}% · Area {m.surface_area.toFixed(3)} km² · WL {m.water_level.toFixed(2)} m
                          </span>
                        </div>
                      ))}
                    {metrics.filter((m) => m.predicted_signal === 'Warning' || m.predicted_signal === 'Critical').length === 0 && (
                      <p className="text-xs text-slate-400 font-mono">
                        No Warning or Critical LSTM sequences triggered in this {timeWindowYears}-year window.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentPage === 'Satellite & DEM' && selectedLake && <SatelliteImagery lake={selectedLake} />}

            {currentPage === 'Flood Simulation' && selectedLake && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-[#0D1117] p-5 rounded-xl border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-4">Dam Breach Scenario</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'Average', label: '25% Breach' },
                        { id: 'Moderate', label: '50% Breach' },
                        { id: 'Worst', label: '100% Breach' },
                      ] as const).map((sc) => (
                        <button
                          key={sc.id}
                          onClick={() => setFloodScenario(sc.id)}
                          className={cn(
                            'py-2 px-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap',
                            floodScenario === sc.id
                              ? 'bg-sky-600 border-sky-500 text-white'
                              : 'bg-[#07090E] border-white/10 text-slate-400 hover:text-slate-200'
                          )}
                        >
                          {sc.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0D1117] p-5 rounded-xl border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-4">Downstream Impact Telemetry</h3>
                    {(() => {
                      const hydro = computeHydrology(selectedLake, floodScenario);
                      return (
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-slate-400">Est. Peak Discharge</span>
                            <span className="text-white font-mono tabular-nums">
                              {hydro.peakDischarge.toLocaleString()} m³/s
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-slate-400">Max Inundation Depth</span>
                            <span className="text-white font-mono tabular-nums">{hydro.maxDepth} m</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-slate-400">Wave Arrival Time</span>
                            <span className="text-amber-400 font-mono tabular-nums">{hydro.arrivalMin} min</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-slate-400">Population at Risk</span>
                            <span className="text-white font-mono tabular-nums">
                              {selectedLake.population_at_risk.toLocaleString()}
                            </span>
                          </div>
                          <div className="pt-1">
                            <div className="text-slate-400 mb-1">Exposed Infrastructure</div>
                            <div className="text-slate-200 leading-relaxed">{selectedLake.infrastructure_at_risk}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="lg:col-span-8">
                  <FloodMap lake={selectedLake} scenario={floodScenario} />
                </div>
              </div>
            )}

            {currentPage === 'Risk Reports' && selectedLake && (
              <RiskReport lake={selectedLake} metrics={metrics} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
