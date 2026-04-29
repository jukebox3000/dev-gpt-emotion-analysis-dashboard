'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { EMOTION_COLORS, EMOTION_COLORS_DEV, EMOTION_COLORS_GPT, THEME } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, EmotionType } from '@/lib/types';

interface ConfidenceHistogramProps {
  data: Turn[];
  width: number;
  height: number;
}

export default function ConfidenceHistogram({ data, width, height }: ConfidenceHistogramProps) {
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

    const bins = 20;
    const binWidth = 1.0 / bins;

    const devBins = Array.from({ length: bins }, (_, i) => ({ bin: i * binWidth, count: 0 }));
    const gptBins = Array.from({ length: bins }, (_, i) => ({ bin: i * binWidth, count: 0 }));

    data.forEach(t => {
      const binIdx = Math.min(Math.floor(t.emotion_confidence / binWidth), bins - 1);
      if (t.speaker === 'Developer') devBins[binIdx].count++;
      else gptBins[binIdx].count++;
    });

    const maxCount = Math.max(
      d3.max(devBins, d => d.count) || 0,
      d3.max(gptBins, d => d.count) || 0
    ) || 1;

    const x = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, maxCount]).range([innerHeight, 0]);

    // Grid
    g.append('g').selectAll('line').data(y.ticks(5)).enter()
      .append('line').attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', THEME.gridLines).attr('stroke-dasharray', '2,2');

    // Axes
    g.append('g').attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format('.1f')).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    g.append('text').attr('x', innerWidth / 2).attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('Confidence Score');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2).attr('y', -45)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('Count');

    const barW = (innerWidth / bins) * 0.45;

    // Developer bars
    devBins.forEach(d => {
      g.append('rect')
        .attr('x', x(d.bin))
        .attr('y', innerHeight)
        .attr('width', barW)
        .attr('height', 0)
        .attr('fill', '#22c55e')
        .attr('opacity', 0.7)
        .attr('rx', 1)
        .on('mouseover', () => {
          setGlobalTooltip({
            speaker: 'Developer',
            count: d.count,
            extraFields: { 'Confidence Range': `${d.bin.toFixed(2)}–${(d.bin + binWidth).toFixed(2)}` },
          });
        })
        .on('mouseout', () => setGlobalTooltip(null))
        .transition().duration(800).ease(d3.easeCubicInOut)
        .attr('y', y(d.count))
        .attr('height', innerHeight - y(d.count));
    });

    // GPT bars
    gptBins.forEach(d => {
      g.append('rect')
        .attr('x', x(d.bin) + barW)
        .attr('y', innerHeight)
        .attr('width', barW)
        .attr('height', 0)
        .attr('fill', '#93c5fd')
        .attr('opacity', 0.7)
        .attr('rx', 1)
        .on('mouseover', () => {
          setGlobalTooltip({
            speaker: 'GPT',
            count: d.count,
            extraFields: { 'Confidence Range': `${d.bin.toFixed(2)}–${(d.bin + binWidth).toFixed(2)}` },
          });
        })
        .on('mouseout', () => setGlobalTooltip(null))
        .transition().duration(800).delay(100).ease(d3.easeCubicInOut)
        .attr('y', y(d.count))
        .attr('height', innerHeight - y(d.count));
    });

    // Legend
    const legend = g.append('g').attr('transform', `translate(${innerWidth - 130}, -10)`);
    legend.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', '#22c55e').attr('opacity', 0.7);
    legend.append('text').attr('x', 18).attr('y', 10).attr('fill', THEME.textSecondary).attr('font-size', '10px').text('Developer');
    legend.append('rect').attr('width', 12).attr('height', 12).attr('y', 16).attr('rx', 2).attr('fill', '#93c5fd').attr('opacity', 0.7);
    legend.append('text').attr('x', 18).attr('y', 26).attr('fill', THEME.textSecondary).attr('font-size', '10px').text('GPT');

  }, [data, width, height]);

  useEffect(() => { drawChart(); }, [drawChart]);

  return <svg ref={svgRef} />;
}
