'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { EMOTION_COLORS, EMOTION_COLORS_DEV, THEME, EMOTION_ORDER } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, ConversationGroup, EmotionType } from '@/lib/types';

interface MultiScatterProps {
  turns: Turn[];
  groups: ConversationGroup[];
  width: number;
  height: number;
}

export default function MultiScatter({ turns, groups, width, height }: MultiScatterProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const drawChart = useCallback(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Build conversation-level data: dev prompt words vs GPT response words
    const convData: {
      convId: string;
      title: string;
      devWords: number;
      gptWords: number;
      devEmotion: string;
      codeBlocks: number;
      keywords: string[];
    }[] = [];

    const convMap = new Map<string, { devTurns: Turn[]; gptTurns: Turn[] }>();
    turns.forEach(t => {
      if (!convMap.has(t.conversation_id)) {
        convMap.set(t.conversation_id, { devTurns: [], gptTurns: [] });
      }
      const entry = convMap.get(t.conversation_id)!;
      if (t.speaker === 'Developer') entry.devTurns.push(t);
      else entry.gptTurns.push(t);
    });

    convMap.forEach((val, convId) => {
      const devWords = d3.mean(val.devTurns, t => t.word_count) || 0;
      const gptWords = d3.mean(val.gptTurns, t => t.word_count) || 0;
      const devEmotion = val.devTurns.find(t => t.emotion_dev && t.emotion_dev !== 'Neutral')?.emotion_dev || 'Neutral';
      const codeBlocks = d3.sum(val.gptTurns, t => t.code_block_count) || 0;
      const allKeywords = val.devTurns.flatMap(t => t.top_keywords);
      const uniqueKeywords = [...new Set(allKeywords)].slice(0, 5);
      const title = val.devTurns[0]?.sharing_title || 'Untitled';

      convData.push({ convId, title, devWords, gptWords, devEmotion, codeBlocks, keywords: uniqueKeywords });
    });

    if (convData.length === 0) return;

    const xMax = d3.max(convData, d => d.devWords) || 1;
    const yMax = d3.max(convData, d => d.gptWords) || 1;
    const sizeMax = d3.max(convData, d => d.codeBlocks) || 1;

    const x = d3.scaleLinear().domain([0, xMax * 1.05]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, yMax * 1.05]).range([innerHeight, 0]);
    const size = d3.scaleSqrt().domain([0, sizeMax]).range([3, 16]);

    // Grid
    g.append('g').selectAll('line').data(x.ticks(5)).enter()
      .append('line').attr('x1', d => x(d)).attr('x2', d => x(d))
      .attr('y1', 0).attr('y2', innerHeight).attr('stroke', THEME.gridLines).attr('stroke-dasharray', '2,2');
    g.append('g').selectAll('line').data(y.ticks(5)).enter()
      .append('line').attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('x1', 0).attr('x2', innerWidth).attr('stroke', THEME.gridLines).attr('stroke-dasharray', '2,2');

    // Axes
    g.append('g').attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    // Axis labels
    g.append('text').attr('x', innerWidth / 2).attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('Developer Avg. Word Count');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2).attr('y', -45)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('GPT Avg. Word Count');

    // Points
    g.selectAll('circle')
      .data(convData)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.devWords))
      .attr('cy', d => y(d.gptWords))
      .attr('r', 0)
      .attr('fill', d => EMOTION_COLORS_DEV[d.devEmotion as EmotionType] || EMOTION_COLORS[d.devEmotion as EmotionType] || '#6b7280')
      .attr('opacity', 0.7)
      .attr('stroke', '#0f1117')
      .attr('stroke-width', 0.5)
      .on('mouseover', (event, d) => {
        setGlobalTooltip({
          emotion: d.devEmotion,
          emotionColor: EMOTION_COLORS[d.devEmotion as EmotionType],
          count: d.codeBlocks,
          extraFields: {
            'Dev Words': Math.round(d.devWords),
            'GPT Words': Math.round(d.gptWords),
            'Code Blocks': d.codeBlocks,
          },
          textSnippet: d.title,
          keywords: d.keywords,
        });
      })
      .on('mouseout', () => setGlobalTooltip(null))
      .transition()
      .duration(1000)
      .ease(d3.easeCubicInOut)
      .attr('r', d => size(d.codeBlocks));

    // Legend for size
    const legendData = [0, Math.round(sizeMax / 2), sizeMax];
    const legend = g.append('g').attr('transform', `translate(${innerWidth - 100}, ${innerHeight - 60})`);
    legend.append('text').attr('x', 0).attr('y', -5).attr('fill', THEME.textSecondary).attr('font-size', '9px').text('Code blocks:');
    legendData.forEach((val, i) => {
      legend.append('circle')
        .attr('cx', 10 + i * 30)
        .attr('cy', 10)
        .attr('r', size(val))
        .attr('fill', 'none')
        .attr('stroke', THEME.textSecondary)
        .attr('stroke-width', 0.5);
      legend.append('text')
        .attr('x', 10 + i * 30)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .attr('fill', THEME.textSecondary)
        .attr('font-size', '8px')
        .text(val);
    });

  }, [turns, groups, width, height]);

  useEffect(() => { drawChart(); }, [drawChart]);

  return <svg ref={svgRef} />;
}
