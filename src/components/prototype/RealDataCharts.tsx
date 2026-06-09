'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Turn, ConversationGroup, SummaryStats } from '@/lib/types';
import {
  loadTurns,
  loadConversationGroups,
  loadSummaryStats,
  filterTurns,
} from '@/lib/data-loader';
import ChartContainer from '@/components/shared/ChartContainer';
import EmotionDonut from '@/components/charts/EmotionDonut';
import EmotionBarChart from '@/components/charts/EmotionBarChart';
import ComplexityEmotionBar from '@/components/charts/ComparisonBar';
import MultiScatter from '@/components/charts/MultiScatter';
import Heatmap from '@/components/charts/Heatmap';
import CodeImpactChart from '@/components/charts/CodeImpactChart';
import CorrelationMatrix from '@/components/charts/CorrelationMatrix';
import ScatterPlot from '@/components/charts/ScatterPlot';
import ConfidenceHistogram from '@/components/charts/ConfidenceHistogram';
import SentimentDistribution from '@/components/charts/SentimentDistribution';
import KeywordAssociation from '@/components/charts/KeywordAssociation';
import PatternDefs from '@/components/shared/PatternDefs';

const REAL_TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'deep-analysis', label: 'Deep Analysis', icon: '🔬' },
  { id: 'model-quality', label: 'Model Quality', icon: '📈' },
];

