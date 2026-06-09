'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Turn, ConversationGroup, SummaryStats } from '@/lib/types';
import { loadTurns, loadConversationGroups, loadSummaryStats, filterTurns } from '@/lib/data-loader';
import { useDashboardStore } from '@/lib/store';
import PatternDefs from '@/components/shared/PatternDefs';
import TopNavbar from '@/components/shared/TopNavbar';
import ChartContainer from '@/components/shared/ChartContainer';
import ChartTooltip, { useTooltipState } from '@/components/shared/ChartTooltip';
import Sidebar from '@/components/dashboard/Sidebar';
import KPICards from '@/components/dashboard/KPICards';
import EmotionDonutFiltered from '@/components/charts/EmotionDonutFiltered';
import EmotionBarChart from '@/components/charts/EmotionBarChart';
import ComplexityEmotionBar from '@/components/charts/ComparisonBar';
import MultiScatter from '@/components/charts/MultiScatter';
import Heatmap from '@/components/charts/Heatmap';
import CodeImpactChart from '@/components/charts/CodeImpactChart';
import CorrelationMatrix from '@/components/charts/CorrelationMatrix';
import ScatterPlot from '@/components/charts/ScatterPlot';
import ConversationViewer from '@/components/inspector/ConversationViewer';
import ConversationList from '@/components/inspector/ConversationList';
import ConfidenceHistogram from '@/components/charts/ConfidenceHistogram';
import SentimentDistribution from '@/components/charts/SentimentDistribution';
import KeywordAssociation from '@/components/charts/KeywordAssociation';
import SentimentLine from '@/components/charts/SentimentLine';
import {
  ProtoEmotionDonut,
  ProtoDirectComparison,
  ProtoCodeImpact,
  ProtoEmotionHeatmap,
  ProtoComplexityEmotion,
  ProtoLongPromptScatter,
} from '@/components/prototype/PrototypeCharts';
import { EMOTION_ORDER } from '@/lib/colors';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'deep-analysis', label: 'Deep Analysis', icon: '🔬' },
  { id: 'case-inspector', label: 'Case Inspector', icon: '🔍' },
  // { id: 'model-quality', label: 'Model Quality', icon: '📈' }, // 🔴 pending — commented out
];

