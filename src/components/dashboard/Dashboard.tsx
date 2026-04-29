'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Turn, ConversationGroup, SummaryStats } from '@/lib/types';
import { loadTurns, loadConversationGroups, loadSummaryStats, filterTurns } from '@/lib/data-loader';
import { useDashboardStore } from '@/lib/store';
import PatternDefs from '@/components/shared/PatternDefs';
import ChartContainer from '@/components/shared/ChartContainer';
import ChartTooltip, { useTooltipState } from '@/components/shared/ChartTooltip';
import Sidebar from '@/components/dashboard/Sidebar';
import KPICards from '@/components/dashboard/KPICards';
import EmotionDonut from '@/components/charts/EmotionDonut';
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
import { EMOTION_ORDER } from '@/lib/colors';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'deep-analysis', label: 'Deep Analysis', icon: '🔬' },
  { id: 'case-inspector', label: 'Case Inspector', icon: '🔍' },
  { id: 'model-quality', label: 'Model Quality', icon: '📈' },
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
      t => t.emotion_dev === 'Frustration' || t.emotion_dev === 'Negativity'
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
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#94a3b8] text-sm">Loading thesis data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Hidden SVG for pattern defs */}
      <svg width="0" height="0" className="absolute">
        <PatternDefs />
      </svg>

      {/* Header */}
      <header className="border-b border-[#2a2d3a] bg-[#0f1117] sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[#e2e8f0]">
                DevGPT Emotional Dynamics Dashboard
              </h1>
              <p className="text-xs text-[#94a3b8]">
                Analyzing emotional dynamics between Developers and ChatGPT — 1,804 turns across 164 conversations
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
              <span className="px-2 py-1 rounded bg-[#1a1d27] border border-[#2a2d3a]">
                {filteredTurns.length} / {turns.length} turns
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-t text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#1a1d27] text-[#e2e8f0] border border-[#2a2d3a] border-b-transparent'
                    : 'text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a1d27]/50'
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
                  <ChartContainer title="Emotion Distribution" subtitle="Inner: Developer, Outer: GPT">
                    {({ width, height }) => (
                      <EmotionDonut data={filteredTurns} width={width} height={height} />
                    )}
                  </ChartContainer>

                  <ChartContainer title="Dev vs GPT Emotion Comparison" subtitle="Horizontal grouped bars by emotion">
                    {({ width, height }) => (
                      <EmotionBarChart data={filteredTurns} width={width} height={height} />
                    )}
                  </ChartContainer>
                </div>

                <ChartContainer title="Complexity × Emotion Distribution" subtitle="Always ordered: Low → Medium → High">
                  {({ width, height }) => (
                    <ComplexityEmotionBar data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>
              </div>
            )}

            {/* Tab 2: Deep Analysis */}
            {activeTab === 'deep-analysis' && (
              <div className="space-y-4">
                <ChartContainer title="Multi-Dimensional Scatter" subtitle="X: Dev word count, Y: GPT word count, Color: Dev emotion, Size: Code blocks">
                  {({ width, height }) => (
                    <MultiScatter turns={filteredTurns} groups={groups} width={width} height={height} />
                  )}
                </ChartContainer>

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

                <ChartContainer title="Intent × Emotion Correlation" subtitle="How prompt intent correlates with developer emotion">
                  {({ width, height }) => (
                    <CorrelationMatrix data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>
              </div>
            )}

            {/* Tab 3: Case Inspector */}
            {activeTab === 'case-inspector' && (
              <div className="space-y-4">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Search conversations by keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#1a1d27] border border-[#2a2d3a] text-[#e2e8f0] text-sm placeholder:text-[#64748b] focus:outline-none focus:border-[#3b82f6]"
                  />
                  <button
                    onClick={() => {
                      // Quick filter: confusion cases
                      const confusionGroup = groups.find(g =>
                        g.turns.some(t => t.speaker === 'Developer' && t.emotion_dev === 'Confusion' && t.emotion_confidence < 0.5)
                      );
                      if (confusionGroup) setSelectedConversationId(confusionGroup.conversation_id);
                    }}
                    className="px-3 py-2 rounded-lg bg-[#f59e0b20] text-[#f59e0b] text-xs font-medium hover:bg-[#f59e0b30] transition-colors whitespace-nowrap"
                  >
                    Confusion Cases
                  </button>
                </div>

                <ChartContainer title="Interactive Scatter Plot" subtitle="Click any point to view full conversation. X: Sentiment polarity, Y: Word count">
                  {({ width, height }) => (
                    <ScatterPlot
                      data={filteredTurns}
                      width={width}
                      height={height}
                      onPointClick={handlePointClick}
                    />
                  )}
                </ChartContainer>

                <ConversationViewer group={selectedGroup} highlightTurnId={highlightTurnId} />

                <ConversationList
                  groups={groups}
                  selectedId={selectedConversationId}
                  onSelect={handleConversationSelect}
                  searchQuery={searchQuery}
                />
              </div>
            )}

            {/* Tab 4: Model Quality */}
            {activeTab === 'model-quality' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartContainer title="Confidence Distribution" subtitle="Histogram of emotion_confidence for Developer vs GPT turns">
                    {({ width, height }) => (
                      <ConfidenceHistogram data={filteredTurns} width={width} height={height} />
                    )}
                  </ChartContainer>

                  <ChartContainer title="Sentiment Polarity Distribution" subtitle="KDE-style distribution for Developer vs GPT turns">
                    {({ width, height }) => (
                      <SentimentDistribution data={filteredTurns} width={width} height={height} />
                    )}
                  </ChartContainer>
                </div>

                <ChartContainer title="Emotion–Keyword Association" subtitle="Top keywords associated with each emotion category" minHeight={400}>
                  {({ width, height }) => (
                    <KeywordAssociation data={filteredTurns} width={width} height={height} />
                  )}
                </ChartContainer>

                {/* Uncertainty analysis summary */}
                <div className="rounded-xl border border-[#2a2d3a] bg-[#1a1d27] p-4">
                  <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Label Uncertainty Summary</h3>
                  {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-[#15171f] border border-[#2a2d3a] p-3">
                        <div className="text-xs text-[#94a3b8]">Low Confidence Turns</div>
                        <div className="text-lg font-bold text-[#f59e0b]">
                          {turns.filter(t => t.emotion_confidence < 0.5).length}
                        </div>
                        <div className="text-xs text-[#64748b]">confidence &lt; 50%</div>
                      </div>
                      <div className="rounded-lg bg-[#15171f] border border-[#2a2d3a] p-3">
                        <div className="text-xs text-[#94a3b8]">Null Emotion Labels</div>
                        <div className="text-lg font-bold text-[#ef4444]">
                          {turns.filter(t => !t.emotion_dev).length}
                        </div>
                        <div className="text-xs text-[#64748b]">unlabeled turns</div>
                      </div>
                      <div className="rounded-lg bg-[#15171f] border border-[#2a2d3a] p-3">
                        <div className="text-xs text-[#94a3b8]">Avg Dev Confidence</div>
                        <div className="text-lg font-bold text-[#22c55e]">
                          {(turns.filter(t => t.speaker === 'Developer').reduce((s, t) => s + t.emotion_confidence, 0) / (turns.filter(t => t.speaker === 'Developer').length || 1) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-[#64748b]">developer turns</div>
                      </div>
                      <div className="rounded-lg bg-[#15171f] border border-[#2a2d3a] p-3">
                        <div className="text-xs text-[#94a3b8]">Avg GPT Confidence</div>
                        <div className="text-lg font-bold text-[#93c5fd]">
                          {(turns.filter(t => t.speaker === 'GPT').reduce((s, t) => s + t.emotion_confidence, 0) / (turns.filter(t => t.speaker === 'GPT').length || 1) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-[#64748b]">GPT turns</div>
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
    </div>
  );
}