export default function RealDataCharts() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function load() {
      try {
        const [t, g, s] = await Promise.all([
          loadTurns(),
          loadConversationGroups(),
          loadSummaryStats(),
        ]);
        setTurns(t);
        setGroups(g);
        setStats(s);
      } catch (err) {
        console.error('RealDataCharts: failed to load data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Use all turns unfiltered for prototype context (no filter sidebar here)
  const filteredTurns = useMemo(() => filterTurns(turns, {}), [turns]);

  // Quick KPI values
  const kpi = useMemo(() => {
    const dev = turns.filter(t => t.speaker === 'Developer');
    const frustrated = dev.filter(t => t.emotion_dev === 'Frustration');
    return {
      totalTurns: turns.length,
      totalConversations: groups.length,
      frustrationRate: dev.length > 0 ? ((frustrated.length / dev.length) * 100).toFixed(1) : '0',
      avgPromptLen: dev.length > 0
        ? Math.round(dev.reduce((s, t) => s + t.word_count, 0) / dev.length)
        : 0,
      codeRate: turns.length > 0
        ? ((turns.filter(t => t.has_code).length / turns.length) * 100).toFixed(1)
        : '0',
    };
  }, [turns, groups]);

  return (
    <section className="space-y-6">
      {/* Hidden SVG pattern defs */}
      <svg width="0" height="0" className="absolute">
        <PatternDefs />
      </svg>

      {/* Section header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <span>📂</span> Real DevGPT Data — Main Dashboard Charts
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            All charts below use actual data loaded from{' '}
            <code className="text-xs font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
              public/data/processed_conversations.json
            </code>
            {' '}·{' '}
            <code className="text-xs font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
              conversation_groups.json
            </code>
          </p>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Source: DevGPT snapshot{' '}
            <span className="font-semibold text-slate-500">
              20230817_125147_pr_sharings.json
            </span>{' '}
            · Classified offline via heuristic regex (
            <span className="font-semibold text-slate-500">scripts/process_data.py</span>)
          </p>
        </div>

        {/* Live KPI strip */}
        {!loading && (
          <div className="flex gap-5 flex-wrap">
            {[
              { label: 'Total Turns', value: kpi.totalTurns.toLocaleString() },
              { label: 'Conversations', value: kpi.totalConversations.toLocaleString() },
              { label: 'Frustration Rate', value: `${kpi.frustrationRate}%` },
              { label: 'Avg Prompt Length', value: `${kpi.avgPromptLen} words` },
              { label: 'Turns With Code', value: `${kpi.codeRate}%` },
            ].map(kpiItem => (
              <div key={kpiItem.label} className="text-center">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{kpiItem.label}</div>
                <div className="text-xl font-bold text-slate-700 mt-0.5">{kpiItem.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-sm text-slate-500 font-medium">Loading real DevGPT data…</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1.5 border-b border-slate-200">
            {REAL_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap border-t border-x -mb-[1px] cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-800 border-slate-200 border-b-white shadow-[0_-2px_6px_rgba(0,0,0,0.015)]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartContainer
                  title="Emotion Distribution"
                  subtitle="Inner: Developer, Outer: GPT"
                >
                  {({ width, height }) => (
                    <EmotionDonut data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>

                <ChartContainer
                  title="Dev vs GPT Emotion Comparison"
                  subtitle="Horizontal grouped bars by emotion"
                >
                  {({ width, height }) => (
                    <EmotionBarChart data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>
              </div>

              <ChartContainer
                title="Complexity × Emotion Distribution"
                subtitle="Always ordered: Low → Medium → High"
              >
                {({ width, height }) => (
                  <ComplexityEmotionBar data={filteredTurns} width={width} height={height} />
                )}
              </ChartContainer>
            </div>
          )}

          {/* Tab: Deep Analysis */}
          {activeTab === 'deep-analysis' && (
            <div className="space-y-4">
              <ChartContainer
                title="Multi-Dimensional Scatter"
                subtitle="X: Dev word count, Y: GPT word count, Color: Dev emotion, Size: Code blocks"
              >
                {({ width, height }) => (
                  <MultiScatter turns={filteredTurns} groups={groups} width={width} height={height} />
                )}
              </ChartContainer>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartContainer
                  title="Dev Emotion → GPT Emotion Mapping"
                  subtitle="Heatmap of co-occurring emotions"
                >
                  {({ width, height }) => (
                    <Heatmap turns={filteredTurns} groups={groups} width={width} height={height} />
                  )}
                </ChartContainer>

                <ChartContainer
                  title="Code Impact on AI Tone"
                  subtitle="GPT emotion distribution with/without code"
                >
                  {({ width, height }) => (
                    <CodeImpactChart data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>
              </div>

              <ChartContainer
                title="Intent × Emotion Correlation"
                subtitle="How prompt intent correlates with developer emotion"
              >
                {({ width, height }) => (
                  <CorrelationMatrix data={filteredTurns} width={width} height={height} />
                )}
              </ChartContainer>

              <ChartContainer
                title="Sentiment vs Word Count Scatter"
                subtitle="X: Sentiment polarity, Y: Word count — each point is a conversation turn"
              >
                {({ width, height }) => (
                  <ScatterPlot data={filteredTurns} width={width} height={height} />
                )}
              </ChartContainer>
            </div>
          )}

          {/* Tab: Model Quality */}
          {activeTab === 'model-quality' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartContainer
                  title="Confidence Distribution"
                  subtitle="Histogram of emotion_confidence for Developer vs GPT turns"
                >
                  {({ width, height }) => (
                    <ConfidenceHistogram data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>

                <ChartContainer
                  title="Sentiment Polarity Distribution"
                  subtitle="KDE-style distribution for Developer vs GPT turns"
                >
                  {({ width, height }) => (
                    <SentimentDistribution data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>
              </div>

              <ChartContainer
                title="Emotion–Keyword Association"
                subtitle="Top keywords associated with each emotion category"
                minHeight={400}
              >
                {({ width, height }) => (
                  <KeywordAssociation data={filteredTurns} width={width} height={height} />
                )}
              </ChartContainer>

              {/* Uncertainty summary */}
              {stats && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Label Uncertainty Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="text-xs text-slate-500 font-semibold">Low Confidence Turns</div>
                      <div className="text-lg font-bold text-amber-600 mt-1">
                        {turns.filter(t => t.emotion_confidence < 0.5).length}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">confidence &lt; 50%</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="text-xs text-slate-500 font-semibold">Null Emotion Labels</div>
                      <div className="text-lg font-bold text-red-600 mt-1">
                        {turns.filter(t => !t.emotion_dev).length}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">unlabeled turns</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="text-xs text-slate-500 font-semibold">Avg Dev Confidence</div>
                      <div className="text-lg font-bold text-blue-600 mt-1">
                        {(
                          turns
                            .filter(t => t.speaker === 'Developer')
                            .reduce((s, t) => s + t.emotion_confidence, 0) /
                          (turns.filter(t => t.speaker === 'Developer').length || 1) *
                          100
                        ).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">developer turns</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="text-xs text-slate-500 font-semibold">Avg GPT Confidence</div>
                      <div className="text-lg font-bold text-green-600 mt-1">
                        {(
                          turns
                            .filter(t => t.speaker === 'GPT')
                            .reduce((s, t) => s + t.emotion_confidence, 0) /
                          (turns.filter(t => t.speaker === 'GPT').length || 1) *
                          100
                        ).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">GPT turns</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