export default function Dashboard() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');


  const {
    activeTab,
    setActiveTab,
    selectedEmotions,
    selectedSpeakers,
    selectedComplexities,
    selectedIntents,
    selectedConversationId,
    setSelectedConversationId,
    highlightTurnId,
    setDataLoaded,
  } = useDashboardStore();

  const tooltipData = useTooltipState();

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const [t, g, s] = await Promise.all([
          loadTurns(),
          loadConversationGroups(),
          loadSummaryStats(),
        ]);
        setTurns(t);
        setGroups(g);
        setStats(s);
        setDataLoaded(true);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [setDataLoaded]);

  // Filtered data
  const filteredTurns = useMemo(() => {
    return filterTurns(turns, {
      emotions: selectedEmotions,
      speakers: selectedSpeakers,
      complexities: selectedComplexities,
      intents: selectedIntents,
      searchQuery,
    });
  }, [turns, selectedEmotions, selectedSpeakers, selectedComplexities, selectedIntents, searchQuery]);

  // KPI calculations
  const kpiData = useMemo(() => {
    const devTurns = turns.filter(t => t.speaker === 'Developer');
    const frustrationNegTurns = devTurns.filter(
      t => t.emotion_dev === 'Frustration'
    );
    const frustrationRate = devTurns.length > 0 ? (frustrationNegTurns.length / devTurns.length) * 100 : 0;
    const avgPromptLength = devTurns.length > 0
      ? devTurns.reduce((sum, t) => sum + t.word_count, 0) / devTurns.length
      : 0;
    const codePresenceRate = turns.length > 0
      ? (turns.filter(t => t.has_code).length / turns.length) * 100
      : 0;

    return {
      totalConversations: groups.length,
      frustrationRate,
      avgPromptLength,
      codePresenceRate,
      totalTurns: turns.length,
    };
  }, [turns, groups]);

  // Selected conversation
  const selectedGroup = useMemo(() => {
    if (!selectedConversationId) return null;
    return groups.find(g => g.conversation_id === selectedConversationId) || null;
  }, [groups, selectedConversationId]);

  const handlePointClick = useCallback((turn: Turn) => {
    setSelectedConversationId(turn.conversation_id);
  }, [setSelectedConversationId]);

  const handleConversationSelect = useCallback((id: string) => {
    setSelectedConversationId(id);
  }, [setSelectedConversationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading thesis data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <TopNavbar />

      {/* Hidden SVG for pattern defs */}
      <svg width="0" height="0" className="absolute">
        <PatternDefs />
      </svg>

      {/* Header */}
      <header className="border-b border-indigo-100/80 bg-indigo-50/15 backdrop-blur-md sticky top-[49px] sm:top-[65px] z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-950 via-slate-700 to-indigo-900 bg-clip-text text-transparent tracking-tight">
                DevGPT Emotional Dynamics Dashboard
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Analyzing emotional dynamics between Developers and ChatGPT — 1,804 turns across 164 conversations
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 font-semibold shadow-sm">
                {filteredTurns.length} / {turns.length} turns
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto border-b border-indigo-100/50">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap border-t border-x -mb-[1px] ${activeTab === tab.id
                  ? 'bg-white text-indigo-950 border-indigo-100 border-b-white shadow-[0_-2px_6px_rgba(0,0,0,0.01)]'
                  : 'border-transparent text-slate-500 hover:text-indigo-950 hover:bg-indigo-50/10'
                  }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 py-4">
        <div className="flex gap-4">
          {/* Sidebar */}
          <div className="w-56 shrink-0 hidden lg:block">
            <div className="sticky top-[100px]">
              <Sidebar />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <KPICards {...kpiData} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartContainer title="Emotion Distribution" subtitle="Interactive view showing Developer & GPT emotion distribution">
                    {({ width, height }) => (
                      <EmotionDonutFiltered data={filteredTurns} width={width} height={height} />
                    )}
                  </ChartContainer>

                  <ChartContainer title="Emotion Comparison: Developer vs. GPT" subtitle="Emotion labels classified by Developer vs GPT">
                    {({ width, height }) => (
                      <ProtoDirectComparison data={filteredTurns} width={width} height={height} />
                    )}
                  </ChartContainer>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartContainer title="Dev vs GPT Emotion Comparison" subtitle="Horizontal grouped bars by emotion">
                    {({ width, height }) => (
                      <EmotionBarChart data={filteredTurns} width={width} height={height} />
                    )}
                  </ChartContainer>

                  <ChartContainer title="Complexity × Emotion Distribution" subtitle="Always ordered: Low → Medium → High">
                    {({ width, height }) => (
                      <ComplexityEmotionBar data={filteredTurns} width={width} height={height} />
                    )}
                  </ChartContainer>
                </div>

                {/* Commented out prototype chart as requested
                <ChartContainer needsReview title="Developer Emotion against Complexity (Prototype)" subtitle="Complexity defined by word count: <50 Low, 50–150 Med, >150 High">
                  {({ width, height }) => (
                    <ProtoComplexityEmotion data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>
                */}
              </div>
            )}

            {/* Tab 2: Deep Analysis */}
            {activeTab === 'deep-analysis' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartContainer title="Dev Emotion → GPT Emotion Mapping" subtitle="Heatmap of co-occurring emotions">
                    {({ width, height }) => (
                      <Heatmap turns={filteredTurns} groups={groups} width={width} height={height} />
                    )}
                  </ChartContainer>

                  <ChartContainer title="Code Impact on AI Tone" subtitle="GPT emotion distribution with/without code">
                    {({ width, height }) => (
                      <CodeImpactChart data={filteredTurns} width={width} height={height} />
                    )}
                  </ChartContainer>
                </div>

                <ChartContainer title="Intent × Emotion Correlation" subtitle="How prompt intent correlates with developer emotion" minHeight={280}>
                  {({ width, height }) => (
                    <CorrelationMatrix data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>

                <ChartContainer title="Multi-Dimensional Scatter" subtitle="X: Dev avg word count, Y: GPT avg word count — outliers clamped to 95th percentile, shown with dashed border" minHeight={260}>
                  {({ width, height }) => (
                    <MultiScatter turns={filteredTurns} groups={groups} width={width} height={height} />
                  )}
                </ChartContainer>
              </div>
            )}

            {/* Tab 3: Case Inspector */}
            {activeTab === 'case-inspector' && (
              <div className="space-y-4">
                {/* Sentiment arc — top */}
                <div className="mb-2">
                  <ChartContainer
                    title="Sentiment Arc"
                    subtitle={
                      selectedConversationId
                        ? `Sentiment polarity through the conversation — Developer (blue) vs GPT (green) · dot colour = emotion`
                        : 'Showing aggregate of all conversations — select a row below to drill in'
                    }
                    minHeight={200}
                    maxHeight={280}
                  >
                    {({ width, height }) => (
                      <SentimentLine
                        turns={turns}
                        conversationId={selectedConversationId}
                        width={width}
                        height={height}
                        onHoverTurn={(turnId) => useDashboardStore.setState({ highlightTurnId: turnId })}
                      />
                    )}
                  </ChartContainer>
                </div>

                {/* Action bar — quick filters + reset */}
                <div className="flex gap-2 items-center">
                  {selectedConversationId && (
                    <button
                      onClick={() => setSelectedConversationId(null)}
                      className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-200/70 transition-colors shadow-sm whitespace-nowrap flex items-center gap-1.5"
                    >
                      <span>↩</span> Reset to aggregate
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const confusionGroup = groups.find(g =>
                        g.turns.some(t => t.speaker === 'Developer' && t.emotion_dev === 'Confusion' && t.emotion_confidence < 0.5)
                      );
                      if (confusionGroup) setSelectedConversationId(confusionGroup.conversation_id);
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/50 text-amber-700 text-xs font-bold hover:bg-amber-100/50 transition-colors shadow-sm whitespace-nowrap"
                  >
                    Confusion Cases
                  </button>
                </div>

                {/* Conversation table */}
                <ConversationList
                  groups={groups}
                  selectedId={selectedConversationId}
                  onSelect={handleConversationSelect}
                  searchQuery=""
                />

                {/* Interactive scatter — bottom */}
                <ChartContainer title="Interactive Scatter" subtitle="Click any point to view full conversation. X: Sentiment polarity, Y: Word count">
                  {({ width, height }) => (
                    <ScatterPlot
                      data={filteredTurns}
                      width={width}
                      height={height}
                      onPointClick={handlePointClick}
                    />
                  )}
                </ChartContainer>
              </div>
            )}

            {/* Tab 4: Model Quality — 🔴 ALL PENDING, tab hidden from nav */}
            {activeTab === 'model-quality' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartContainer danger title="Confidence Distribution" subtitle="Pending — candidate for removal">
                    {({ width, height }) => (
                      <ConfidenceHistogram data={filteredTurns} width={width} height={height} />
                    )}
                  </ChartContainer>

                  <ChartContainer danger title="Sentiment Polarity Distribution" subtitle="Pending — needs validation">
                    {({ width, height }) => (
                      <SentimentDistribution data={filteredTurns} width={width} height={height} />
                    )}
                  </ChartContainer>
                </div>

                <ChartContainer danger title="Emotion–Keyword Association" subtitle="Pending — needs validation" minHeight={400}>
                  {({ width, height }) => (
                    <KeywordAssociation data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>

                <ChartContainer danger title="Prompt Length vs Sentiment (Prototype Scatter)" subtitle="Pending — prototype, not yet validated">
                  {({ width, height }) => (
                    <ProtoLongPromptScatter data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>

                {/* Uncertainty analysis summary */}
                <div className="rounded-2xl border-2 border-red-500 ring-2 ring-red-500/20 bg-red-50/5 p-4 shadow-[0_0_18px_rgba(239,68,68,0.12)]">
                  <h3 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-1.5">
                    <span className="text-base leading-none">🔴</span> Label Uncertainty Summary
                    <span className="text-xs font-normal text-red-400 ml-1">— pending</span>
                  </h3>
                  {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                          {(turns.filter(t => t.speaker === 'Developer').reduce((s, t) => s + t.emotion_confidence, 0) / (turns.filter(t => t.speaker === 'Developer').length || 1) * 100).toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">developer turns</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <div className="text-xs text-slate-500 font-semibold">Avg GPT Confidence</div>
                        <div className="text-lg font-bold text-green-600 mt-1">
                          {(turns.filter(t => t.speaker === 'GPT').reduce((s, t) => s + t.emotion_confidence, 0) / (turns.filter(t => t.speaker === 'GPT').length || 1) * 100).toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">GPT turns</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Tooltip */}
      <ChartTooltip data={tooltipData} />

      {/* Floating Chatbot Conversation Viewer */}
      <ConversationViewer group={selectedGroup} highlightTurnId={highlightTurnId} />
    </div>
  );
}
