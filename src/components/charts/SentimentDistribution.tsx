'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { THEME } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn } from '@/lib/types';

interface SentimentDistributionProps {
  data: Turn[];
  width: number;
  height: number;
}

export default function SentimentDistribution({ data, width, height }: SentimentDistributionProps) {
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

    const bins = 30;
    const binWidth = 2.0 / bins;

    const devBins = Array.from({ length: bins }, (_, i) => ({ bin: -1 + i * binWidth, count: 0 }));
    const gptBins = Array.from({ length: bins }, (_, i) => ({ bin: -1 + i * binWidth, count: 0 }));

    data.forEach(t => {
      const binIdx = Math.min(Math.max(Math.floor((t.sentiment_polarity + 1) / binWidth), 0), bins - 1);
      if (t.speaker === 'Developer') devBins[binIdx].count++;
      else gptBins[binIdx].count++;
    });

    const maxCount = Math.max(
      d3.max(devBins, d => d.count) || 0,
      d3.max(gptBins, d => d.count) || 0
    ) || 1;

    const x = d3.scaleLinear().domain([-1, 1]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, maxCount]).range([innerHeight, 0]);

    // Grid
    g.append('g').selectAll('line').data(y.ticks(5)).enter()
      .append('line').attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', THEME.gridLines).attr('stroke-dasharray', '2,2');

    // Zero line
    g.append('line').attr('x1', x(0)).attr('x2', x(0))
      .attr('y1', 0).attr('y2', innerHeight)
      .attr('stroke', THEME.axes).attr('stroke-width', 1).attr('stroke-dasharray', '4,4');

    // Axes
    g.append('g').attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.1f')).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    g.append('text').attr('x', innerWidth / 2).attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('Sentiment Polarity');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2).attr('y', -45)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('Count');

    // Developer area
    const devArea = d3.area<{ bin: number; count: number }>()
      .x(d => x(d.bin + binWidth / 2))
      .y0(innerHeight)
      .y1(d => y(d.count))
      .curve(d3.curveBasis);

    g.append('path')
      .datum(devBins)
      .attr('fill', '#22c55e')
      .attr('opacity', 0)
      .attr('d', devArea)
      .transition().duration(800).ease(d3.easeCubicInOut)
      .attr('opacity', 0.4);

    // GPT area
    const gptArea = d3.area<{ bin: number; count: number }>()
      .x(d => x(d.bin + binWidth / 2))
      .y0(innerHeight)
      .y1(d => y(d.count))
      .curve(d3.curveBasis);

    g.append('path')
      .datum(gptBins)
      .attr('fill', '#93c5fd')
      .attr('opacity', 0)
      .attr('d', gptArea)
      .transition().duration(800).delay(100).ease(d3.easeCubicInOut)
      .attr('opacity', 0.4);

    // Developer line
    const devLine = d3.line<{ bin: number; count: number }>()
      .x(d => x(d.bin + binWidth / 2))
      .y(d => y(d.count))
      .curve(d3.curveBasis);

    g.append('path')
      .datum(devBins)
      .attr('fill', 'none')
      .attr('stroke', '#22c55e')
      .attr('stroke-width', 2)
      .attr('d', devLine)
      .attr('opacity', 0);

    // Animate line drawing
    const devLinePath = g.selectAll('path').filter(function () {
      return d3.select(this).attr('stroke') === '#22c55e' && d3.select(this).attr('fill') === 'none';
    });

    const totalLength = (devLinePath.node() as SVGPathElement)?.getTotalLength() || 0;
    devLinePath
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .attr('opacity', 1)
      .transition()
      .duration(1500)
      .ease(d3.easeCubicInOut)
      .attr('stroke-dashoffset', 0);

    // GPT line
    const gptLine = d3.line<{ bin: number; count: number }>()
      .x(d => x(d.bin + binWidth / 2))
      .y(d => y(d.count))
      .curve(d3.curveBasis);

    g.append('path')
      .datum(gptBins)
      .attr('fill', 'none')
      .attr('stroke', '#93c5fd')
      .attr('stroke-width', 2)
      .attr('d', gptLine)
      .attr('opacity', 0);

    const gptLinePath = g.selectAll('path').filter(function () {
      return d3.select(this).attr('stroke') === '#93c5fd' && d3.select(this).attr('fill') === 'none';
    });

    const gptLength = (gptLinePath.node() as SVGPathElement)?.getTotalLength() || 0;
    gptLinePath
      .attr('stroke-dasharray', `${gptLength} ${gptLength}`)
      .attr('stroke-dashoffset', gptLength)
      .attr('opacity', 1)
      .transition()
      .duration(1500)
      .delay(200)
      .ease(d3.easeCubicInOut)
      .attr('stroke-dashoffset', 0);

    // Hover overlay
    g.append('rect')
      .attr('width', innerWidth).attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const polarity = x.invert(mx);
        const binIdx = Math.min(Math.max(Math.floor((polarity + 1) / binWidth), 0), bins - 1);
        setGlobalTooltip({
          extraFields: {
            Polarity: polarity.toFixed(2),
            'Dev Count': devBins[binIdx]?.count || 0,
            'GPT Count': gptBins[binIdx]?.count || 0,
          },
        });
      })
      .on('mouseout', () => setGlobalTooltip(null));

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
