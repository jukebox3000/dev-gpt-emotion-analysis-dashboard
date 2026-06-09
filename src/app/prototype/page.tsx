'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { loadTurns, filterTurns } from '@/lib/data-loader';
import type { Turn } from '@/lib/types';
import ChartTooltip, { useTooltipState } from '@/components/shared/ChartTooltip';
import ChartContainer from '@/components/shared/ChartContainer';
import {
  ProtoEmotionDonut,
  ProtoDirectComparison,
  ProtoCodeImpact,
  ProtoEmotionHeatmap,
  ProtoComplexityEmotion,
  ProtoLongPromptScatter,
} from '@/components/prototype/PrototypeCharts';

export default function PrototypePage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  const tooltipData = useTooltipState();

  useEffect(() => {
    loadTurns().then(t => { setTurns(t); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const data = useMemo(() => filterTurns(turns, {}), [turns]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-600 hover:text-blue-600 font-medium transition flex items-center gap-1.5">
            ← Back to Main Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-sm font-bold text-slate-700">🧪 Prototype Charts — Real DevGPT Data</h1>
        </div>
        {!loading && (
          <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
            {data.length.toLocaleString()} turns loaded
          </span>
        )}
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">DevGPT Prototype Visualizations</h2>
          <p className="text-sm text-slate-500 mt-1">
            All charts powered by real data from{' '}
            <code className="text-xs bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-700">
              public/data/processed_conversations.json
            </code>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-sm text-slate-500 font-medium">Loading real DevGPT data…</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="Raw Emotion Label Distribution" subtitle="All GoEmotions raw labels across all turns">
                {({ width, height }) => <ProtoEmotionDonut data={data} width={width} height={height} />}
              </ChartContainer>
              <ChartContainer title="Dev vs GPT — Raw Label Comparison" subtitle="Raw emotion labels per speaker, from real data">
                {({ width, height }) => <ProtoDirectComparison data={data} width={width} height={height} />}
              </ChartContainer>
            </div>

            <ChartContainer title="Dev Emotion vs Prompt Complexity" subtitle="How developer emotions distribute across Low / Medium / High prompts">
              {({ width, height }) => <ProtoComplexityEmotion data={data} width={width} height={height} />}
            </ChartContainer>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="Dev→GPT Emotion Mapping" subtitle="Turn-pair heatmap: what GPT emotion follows each developer emotion">
                {({ width, height }) => <ProtoEmotionHeatmap data={data} width={width} height={height} />}
              </ChartContainer>
              <ChartContainer title="Code Blocks — AI Tone Impact" subtitle="GPT emotion split by whether the turn included code">
                {({ width, height }) => <ProtoCodeImpact data={data} width={width} height={height} />}
              </ChartContainer>
            </div>

            <ChartContainer title="Prompt Length vs Sentiment Scatter" subtitle="Dev turns: x=prompt length, y=sentiment polarity, color=emotion — hover for snippet">
              {({ width, height }) => <ProtoLongPromptScatter data={data} width={width} height={height} />}
            </ChartContainer>
          </div>
        )}
      </main>

      <ChartTooltip data={tooltipData} />
    </div>
  );
}
