'use client';

import { useDashboardStore } from '@/lib/store';
import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { EMOTION_ORDER, EMOTION_COLORS, EMOTION_COLORS_DEV, EMOTION_COLORS_GPT, getEmotionGlow } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, EmotionType } from '@/lib/types';

interface EmotionDonutFilteredProps {
  data: Turn[];
  width: number;
  height: number;
}

export default function EmotionDonutFiltered({ data, width, height }: EmotionDonutFilteredProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const selectedSpeakers = useDashboardStore(state => state.selectedSpeakers);
  const speakerFilter = selectedSpeakers.length === 1
    ? (selectedSpeakers[0] === 'Developer' ? 'developer' : 'gpt')
    : 'both';

  // Log inputs on every data/filter change
  useEffect(() => {
    console.log('📊 [EmotionDonutFiltered] Received Input Data:', {
      totalTurnsReceived: data.length,
      selectedSpeakersFilter: selectedSpeakers,
      resolvedSpeakerFilterMode: speakerFilter,
      sampleTurns: data.slice(0, 3)
    });
  }, [data, selectedSpeakers, speakerFilter]);

  const drawChart = useCallback(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    
    // Clear and set base attributes if not initialized
    let g = svg.select<SVGGElement>('g.main-group');
    if (g.empty()) {
      svg.selectAll('*').remove();
      g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('class', 'main-group')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
    } else {
      g.attr('transform', `translate(${width / 2}, ${height / 2})`);
    }

    const margin = 20;
    const radius = Math.min(width, height) / 2 - margin;

    // Filter turns
    const devTurns = data.filter(t => t.speaker === 'Developer');
    const gptTurns = data.filter(t => t.speaker === 'GPT');

    const devCounts: Record<string, number> = {};
    const gptCounts: Record<string, number> = {};
    EMOTION_ORDER.forEach(e => { devCounts[e] = 0; gptCounts[e] = 0; });

    devTurns.forEach(t => {
      const emotion = t.emotion_dev || 'Neutral';
      if (devCounts[emotion] !== undefined) devCounts[emotion]++;
    });
    gptTurns.forEach(t => {
      const emotion = t.emotion_dev || 'Neutral';
      if (gptCounts[emotion] !== undefined) gptCounts[emotion]++;
    });

    const totalDev = Object.values(devCounts).reduce((a, b) => a + b, 0);
    const totalGpt = Object.values(gptCounts).reduce((a, b) => a + b, 0);
    const totalAll = totalDev + totalGpt;

    const devData = EMOTION_ORDER.map(e => ({ emotion: e, count: devCounts[e] })).filter(d => d.count > 0);
    const gptData = EMOTION_ORDER.map(e => ({ emotion: e, count: gptCounts[e] })).filter(d => d.count > 0);

    // Log calculated counts and arrays fed into D3
    console.log('📈 [EmotionDonutFiltered] Calculated Aggregates:', {
      totalTurnsCount: data.length,
      developerTurnsCount: devTurns.length,
      gptTurnsCount: gptTurns.length,
      aggregatedCounts: {
        dev: devCounts,
        gpt: gptCounts
      },
      datasetsFedToD3: {
        devDataArray: devData,
        gptDataArray: gptData
      }
    });

    const pie = d3.pie<{ emotion: string; count: number }>()
      .value(d => d.count)
      .sort(null)
      .padAngle(0.02);

    // Radii definitions:
    // When dev is chosen, dev outer extends to 0.95, while gpt squashes to [0.95, 0.95] (pushed out).
    // When gpt is chosen, gpt inner extends to 0.45, while dev squashes to [0.45, 0.45] (crushed in).
    const radii = {
      dev: {
        both: { inner: radius * 0.45, outer: radius * 0.68 },
        developer: { inner: radius * 0.50, outer: radius * 0.95 },
        gpt: { inner: radius * 0.45, outer: radius * 0.45 }, // crushed inward to zero-thickness
      },
      gpt: {
        both: { inner: radius * 0.72, outer: radius * 0.95 },
        developer: { inner: radius * 0.95, outer: radius * 0.95 }, // squashed outward to zero-thickness
        gpt: { inner: radius * 0.50, outer: radius * 0.95 },
      }
    };

    // Targets for current filter
    const targetDevInner = radii.dev[speakerFilter].inner;
    const targetDevOuter = radii.dev[speakerFilter].outer;
    // Fade out completely when squished
    const targetDevOpacity = speakerFilter === 'gpt' ? 0 : 1;
    const targetDevPointerEvents = speakerFilter === 'gpt' ? 'none' : 'auto';

    const targetGptInner = radii.gpt[speakerFilter].inner;
    const targetGptOuter = radii.gpt[speakerFilter].outer;
    const targetGptOpacity = speakerFilter === 'developer' ? 0 : 1;
    const targetGptPointerEvents = speakerFilter === 'developer' ? 'none' : 'auto';

    // Groups for layers
    let devGroup = g.select<SVGGElement>('g.dev-layer');
    if (devGroup.empty()) {
      devGroup = g.append('g').attr('class', 'dev-layer');
    }

    let gptGroup = g.select<SVGGElement>('g.gpt-layer');
    if (gptGroup.empty()) {
      gptGroup = g.append('g').attr('class', 'gpt-layer');
    }

    // Developer arcs (inner)
    const devPaths = devGroup.selectAll<SVGPathElement, d3.PieArcDatum<{ emotion: string; count: number }>>('path')
      .data(pie(devData), d => d.data.emotion);

    devPaths.exit().remove();

    const newDevPaths = devPaths.enter()
      .append('path')
      .attr('stroke', '#ffffff') // Restore clean border
      .attr('stroke-width', 1.5)
      .style('opacity', 0)
      .style('cursor', 'pointer');

    const allDevPaths = newDevPaths.merge(devPaths);

    allDevPaths
      .attr('fill', d => EMOTION_COLORS_DEV[d.data.emotion as EmotionType] || EMOTION_COLORS[d.data.emotion as EmotionType])
      .on('mouseover', function(event, d) {
        if (speakerFilter === 'gpt') return; // disabled
        const glowColor = getEmotionGlow(d.data.emotion as EmotionType);
        const currentInner = (this as any)._currentInner || radii.dev.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.dev.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ emotion: string; count: number }>>()
            .innerRadius(currentInner - 3)
            .outerRadius(currentOuter + 8)(d) as any)
          .attr('stroke-width', 2)
          .style('filter', 'drop-shadow(0 0 14px rgba(16, 185, 129, 0.95))');

        const pct = ((d.data.count / totalDev) * 100).toFixed(1);
        const exampleTurn = devTurns.find(t => (t.emotion_dev || 'Neutral') === d.data.emotion);
        setGlobalTooltip({
          emotion: d.data.emotion,
          emotionColor: EMOTION_COLORS_DEV[d.data.emotion as EmotionType],
          speaker: 'Developer',
          count: d.data.count,
          percentage: `${pct}%`,
          textSnippet: exampleTurn?.text?.slice(0, 250),
        });
      })
      .on('mouseout', function(event, d) {
        if (speakerFilter === 'gpt') return; // disabled
        const currentInner = (this as any)._currentInner || radii.dev.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.dev.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ emotion: string; count: number }>>()
            .innerRadius(currentInner)
            .outerRadius(currentOuter)(d) as any)
          .attr('stroke-width', 1.5)
          .style('filter', 'none');
        setGlobalTooltip(null);
      })
      .on('click', (event, d) => {
        if (speakerFilter === 'gpt') return; // disabled
        useDashboardStore.setState({
          selectedEmotions: [d.data.emotion as EmotionType],
          activeTab: 'case-inspector'
        });
        const matchingTurn = data.find(t => (t.emotion_dev || 'Neutral') === d.data.emotion && t.speaker === 'Developer');
        if (matchingTurn) {
          useDashboardStore.setState({
            selectedConversationId: matchingTurn.conversation_id,
            highlightTurnId: matchingTurn.turn_id
          });
        }
      });

    // Animate developer radii and opacity
    allDevPaths.transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .style('opacity', targetDevOpacity)
      .style('pointer-events', targetDevPointerEvents)
      .attrTween('d', function(d) {
        const currentInner = (this as any)._currentInner || radii.dev.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.dev.both.outer;
        const interpolateInner = d3.interpolate(currentInner, targetDevInner);
        const interpolateOuter = d3.interpolate(currentOuter, targetDevOuter);
        (this as any)._currentInner = targetDevInner;
        (this as any)._currentOuter = targetDevOuter;
        return function(t) {
          return d3.arc<d3.PieArcDatum<{ emotion: string; count: number }>>()
            .innerRadius(interpolateInner(t))
            .outerRadius(interpolateOuter(t))(d) as any;
        };
      });


    // GPT arcs (outer)
    const gptPaths = gptGroup.selectAll<SVGPathElement, d3.PieArcDatum<{ emotion: string; count: number }>>('path')
      .data(pie(gptData), d => d.data.emotion);

    gptPaths.exit().remove();

    const newGptPaths = gptPaths.enter()
      .append('path')
      .attr('stroke', '#ffffff') // Restore clean border
      .attr('stroke-width', 1.5)
      .style('opacity', 0)
      .style('cursor', 'pointer');

    const allGptPaths = newGptPaths.merge(gptPaths);

    allGptPaths
      .attr('fill', d => `url(#pattern-gpt-${d.data.emotion.toLowerCase()})`)
      .on('mouseover', function(event, d) {
        if (speakerFilter === 'developer') return; // disabled
        const glowColor = getEmotionGlow(d.data.emotion as EmotionType);
        const currentInner = (this as any)._currentInner || radii.gpt.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.gpt.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ emotion: string; count: number }>>()
            .innerRadius(currentInner - 3)
            .outerRadius(currentOuter + 8)(d) as any)
          .attr('stroke-width', 2)
          .style('filter', 'drop-shadow(0 0 14px rgba(59, 130, 246, 0.95))');

        const pct = ((d.data.count / totalGpt) * 100).toFixed(1);
        const exampleTurn = gptTurns.find(t => (t.emotion_dev || 'Neutral') === d.data.emotion);
        setGlobalTooltip({
          emotion: d.data.emotion,
          emotionColor: EMOTION_COLORS_GPT[d.data.emotion as EmotionType],
          speaker: 'GPT',
          count: d.data.count,
          percentage: `${pct}%`,
          textSnippet: exampleTurn?.text?.slice(0, 250),
        });
      })
      .on('mouseout', function(event, d) {
        if (speakerFilter === 'developer') return; // disabled
        const currentInner = (this as any)._currentInner || radii.gpt.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.gpt.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ emotion: string; count: number }>>()
            .innerRadius(currentInner)
            .outerRadius(currentOuter)(d) as any)
          .attr('stroke-width', 1.5)
          .style('filter', 'none');
        setGlobalTooltip(null);
      })
      .on('click', (event, d) => {
        if (speakerFilter === 'developer') return; // disabled
        useDashboardStore.setState({
          selectedEmotions: [d.data.emotion as EmotionType],
          activeTab: 'case-inspector'
        });
        const matchingTurn = data.find(t => (t.emotion_dev || 'Neutral') === d.data.emotion && t.speaker === 'GPT');
        if (matchingTurn) {
          useDashboardStore.setState({
            selectedConversationId: matchingTurn.conversation_id,
            highlightTurnId: matchingTurn.turn_id
          });
        }
      });

    // Animate GPT radii and opacity
    allGptPaths.transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .style('opacity', targetGptOpacity)
      .style('pointer-events', targetGptPointerEvents)
      .attrTween('d', function(d) {
        const currentInner = (this as any)._currentInner || radii.gpt.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.gpt.both.outer;
        const interpolateInner = d3.interpolate(currentInner, targetGptInner);
        const interpolateOuter = d3.interpolate(currentOuter, targetGptOuter);
        (this as any)._currentInner = targetGptInner;
        (this as any)._currentOuter = targetGptOuter;
        return function(t) {
          return d3.arc<d3.PieArcDatum<{ emotion: string; count: number }>>()
            .innerRadius(interpolateInner(t))
            .outerRadius(interpolateOuter(t))(d) as any;
        };
      });


    // Center Text Elements (with transitions / clean updates)
    let textGroup = g.select<SVGGElement>('g.text-group');
    if (textGroup.empty()) {
      textGroup = g.append('g').attr('class', 'text-group');
      textGroup.append('text').attr('class', 'center-emoji').attr('text-anchor', 'middle');
      textGroup.append('text').attr('class', 'center-count').attr('text-anchor', 'middle');
      textGroup.append('text').attr('class', 'center-label').attr('text-anchor', 'middle');
    }

    const emojiText = speakerFilter === 'both' ? '🤖 / 👨‍💻' : (speakerFilter === 'developer' ? '👨‍💻' : '🤖');
    const countValue = speakerFilter === 'both' ? totalAll : (speakerFilter === 'developer' ? totalDev : totalGpt);
    const labelText = speakerFilter === 'both' ? 'Total turns' : (speakerFilter === 'developer' ? 'Developer turns' : 'GPT turns');

    textGroup.select('text.center-emoji')
      .transition().duration(400)
      .attr('dy', '-1.5em')
      .attr('font-size', speakerFilter === 'both' ? '20px' : '24px')
      .text(emojiText);

    textGroup.select('text.center-count')
      .transition().duration(400)
      .attr('dy', '0.4em')
      .attr('fill', '#0f172a')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text(countValue.toLocaleString());

    textGroup.select('text.center-label')
      .transition().duration(400)
      .attr('dy', '1.8em')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-weight', 'semibold')
      .text(labelText);

    // Comic style text annotations pointing to rings (only when "both" is selected)
    g.selectAll('g.donut-label').remove();
  }, [data, width, height, speakerFilter]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      <div className="w-full h-full flex items-center justify-center">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
}
