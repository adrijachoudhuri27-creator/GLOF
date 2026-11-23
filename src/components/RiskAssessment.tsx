import React, { useState } from 'react';
import { GlacialLake, LakeMetric } from '../types';
import { Brain, Loader2, ShieldCheck } from 'lucide-react';
import Markdown from 'react-markdown';

interface Props {
  lake: GlacialLake;
  metrics: LakeMetric[];
}

export const RiskAssessment: React.FC<Props> = ({ lake }) => {
  const [assessment, setAssessment] = useState<string | null>(null);
  const [sourceTag, setSourceTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAssessment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lakeId: lake.id }),
      });
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const data = await res.json();
      setAssessment(data.report);
      setSourceTag(data.source === 'gemini-lstm' ? 'Gemini + Bi-LSTM Telemetry' : 'Bi-LSTM Decision Engine');
    } catch (err) {
      console.error('Assessment Error:', err);
      setError('Unable to reach risk assessment service. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0D1117] p-6 rounded-xl border border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/15 border border-sky-500/20 rounded-lg">
            <Brain className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Decision-Support Brief — {lake.name}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {sourceTag ? sourceTag : `LSTM Signal: ${lake.lstm_predicted_class} (${(lake.lstm_probability * 100).toFixed(1)}%)`}
            </p>
          </div>
        </div>
        <button
          onClick={generateAssessment}
          disabled={loading}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
          {loading ? 'Analyzing...' : 'Generate Assessment'}
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      {assessment ? (
        <div className="prose prose-invert prose-sm max-w-none bg-[#07090E] p-5 rounded-lg border border-white/10 max-h-[380px] overflow-y-auto custom-scrollbar">
          <Markdown>{assessment}</Markdown>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-white/15 rounded-lg bg-[#07090E]/50">
          <ShieldCheck className="w-10 h-10 mb-3 text-slate-600" />
          <p className="text-xs text-center max-w-sm">
            Run the decision-support generator to synthesize 10-year lake expansion, moraine stability, and LSTM outburst probability.
          </p>
        </div>
      )}
    </div>
  );
};
