'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { THEME, EMOTION_COLORS, getEmotionGlow } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, EmotionType } from '@/lib/types';
import { useDashboardStore } from '@/lib/store';

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

    const margin = { top: 20, right: 100, bottom: 50, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const devEmotions = ['Frustration', 'Confusion', 'Satisfaction', 'Engagement', 'Neutral'] as EmotionType[];

    const matrix: Record<string, { withCode: number; noCode: number }> = {};
    devEmotions.forEach(e => { matrix[e] = { withCode: 0, noCode: 0 }; });

    // Compute from real data: GPT turns grouped by has_code
    const gptTurns = data.filter(t => t.speaker === 'GPT');
    gptTurns.forEach(t => {
      const e = (t.emotion_dev || 'Neutral') as EmotionType;
      if (matrix[e]) {
        if (t.has_code) matrix[e].withCode++; else matrix[e].noCode++;
      }
    });

    const activeEmotions = devEmotions.filter(e => matrix[e].withCode + matrix[e].noCode > 0);

    const x0 = d3.scaleBand<string>().domain(['No Code', 'With Code']).range([0, innerWidth]).paddingInner(0.25).paddingOuter(0.2);
    const x1 = d3.scaleBand<string>().domain(activeEmotions).range([0, x0.bandwidth()]).padding(0.08);

    const maxY = d3.max(activeEmotions, e => Math.max(matrix[e].withCode, matrix[e].noCode)) || 1;
    const y = d3.scaleLinear().domain([0, maxY]).range([innerHeight, 0]);

    // Grid
    g.append('g').selectAll('line').data(y.ticks(5)).enter()
      .append('line').attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', THEME.gridLines).attr('stroke-width', 0.8);

    // Axes
    g.append('g').attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '11px').attr('dy', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    const totalWithCode = gptTurns.filter(t => t.has_code).length || 1;
    const totalNoCode = gptTurns.filter(t => !t.has_code).length || 1;

    ['No Code', 'With Code'].forEach(category => {
      activeEmotions.forEach(emotion => {
        const val = category === 'No Code' ? matrix[emotion].noCode : matrix[emotion].withCode;
        g.append('rect')
          .attr('class', 'impact-bar')
          .attr('x', x0(category)! + x1(emotion)!)
          .attr('y', innerHeight)
          .attr('width', x1.bandwidth())
          .attr('height', 0)
          .attr('rx', 2)
          .attr('fill', EMOTION_COLORS[emotion])
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            g.selectAll('.impact-bar').transition().duration(150).style('opacity', 0.25);
            d3.select(event.currentTarget).raise()
              .transition().duration(150).ease(d3.easeCubicOut)
              .style('opacity', 1)
              .style('filter', `drop-shadow(0 0 6px ${getEmotionGlow(emotion)})`);

            const totalForCategory = category === 'No Code' ? totalNoCode : totalWithCode;
            const ratePct = ((val / totalForCategory) * 100).toFixed(1);

            setGlobalTooltip({
              emotion,
              emotionColor: EMOTION_COLORS[emotion],
              count: val,
              percentage: `${ratePct}%`,
              extraFields: {
                'Code Context': category,
                'Category Total': `${totalForCategory} turns`,
                'Rate of Occurrence': `${ratePct}% of all ${category} turns`
              },
            });
          })
          .on('mouseout', () => {
            g.selectAll('.impact-bar').transition().duration(150).style('opacity', 1).style('filter', 'none');
            setGlobalTooltip(null);
          })
          .on('click', () => {
            useDashboardStore.setState({ selectedEmotions: [emotion], activeTab: 'case-inspector' });
          })
          .transition().duration(800).ease(d3.easeCubicInOut)
          .attr('y', y(val))
          .attr('height', innerHeight - y(val));
      });
    });

    // Legend
    const legend = g.append('g').attr('transform', `translate(${innerWidth + 12}, 5)`);
    activeEmotions.forEach((e, i) => {
      const row = legend.append('g').attr('transform', `translate(0, ${i * 20})`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2).attr('fill', EMOTION_COLORS[e]);
      row.append('text').attr('x', 17).attr('y', 9).attr('fill', THEME.textSecondary).attr('font-size', '10px').text(e);
    });

  }, [data, width, height]);

  useEffect(() => { drawChart(); }, [drawChart]);

  return <svg ref={svgRef} className="w-full h-full" />;
}
