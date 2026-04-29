'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { THEME } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn } from '@/lib/types';

interface CodeImpactChartProps {
  data: Turn[];
  width: number;
  height: number;
}

export default function CodeImpactChart({ data, width, height }: CodeImpactChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const drawChart = useCallback(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const gptEmotions = ['Confusion', 'Satisfaction', 'Engagement', 'Neutral'];
    const result: Record<string, { withCode: number; withoutCode: number }> = {};

    gptEmotions.forEach(e => { result[e] = { withCode: 0, withoutCode: 0 }; });

    data
      .filter(t => t.speaker === 'GPT' && result[t.emotion_dev || 'Neutral'])
      .forEach(t => {
        const emotion = t.emotion_dev || 'Neutral';
        if (result[emotion]) {
          if (t.has_code) result[emotion].withCode++;
          else result[emotion].withoutCode++;
        }
      });

    const x0 = d3.scaleBand<string>().domain(gptEmotions).range([0, innerWidth]).padding(0.25);
    const x1 = d3.scaleBand<string>().domain(['With Code', 'Without Code']).range([0, x0.bandwidth()]).padding(0.1);

    const maxVal = d3.max(gptEmotions, e => Math.max(result[e].withCode, result[e].withoutCode)) || 1;
    const y = d3.scaleLinear().domain([0, maxVal]).range([innerHeight, 0]);

    // Grid
    g.append('g').selectAll('line').data(y.ticks(5)).enter()
      .append('line').attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', THEME.gridLines).attr('stroke-dasharray', '2,2');

    // Axes
    g.append('g').attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '11px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    gptEmotions.forEach(emotion => {
      // With Code bar
      g.append('rect')
        .attr('x', x0(emotion)! + x1('With Code')!)
        .attr('y', innerHeight)
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('rx', 3)
        .attr('fill', '#22c55e')
        .on('mouseover', () => {
          setGlobalTooltip({
            emotion,
            count: result[emotion].withCode,
            extraFields: { 'Code Present': 'Yes' },
          });
        })
        .on('mouseout', () => setGlobalTooltip(null))
        .transition().duration(800).ease(d3.easeCubicInOut)
        .attr('y', y(result[emotion].withCode))
        .attr('height', innerHeight - y(result[emotion].withCode));

      // Without Code bar (with stripe pattern)
      g.append('rect')
        .attr('x', x0(emotion)! + x1('Without Code')!)
        .attr('y', innerHeight)
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('rx', 3)
        .attr('fill', 'url(#pattern-gpt)')
        .on('mouseover', () => {
          setGlobalTooltip({
            emotion,
            count: result[emotion].withoutCode,
            extraFields: { 'Code Present': 'No' },
          });
        })
        .on('mouseout', () => setGlobalTooltip(null))
        .transition().duration(800).delay(100).ease(d3.easeCubicInOut)
        .attr('y', y(result[emotion].withoutCode))
        .attr('height', innerHeight - y(result[emotion].withoutCode));
    });

    // Legend
    const legend = g.append('g').attr('transform', `translate(${innerWidth - 150}, -10)`);
    legend.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', '#22c55e');
    legend.append('text').attr('x', 18).attr('y', 10).attr('fill', THEME.textSecondary).attr('font-size', '10px').text('With Code');
    legend.append('rect').attr('width', 12).attr('height', 12).attr('y', 16).attr('rx', 2).attr('fill', 'url(#pattern-gpt)');
    legend.append('text').attr('x', 18).attr('y', 26).attr('fill', THEME.textSecondary).attr('font-size', '10px').text('Without Code');

  }, [data, width, height]);

  useEffect(() => { drawChart(); }, [drawChart]);

  return <svg ref={svgRef} />;
}
