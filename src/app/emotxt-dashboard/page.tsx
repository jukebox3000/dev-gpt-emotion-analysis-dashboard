'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ChartTooltip, { useTooltipState } from '@/components/shared/ChartTooltip';
import ChartContainer from '@/components/shared/ChartContainer';
import {
  EmoTxtDonut,
  EmoTxtDirectComparison,
  EmoTxtComplexity,
  EmoTxtHeatmap,
  EmoTxtCooccurrence,
  EmoTxtCodeImpact,
  EmoTxtRelation,
  EMOTXT_COLORS,
} from '@/components/prototype/EmoTxtCharts';
import type { Turn } from '@/lib/types';

export default function EmoTxtDashboardPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive filters
  const [selectedSpeaker, setSelectedSpeaker] = useState<'both' | 'developer' | 'gpt'>('both');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('All');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('All');

  const tooltipData = useTooltipState();

  useEffect(() => {
    fetch('/data/emotxt/processed_turns.json')
      .then(res => res.json())
      .then(data => {
        setTurns(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load EmoTxt turns data:', err);
        setLoading(false);
      });
  }, []);

  // Compute filtered turns
  const filteredTurns = useMemo(() => {
    return turns.filter(t => {
      // Speaker filter
      if (selectedSpeaker !== 'both') {
        const match = selectedSpeaker === 'developer' ? 'Developer' : 'GPT';
        if (t.speaker !== match) return false;
      }
      // Emotion filter
      if (selectedEmotion !== 'All') {
        if (t.emotion_dev !== selectedEmotion) return false;
      }
      // Complexity filter
      if (selectedComplexity !== 'All') {
        if (t.prompt_complexity !== selectedComplexity) return false;
      }
      return true;
    });
  }, [turns, selectedSpeaker, selectedEmotion, selectedComplexity]);

  const resetFilters = () => {
    setSelectedSpeaker('both');
    setSelectedEmotion('All');
    setSelectedComplexity('All');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 backdrop-blur-md flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 font-bold transition flex items-center gap-1.5">
            ← Back to Main Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-sm font-extrabold text-slate-900">📊 EmoTxt Classifier Dashboard</h1>
        </div>
        {!loading && (
          <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            {turns.length.toLocaleString()} turns classified using EmoTxt SVMs
          </span>
        )}
      </header>

      <main className="max-w-[1500px] mx-auto px-6 py-8 space-y-8">
        {/* Intro */}
        <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧪</span>
            <h2 className="text-xl font-extrabold text-slate-900">Developer-Specific Emotion Classification</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
            This dashboard uses **EmoTxt** (part of the EMTk framework), a specialized machine-learning toolkit trained specifically on technical text and developer QA discussions (Stack Overflow posts). Unlike generic sentiment models, EmoTxt classifies fine-grained developer emotions: 
            <span className="mx-1 px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold">Anger</span>, 
            <span className="mx-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-bold">Fear</span>, 
            <span className="mx-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold">Joy</span>, 
            <span className="mx-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Love</span>, 
            <span className="mx-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold">Sadness</span>, and 
            <span className="mx-1 px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 font-bold">Surprise</span>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider">Features Analyzed</h4>
              <p>
                EmoTxt uses NLP to extract WordNet Affect lists, unigrams, bigrams, grammatical mood/modality, and politeness markers (e.g. gratitude, apologies) to construct a high-dimensional feature set.
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider">Classification Engine</h4>
              <p>
                Classifications are generated using Support Vector Machines (SVMs) pre-trained on Stack Overflow gold-standards. Slices are mapped based on binary Yes/No outputs per category.
              </p>
            </div>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap gap-6 items-center justify-between">
          <div className="flex flex-wrap gap-5 items-center">
            {/* Speaker Filter */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Speaker</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedSpeaker('both')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${selectedSpeaker === 'both' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Both
                </button>
                <button
                  onClick={() => setSelectedSpeaker('developer')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${selectedSpeaker === 'developer' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Developer Only
                </button>
                <button
                  onClick={() => setSelectedSpeaker('gpt')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${selectedSpeaker === 'gpt' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  GPT Only
                </button>
              </div>
            </div>

            {/* Dominant Emotion Filter */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dominant Emotion</span>
              <select
                value={selectedEmotion}
                onChange={e => setSelectedEmotion(e.target.value)}
                className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-200/50 transition"
              >
                <option value="All">All Emotions</option>
                {Object.keys(EMOTXT_COLORS).map(emo => (
                  <option key={emo} value={emo}>{emo}</option>
                ))}
              </select>
            </div>

            {/* Complexity Filter */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prompt Complexity</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {['All', 'Low', 'Medium', 'High'].map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedComplexity(c)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${selectedComplexity === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reset Filter Button */}
          <button
            onClick={resetFilters}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            🔄 Reset Filters
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-500 font-medium animate-pulse">Running EmoTxt classifiers on DevGPT snapshots...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Grid Row 1: Donut & Direct Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="Emotion Label Distribution" subtitle="Distribution of machine-learning-driven emotion labels predicted by pre-trained Stack Overflow models">
                {({ width, height }) => <EmoTxtDonut data={filteredTurns} width={width} height={height} />}
              </ChartContainer>
              <ChartContainer title="Dev vs GPT — Emotion Comparison" subtitle="Grouped counts of classified emotions for Developer vs GPT turns">
                {({ width, height }) => <EmoTxtDirectComparison data={filteredTurns} width={width} height={height} />}
              </ChartContainer>
            </div>

            {/* Grid Row 2: Complexity & Code Impact */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="Developer Emotion vs Prompt Complexity" subtitle="Developer emotion split grouped by prompt complexity (Low / Medium / High)">
                {selectedSpeaker === 'gpt' ? (
                  <div className="flex items-center justify-center h-full text-center p-6 text-slate-400 text-xs font-semibold">
                    ⚠️ This chart is specific to Developer turns. Please select 'Both' or 'Developer Only' speaker filter to view it.
                  </div>
                ) : (
                  ({ width, height }) => <EmoTxtComplexity data={filteredTurns} width={width} height={height} />
                )}
              </ChartContainer>
              <ChartContainer title="Code Context — AI Tone Impact" subtitle="GPT response emotions grouped by code block presence in the answer">
                {selectedSpeaker === 'developer' ? (
                  <div className="flex items-center justify-center h-full text-center p-6 text-slate-400 text-xs font-semibold">
                    ⚠️ This chart is specific to GPT turns. Please select 'Both' or 'GPT Only' speaker filter to view it.
                  </div>
                ) : (
                  ({ width, height }) => <EmoTxtCodeImpact data={filteredTurns} width={width} height={height} />
                )}
              </ChartContainer>
            </div>

            {/* Grid Row 3: Heatmaps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="Dev→GPT Emotion Transition" subtitle="Turn-pair heatmap: which GPT response emotion follows each developer prompt emotion state">
                {selectedSpeaker !== 'both' ? (
                  <div className="flex items-center justify-center h-full text-center p-6 text-slate-400 text-xs font-semibold">
                    ⚠️ This transition heatmap requires BOTH Developer and GPT speakers. Please select the 'Both' filter to view it.
                  </div>
                ) : (
                  ({ width, height }) => <EmoTxtHeatmap data={filteredTurns} width={width} height={height} />
                )}
              </ChartContainer>
              <ChartContainer title="Emotion Co-occurrence Matrix" subtitle="Overlap frequency heatmap: how often multiple emotions are detected simultaneously in the same turn">
                {({ width, height }) => <EmoTxtCooccurrence data={filteredTurns} width={width} height={height} />}
              </ChartContainer>
            </div>

            {/* Grid Row 4: Scatter Plot */}
            <ChartContainer title="Prompt Length vs Sentiment Polarity" subtitle="Developer prompts plotted by word count (X), VADER compound polarity (Y), and colored by EmoTxt dominant emotion">
              {selectedSpeaker === 'gpt' ? (
                <div className="flex items-center justify-center h-full text-center p-6 text-slate-400 text-xs font-semibold">
                  ⚠️ This chart is specific to Developer turns. Please select 'Both' or 'Developer Only' speaker filter to view it.
                </div>
              ) : (
                ({ width, height }) => <EmoTxtRelation data={filteredTurns} width={width} height={height} />
              )}
            </ChartContainer>
          </div>
        )}
      </main>

      <ChartTooltip data={tooltipData} />
    </div>
  );
}
