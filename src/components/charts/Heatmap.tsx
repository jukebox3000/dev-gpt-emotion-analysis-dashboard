'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { EMOTION_ORDER, EMOTION_COLORS, EMOTION_COLORS_DEV, EMOTION_COLORS_GPT, THEME } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, ConversationGroup, EmotionType } from '@/lib/types';

interface HeatmapProps {
  turns: Turn[];
  groups: ConversationGroup[];
  width: number;
  height: number;
}

export default function Heatmap({ turns, groups, width, height }: HeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const drawChart = useCallback(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 90 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const devEmotions = ['Frustration', 'Confusion', 'Satisfaction', 'Engagement', 'Neutral'];
    const gptEmotions = ['Confusion', 'Satisfaction', 'Engagement', 'Neutral'];

    // Build mapping from groups
    const mapping: Record<string, Record<string, { count: number; snippet: string }>> = {};
    devEmotions.forEach(de => {
      mapping[de] = {};
      gptEmotions.forEach(ge => { mapping[de][ge] = { count: 0, snippet: '' }; });
    });

    groups.forEach(group => {
      const devTurns = group.turns.filter(t => t.speaker === 'Developer' && t.emotion_dev);
      const gptTurns = group.turns.filter(t => t.speaker === 'GPT' && t.emotion_dev);

      devTurns.forEach(dt => {
        const de = dt.emotion_dev!;
        gptTurns.forEach(gt => {
          const ge = gt.emotion_dev!;
          if (mapping[de] && mapping[de][ge] !== undefined) {
            mapping[de][ge].count++;
            if (!mapping[de][ge].snippet) {
              mapping[de][ge].snippet = dt.text_preview?.slice(0, 80) || '';
            }
          }
        });
      });
    });

    const maxCount = d3.max(devEmotions, de =>
      d3.max(gptEmotions, ge => mapping[de][ge].count) || 0
    ) || 1;

    const x = d3.scaleBand<string>().domain(gptEmotions).range([0, innerWidth]).padding(0.05);
    const y = d3.scaleBand<string>().domain(devEmotions).range([0, innerHeight]).padding(0.05);
    const color = d3.scaleSequential(d3.interpolateRgbBasis(['#1a1d27', '#3b82f6', '#f59e0b', '#ef4444']))
      .domain([0, maxCount]);

    // X axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    g.append('text').attr('x', innerWidth / 2).attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('GPT Emotion');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2).attr('y', -70)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('Developer Emotion');

    // Cells
    devEmotions.forEach(de => {
      gptEmotions.forEach(ge => {
        const val = mapping[de][ge];
        g.append('rect')
          .attr('x', x(ge)!)
          .attr('y', y(de)!)
          .attr('width', x.bandwidth())
          .attr('height', y.bandwidth())
          .attr('rx', 3)
          .attr('fill', '#1a1d27')
          .on('mouseover', () => {
            setGlobalTooltip({
              emotion: de,
              emotionColor: EMOTION_COLORS_DEV[de as EmotionType],
              count: val.count,
              extraFields: { 'GPT Emotion': ge },
              textSnippet: val.snippet,
            });
          })
          .on('mouseout', () => setGlobalTooltip(null))
          .transition()
          .duration(800)
          .ease(d3.easeCubicInOut)
          .attr('fill', color(val.count));

        // Text label
        if (val.count > 0) {
          g.append('text')
            .attr('x', x(ge)! + x.bandwidth() / 2)
            .attr('y', y(de)! + y.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', val.count > maxCount * 0.6 ? '#fff' : THEME.textSecondary)
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .style('opacity', 0)
            .text(val.count)
            .transition()
            .duration(1000)
            .style('opacity', 1);
        }
      });
    });

  }, [turns, groups, width, height]);

  useEffect(() => { drawChart(); }, [drawChart]);

  return <svg ref={svgRef} />;
}
