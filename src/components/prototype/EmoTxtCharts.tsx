'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn } from '@/lib/types';

// Curated EmoTxt color system
export const EMOTXT_COLORS: Record<string, string> = {
  Anger: '#ef4444',     // red-500 (Frustration/Anger)
  Fear: '#a855f7',      // purple-500
  Joy: '#2db87a',       // emerald-500 (Positive/Engagement/Joy)
  Love: '#f43f5e',      // rose-500
  Sadness: '#3b82f6',   // blue-500
  Surprise: '#ec4899',  // pink-500
  Neutral: '#64748b',   // slate-500
};

export const EMOTXT_EMOJIS: Record<string, string> = {
  Anger: '🤬',
  Fear: '😨',
  Joy: '💡',
  Love: '💖',
  Sadness: '😢',
  Surprise: '😲',
  Neutral: '😐',
};

function emotxtGlow(emotion: string): string {
  const c = EMOTXT_COLORS[emotion] || '#64748b';
  const r = parseInt(c.slice(1,3), 16);
  const g = parseInt(c.slice(3,5), 16);
  const b = parseInt(c.slice(5,7), 16);
  return `rgba(${r},${g},${b},0.45)`;
}

// ─── Chart E1: EmoTxt Emotion Distribution (Donut) ───────────────────────────
export function EmoTxtDonut({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [speakerFilter, setSpeakerFilter] = useState<'developer' | 'gpt' | 'both'>('both');

  useEffect(() => {
    if (!svgRef.current || width === 0 || height === 0) return;
    const svg = d3.select(svgRef.current);

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

    // Add patterns inside defs for striped GPT slices
    let defs = svg.select('defs');
    if (defs.empty()) {
      defs = svg.append('defs');
      
      Object.entries(EMOTXT_COLORS).forEach(([emo, color]) => {
        const id = `pattern-emotxt-${emo.toLowerCase()}`;
        const pat = defs.append('pattern')
          .attr('id', id)
          .attr('width', 6)
          .attr('height', 6)
          .attr('patternUnits', 'userSpaceOnUse')
          .attr('patternTransform', 'rotate(45)');
        
        // Light pastel background
        const r = parseInt(color.slice(1,3), 16);
        const gr = parseInt(color.slice(3,5), 16);
        const bl = parseInt(color.slice(5,7), 16);
        const lightColor = `rgba(${r},${gr},${bl},0.2)`;
        
        pat.append('rect').attr('width', 6).attr('height', 6).attr('fill', lightColor);
        pat.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).attr('stroke', color).attr('stroke-width', 2);
      });
    }

    const margin = 20;
    const radius = Math.min(width, height) / 2 - margin;

    const devTurns = data.filter(t => t.speaker === 'Developer');
    const gptTurns = data.filter(t => t.speaker === 'GPT');

    const categories = Object.keys(EMOTXT_COLORS); // Anger, Fear, Joy, Love, Sadness, Surprise, Neutral
    const devCounts: Record<string, number> = {};
    const gptCounts: Record<string, number> = {};
    
    categories.forEach(c => { devCounts[c] = 0; gptCounts[c] = 0; });

    devTurns.forEach(t => {
      const e = t.emotion_dev || 'Neutral';
      if (devCounts[e] !== undefined) devCounts[e]++;
    });
    gptTurns.forEach(t => {
      const e = t.emotion_dev || 'Neutral';
      if (gptCounts[e] !== undefined) gptCounts[e]++;
    });

    const totalDev = Object.values(devCounts).reduce((a, b) => a + b, 0);
    const totalGpt = Object.values(gptCounts).reduce((a, b) => a + b, 0);
    const totalAll = totalDev + totalGpt;

    const devData = Object.entries(devCounts).map(([k, v]) => ({ label: k, count: v })).filter(d => d.count > 0);
    const gptData = Object.entries(gptCounts).map(([k, v]) => ({ label: k, count: v })).filter(d => d.count > 0);

    const pie = d3.pie<{ label: string; count: number }>()
      .value(d => d.count)
      .sort(null)
      .padAngle(0.015);

    const radii = {
      dev: {
        both: { inner: radius * 0.45, outer: radius * 0.68 },
        developer: { inner: radius * 0.50, outer: radius * 0.95 },
        gpt: { inner: radius * 0.45, outer: radius * 0.45 },
      },
      gpt: {
        both: { inner: radius * 0.72, outer: radius * 0.95 },
        developer: { inner: radius * 0.95, outer: radius * 0.95 },
        gpt: { inner: radius * 0.50, outer: radius * 0.95 },
      }
    };

    const targetDevInner = radii.dev[speakerFilter].inner;
    const targetDevOuter = radii.dev[speakerFilter].outer;
    const targetDevOpacity = speakerFilter === 'gpt' ? 0 : 1;
    const targetDevPointerEvents = speakerFilter === 'gpt' ? 'none' : 'auto';

    const targetGptInner = radii.gpt[speakerFilter].inner;
    const targetGptOuter = radii.gpt[speakerFilter].outer;
    const targetGptOpacity = speakerFilter === 'developer' ? 0 : 1;
    const targetGptPointerEvents = speakerFilter === 'developer' ? 'none' : 'auto';

    let devGroup = g.select<SVGGElement>('g.dev-layer');
    if (devGroup.empty()) devGroup = g.append('g').attr('class', 'dev-layer');

    let gptGroup = g.select<SVGGElement>('g.gpt-layer');
    if (gptGroup.empty()) gptGroup = g.append('g').attr('class', 'gpt-layer');

    // Dev Arcs (Solid)
    const devPaths = devGroup.selectAll<SVGPathElement, d3.PieArcDatum<{ label: string; count: number }>>('path')
      .data(pie(devData), d => d.data.label);

    devPaths.exit().remove();

    const newDevPaths = devPaths.enter()
      .append('path')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0)
      .style('cursor', 'pointer');

    const allDevPaths = newDevPaths.merge(devPaths);

    allDevPaths
      .attr('fill', d => EMOTXT_COLORS[d.data.label] || '#64748b')
      .on('mouseover', function(event, d) {
        if (speakerFilter === 'gpt') return;
        const currentInner = (this as any)._currentInner || radii.dev.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.dev.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(currentInner - 3)
            .outerRadius(currentOuter + 8)(d) as any)
          .attr('stroke-width', 2)
          .style('filter', `drop-shadow(0 0 12px ${emotxtGlow(d.data.label)})`);

        setGlobalTooltip({
          emotion: d.data.label,
          emotionColor: EMOTXT_COLORS[d.data.label],
          speaker: 'Developer',
          count: d.data.count,
          percentage: `${((d.data.count / totalDev) * 100).toFixed(1)}%`,
        });
      })
      .on('mouseout', function(event, d) {
        if (speakerFilter === 'gpt') return;
        const currentInner = (this as any)._currentInner || radii.dev.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.dev.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(currentInner)
            .outerRadius(currentOuter)(d) as any)
          .attr('stroke-width', 1.5)
          .style('filter', 'none');
        setGlobalTooltip(null);
      });

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
          return d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(interpolateInner(t))
            .outerRadius(interpolateOuter(t))(d) as any;
        };
      });

    // GPT Arcs (Striped)
    const gptPaths = gptGroup.selectAll<SVGPathElement, d3.PieArcDatum<{ label: string; count: number }>>('path')
      .data(pie(gptData), d => d.data.label);

    gptPaths.exit().remove();

    const newGptPaths = gptPaths.enter()
      .append('path')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0)
      .style('cursor', 'pointer');

    const allGptPaths = newGptPaths.merge(gptPaths);

    allGptPaths
      .attr('fill', d => `url(#pattern-emotxt-${d.data.label.toLowerCase()})`)
      .on('mouseover', function(event, d) {
        if (speakerFilter === 'developer') return;
        const currentInner = (this as any)._currentInner || radii.gpt.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.gpt.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(currentInner - 3)
            .outerRadius(currentOuter + 8)(d) as any)
          .attr('stroke-width', 2)
          .style('filter', `drop-shadow(0 0 12px ${emotxtGlow(d.data.label)})`);

        setGlobalTooltip({
          emotion: d.data.label,
          emotionColor: EMOTXT_COLORS[d.data.label],
          speaker: 'GPT',
          count: d.data.count,
          percentage: `${((d.data.count / totalGpt) * 100).toFixed(1)}%`,
        });
      })
      .on('mouseout', function(event, d) {
        if (speakerFilter === 'developer') return;
        const currentInner = (this as any)._currentInner || radii.gpt.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.gpt.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(currentInner)
            .outerRadius(currentOuter)(d) as any)
          .attr('stroke-width', 1.5)
          .style('filter', 'none');
        setGlobalTooltip(null);
      });

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
          return d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(interpolateInner(t))
            .outerRadius(interpolateOuter(t))(d) as any;
        };
      });

    // Center text Group
    let textGroup = g.select<SVGGElement>('g.text-group');
    if (textGroup.empty()) {
      textGroup = g.append('g').attr('class', 'text-group');
      textGroup.append('text').attr('class', 'center-emoji').attr('text-anchor', 'middle');
      textGroup.append('text').attr('class', 'center-count').attr('text-anchor', 'middle');
      textGroup.append('text').attr('class', 'center-label').attr('text-anchor', 'middle');
    }

    const emojiText = speakerFilter === 'both' ? '🤖 / 👨‍💻' : (speakerFilter === 'developer' ? '👨‍💻' : '🤖');
    const countValue = speakerFilter === 'both' ? totalAll : (speakerFilter === 'developer' ? totalDev : totalGpt);
    const labelText = speakerFilter === 'both' ? 'Total turns' : (speakerFilter === 'developer' ? 'Dev turns' : 'GPT turns');

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
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .text(labelText.toUpperCase());

  }, [data, width, height, speakerFilter]);

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      <div className="flex gap-1 mb-2 bg-indigo-50/20 p-1 rounded-xl border border-indigo-100/30">
        <button
          onClick={() => setSpeakerFilter('both')}
          className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            speakerFilter === 'both' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-950 hover:bg-indigo-50/50'
          }`}
        >
          🎯 Both Rings
        </button>
        <button
          onClick={() => setSpeakerFilter('developer')}
          className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            speakerFilter === 'developer' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-850 hover:bg-blue-50/40'
          }`}
        >
          👨‍💻 Developer (Inner)
        </button>
        <button
          onClick={() => setSpeakerFilter('gpt')}
          className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            speakerFilter === 'gpt' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-850 hover:bg-emerald-50/40'
          }`}
        >
          🤖 GPT (Outer)
        </button>
      </div>

      <div className="w-full h-full flex items-center justify-center">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
      
      {/* Legend below Donut */}
      <div className="flex justify-center gap-6 mt-1 text-[10px] text-slate-500 font-bold border-t border-slate-100 pt-2 w-4/5">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-500 border border-slate-400"></span>
          <span>👨‍💻 Developer (Solid Fill)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-indigo-100 border border-slate-400 relative overflow-hidden">
            <span className="absolute inset-0 bg-repeat" style={{ backgroundImage: 'linear-gradient(45deg, #475569 25%, transparent 25%, transparent 50%, #475569 50%, #475569 75%, transparent 75%, transparent)', backgroundSize: '4px 4px' }} />
          </span>
          <span>🤖 GPT (Stripe Pattern)</span>
        </div>
      </div>
    </div>
  );
}

// ─── Chart E2: Direct Comparison Dev vs GPT (grouped bar) ─────────────────────
export function EmoTxtDirectComparison({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const categories = Object.keys(EMOTXT_COLORS); // Anger, Fear, Joy, Love, Sadness, Surprise, Neutral
    const devC: Record<string, number> = {};
    const gptC: Record<string, number> = {};
    categories.forEach(c => { devC[c] = 0; gptC[c] = 0; });

    data.forEach(t => {
      const e = t.emotion_dev || 'Neutral';
      if (t.speaker === 'Developer') {
        if (devC[e] !== undefined) devC[e]++;
      } else {
        if (gptC[e] !== undefined) gptC[e]++;
      }
    });

    const margin = { top: 20, right: 110, bottom: 45, left: 45 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(categories).range([0, innerW]).paddingInner(0.25).paddingOuter(0.15);
    const x1 = d3.scaleBand().domain(['Developer', 'GPT']).range([0, x0.bandwidth()]).padding(0.05);
    const maxY = d3.max(categories, l => Math.max(devC[l] || 0, gptC[l] || 0)) || 1;
    const y = d3.scaleLinear().domain([0, maxY]).range([innerH, 0]);

    g.append('g').selectAll('line').data(y.ticks(5)).enter().append('line')
      .attr('x1', 0).attr('x2', innerW).attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#f1f5f9').attr('stroke-width', 0.8);

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px').attr('dy', '10px').attr('font-weight', 'bold');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');

    const barData: { label: string; speaker: string; value: number }[] = [];
    categories.forEach(l => {
      barData.push({ label: l, speaker: 'Developer', value: devC[l] });
      barData.push({ label: l, speaker: 'GPT', value: gptC[l] });
    });

    const bars = g.selectAll('.emotxt-bar')
      .data(barData).enter().append('rect')
      .attr('class', 'emotxt-bar')
      .attr('x', d => x0(d.label)! + x1(d.speaker)!)
      .attr('y', innerH).attr('width', x1.bandwidth()).attr('height', 0)
      .attr('rx', 3)
      .attr('fill', d => EMOTXT_COLORS[d.label])
      .attr('opacity', d => d.speaker === 'GPT' ? 0.55 : 1)
      .attr('stroke', d => d.speaker === 'GPT' ? '#475569' : 'none')
      .attr('stroke-dasharray', d => d.speaker === 'GPT' ? '2,2' : 'none')
      .attr('stroke-width', d => d.speaker === 'GPT' ? 1.2 : 0)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        g.selectAll('.emotxt-bar').transition().duration(250).style('opacity', 0.2);
        d3.select(event.currentTarget as SVGRectElement).raise()
          .transition().duration(250).ease(d3.easeCubicOut)
          .style('opacity', 1)
          .style('filter', `drop-shadow(0 0 8px ${emotxtGlow(d.label)})`);
        setGlobalTooltip({ emotion: d.label, emotionColor: EMOTXT_COLORS[d.label], speaker: d.speaker as any, count: d.value });
      }).on('mouseout', () => {
        g.selectAll('.emotxt-bar').transition().duration(250).ease(d3.easeCubicOut)
          .style('opacity', (d: any) => d.speaker === 'GPT' ? 0.55 : 1).style('filter', 'none');
        setGlobalTooltip(null);
      });

    bars.transition().duration(800).ease(d3.easeCubicInOut)
      .attr('y', d => y(d.value)).attr('height', d => innerH - y(d.value));

    const leg = g.append('g').attr('transform', `translate(${innerW + 15}, 5)`);
    ['Developer', 'GPT'].forEach((sp, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2)
        .attr('fill', sp === 'Developer' ? '#64748b' : '#b8c6d6')
        .attr('stroke', sp === 'GPT' ? '#475569' : 'none')
        .attr('stroke-dasharray', sp === 'GPT' ? '2,2' : 'none')
        .attr('stroke-width', sp === 'GPT' ? 1 : 0);
      row.append('text').attr('x', 18).attr('y', 9).attr('font-size', '10px').attr('fill', '#475569').attr('font-weight', 'bold').text(sp);
    });

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 35)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Emotion Category');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -30)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Turns Count');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart E3: EmoTxt Emotion vs Complexity ───────────────────────────────
export function EmoTxtComplexity({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const complexities = ['Low', 'Medium', 'High'];
    const categories = Object.keys(EMOTXT_COLORS); // Anger, Fear, Joy, Love, Sadness, Surprise, Neutral

    const matrix: Record<string, Record<string, number>> = {};
    complexities.forEach(c => { matrix[c] = {}; categories.forEach(e => { matrix[c][e] = 0; }); });

    data.filter(t => t.speaker === 'Developer').forEach(t => {
      const e = t.emotion_dev || 'Neutral';
      const c = t.prompt_complexity;
      if (matrix[c] && matrix[c][e] !== undefined) matrix[c][e]++;
    });

    const margin = { top: 20, right: 120, bottom: 45, left: 45 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(complexities).range([0, innerW]).paddingInner(0.28).paddingOuter(0.2);
    const x1 = d3.scaleBand().domain(categories).range([0, x0.bandwidth()]).padding(0.02);
    const maxY = d3.max(complexities, c => d3.max(categories, e => matrix[c][e]) || 0) || 1;
    const y = d3.scaleLinear().domain([0, maxY]).range([innerH, 0]);

    g.append('g').selectAll('line').data(y.ticks(5)).enter().append('line')
      .attr('x1', 0).attr('x2', innerW).attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#f1f5f9').attr('stroke-width', 0.8);

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '11px').attr('dy', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');

    complexities.forEach(complexity => {
      categories.forEach(emotion => {
        const val = matrix[complexity][emotion];
        g.append('rect').attr('class', 'px-bar')
          .attr('x', x0(complexity)! + x1(emotion)!).attr('y', innerH)
          .attr('width', x1.bandwidth()).attr('height', 0).attr('rx', 2)
          .attr('fill', EMOTXT_COLORS[emotion])
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            g.selectAll('.px-bar').transition().duration(250).style('opacity', 0.25);
            d3.select(event.currentTarget as SVGRectElement).raise()
              .transition().duration(250).ease(d3.easeCubicOut)
              .style('opacity', 1).style('filter', `drop-shadow(0 0 6px ${emotxtGlow(emotion)})`);
            setGlobalTooltip({ emotion, emotionColor: EMOTXT_COLORS[emotion], count: val, extraFields: { Complexity: complexity } });
          }).on('mouseout', () => {
            g.selectAll('.px-bar').transition().duration(250).ease(d3.easeCubicOut)
              .style('opacity', 1).style('filter', 'none');
            setGlobalTooltip(null);
          })
          .transition().duration(800).ease(d3.easeCubicInOut).attr('y', y(val)).attr('height', innerH - y(val));
      });
    });

    const leg = g.append('g').attr('transform', `translate(${innerW + 12}, 5)`);
    categories.forEach((c, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2).attr('fill', EMOTXT_COLORS[c]);
      row.append('text').attr('x', 17).attr('y', 9).attr('font-size', '10px').attr('font-weight', 'bold').attr('fill', '#475569').text(c);
    });

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Prompt Complexity');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -28)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Developer Prompt Count');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart E4: EmoTxt Emotion Heatmap (Dev → GPT Transition) ───────────────────
// PAIRING BUG FIXED: Uses Math.floor(t.turn_index / 2) to link developer prompts and GPT replies
export function EmoTxtHeatmap({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const devEmotions = Object.keys(EMOTXT_COLORS);
    const gptEmotions = Object.keys(EMOTXT_COLORS);

    const matrix: Record<string, Record<string, number>> = {};
    devEmotions.forEach(de => { matrix[de] = {}; gptEmotions.forEach(ge => { matrix[de][ge] = 0; }); });

    // Correct pairing logic by interaction index Math.floor(turn_index / 2)
    const pairs: Record<string, { dev?: string; gpt?: string }> = {};
    data.forEach(t => {
      const interactionIndex = Math.floor(t.turn_index / 2);
      const key = `${t.conversation_id}__${interactionIndex}`;
      if (!pairs[key]) pairs[key] = {};
      
      const emo = t.emotion_dev || 'Neutral';
      if (t.speaker === 'Developer') pairs[key].dev = emo;
      else pairs[key].gpt = emo;
    });

    Object.values(pairs).forEach(({ dev, gpt }) => {
      if (dev && gpt && matrix[dev] && matrix[dev][gpt] !== undefined) {
        matrix[dev][gpt]++;
      }
    });

    const margin = { top: 20, right: 80, bottom: 45, left: 100 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(gptEmotions).range([0, innerW]).padding(0.05);
    const y = d3.scaleBand().domain(devEmotions).range([0, innerH]).padding(0.05);

    const allVals = devEmotions.flatMap(de => gptEmotions.map(ge => matrix[de][ge]));
    const maxVal = d3.max(allVals) || 1;

    const cellData = devEmotions.flatMap(de => gptEmotions.map(ge => ({ de, ge, val: matrix[de][ge] })));

    const cells = g.selectAll('.hm-cell').data(cellData).enter()
      .append('rect').attr('class', 'hm-cell')
      .attr('x', d => x(d.ge)!).attr('y', d => y(d.de)!)
      .attr('width', x.bandwidth()).attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', d => d3.interpolatePurples(Math.pow(d.val / maxVal, 0.5) * 0.9))
      .style('opacity', 0).style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        g.selectAll('.hm-cell').transition().duration(250).style('opacity', 0.3);
        d3.select(event.currentTarget as SVGRectElement)
          .raise().transition().duration(250).ease(d3.easeCubicOut)
          .style('opacity', 1)
          .style('filter', `drop-shadow(0 0 6px ${emotxtGlow(d.de)})`);
        setGlobalTooltip({
          emotion: d.de,
          emotionColor: EMOTXT_COLORS[d.de],
          count: d.val,
          extraFields: { 'Dev Emotion': d.de, 'GPT Response': d.ge },
        });
      }).on('mouseout', () => {
        g.selectAll('.hm-cell').transition().duration(250).ease(d3.easeCubicOut).style('opacity', 1).style('filter', 'none');
        setGlobalTooltip(null);
      });

    cells.transition().duration(800).ease(d3.easeCubicInOut).style('opacity', 1);

    g.selectAll('.hm-label').data(cellData).enter().append('text')
      .attr('class', 'hm-label')
      .attr('x', d => x(d.ge)! + x.bandwidth() / 2)
      .attr('y', d => y(d.de)! + y.bandwidth() / 2)
      .attr('dy', '.35em').attr('text-anchor', 'middle')
      .attr('font-size', '10px').attr('font-weight', '700')
      .attr('fill', d => d.val > maxVal * 0.5 ? '#fff' : '#1e293b')
      .text(d => d.val > 0 ? d.val : '');

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '9px').attr('dy', '10px').attr('font-weight', 'bold');

    g.append('g').call(d3.axisLeft(y).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '9px').attr('dx', '-5px').attr('font-weight', 'bold');

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('GPT Response Emotion');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -75)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Developer Prompt Emotion');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart E5: EmoTxt Emotion Co-occurrence Heatmap (Multi-label Overlaps) ─────
export function EmoTxtCooccurrence({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // 6 actual emotions (excluding Neutral)
    const emotions = ['joy', 'anger', 'sadness', 'fear', 'surprise', 'love'];
    const displayEmotions = ['Joy', 'Anger', 'Sadness', 'Fear', 'Surprise', 'Love'];

    const matrix: Record<string, Record<string, number>> = {};
    displayEmotions.forEach(e1 => { matrix[e1] = {}; displayEmotions.forEach(e2 => { matrix[e1][e2] = 0; }); });

    data.forEach(t => {
      const active: string[] = [];
      
      // EmoTxt multi-label list
      const emotxt_all = t.emotxt_all_emotions || [];
      emotxt_all.forEach(e => {
        const capitalized = e.charAt(0).toUpperCase() + e.slice(1);
        if (displayEmotions.includes(capitalized)) active.push(capitalized);
      });

      // Increment overlapping counts
      for (let i = 0; i < active.length; i++) {
        for (let j = 0; j < active.length; j++) {
          matrix[active[i]][active[j]]++;
        }
      }
    });

    const margin = { top: 20, right: 80, bottom: 45, left: 80 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(displayEmotions).range([0, innerW]).padding(0.05);
    const y = d3.scaleBand().domain(displayEmotions).range([0, innerH]).padding(0.05);

    const cellData: { e1: string; e2: string; val: number }[] = [];
    displayEmotions.forEach(e1 => {
      displayEmotions.forEach(e2 => {
        cellData.push({ e1, e2, val: matrix[e1][e2] });
      });
    });

    // Exclude diagonal self-overlaps for color scale
    const offDiagonalVals = cellData.filter(d => d.e1 !== d.e2).map(d => d.val);
    const maxVal = d3.max(offDiagonalVals) || 1;

    const cells = g.selectAll('.co-cell').data(cellData).enter()
      .append('rect').attr('class', 'co-cell')
      .attr('x', d => x(d.e2)!).attr('y', d => y(d.e1)!)
      .attr('width', x.bandwidth()).attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', d => {
        if (d.e1 === d.e2) return '#f8fafc'; // Neutral background for self-correlation
        return d3.interpolateBlues(Math.pow(d.val / maxVal, 0.5) * 0.85);
      })
      .attr('stroke', d => d.e1 === d.e2 ? '#cbd5e1' : 'none')
      .attr('stroke-width', d => d.e1 === d.e2 ? 0.8 : 0)
      .style('opacity', 0).style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        g.selectAll('.co-cell').transition().duration(250).style('opacity', 0.3);
        d3.select(event.currentTarget as SVGRectElement)
          .raise().transition().duration(250).ease(d3.easeCubicOut)
          .style('opacity', 1)
          .style('filter', `drop-shadow(0 0 6px ${emotxtGlow(d.e1)})`);
        setGlobalTooltip({
          emotion: d.e1,
          emotionColor: EMOTXT_COLORS[d.e1],
          count: d.val,
          extraFields: d.e1 === d.e2 
            ? { 'Emotion': d.e1, 'Total Turns Classified': d.val }
            : { 'Emotion A': d.e1, 'Emotion B': d.e2, 'Turns with BOTH': d.val },
        });
      }).on('mouseout', () => {
        g.selectAll('.co-cell').transition().duration(250).ease(d3.easeCubicOut).style('opacity', 1).style('filter', 'none');
        setGlobalTooltip(null);
      });

    cells.transition().duration(800).ease(d3.easeCubicInOut).style('opacity', 1);

    g.selectAll('.co-label').data(cellData).enter().append('text')
      .attr('class', 'co-label')
      .attr('x', d => x(d.e2)! + x.bandwidth() / 2)
      .attr('y', d => y(d.e1)! + y.bandwidth() / 2)
      .attr('dy', '.35em').attr('text-anchor', 'middle')
      .attr('font-size', '10px').attr('font-weight', '700')
      .attr('fill', d => {
        if (d.e1 === d.e2) return '#64748b';
        return d.val > maxVal * 0.5 ? '#fff' : '#1e293b';
      })
      .text(d => d.val > 0 ? d.val : '');

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px').attr('dy', '10px').attr('font-weight', 'bold');

    g.append('g').call(d3.axisLeft(y).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px').attr('dx', '-5px').attr('font-weight', 'bold');

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('EmoTxt Emotion B');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -55)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('EmoTxt Emotion A');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart E6: Code Blocks — AI Tone Impact ──────────────────────────────────
export function EmoTxtCodeImpact({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const gptTurns = data.filter(t => t.speaker === 'GPT');
    const categories = Object.keys(EMOTXT_COLORS); // Anger, Fear, Joy, Love, Sadness, Surprise, Neutral

    const matrix: Record<string, { withCode: number; noCode: number }> = {};
    categories.forEach(e => { matrix[e] = { withCode: 0, noCode: 0 }; });
    gptTurns.forEach(t => {
      const e = t.emotion_dev || 'Neutral';
      if (matrix[e]) {
        if (t.has_code) matrix[e].withCode++; else matrix[e].noCode++;
      }
    });

    const margin = { top: 20, right: 120, bottom: 45, left: 45 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(['No Code Context', 'With Code Context']).range([0, innerW]).paddingInner(0.25).paddingOuter(0.2);
    const x1 = d3.scaleBand().domain(categories).range([0, x0.bandwidth()]).padding(0.04);
    const maxY = d3.max(categories, e => Math.max(matrix[e].withCode, matrix[e].noCode)) || 1;
    const y = d3.scaleLinear().domain([0, maxY]).range([innerH, 0]);

    g.append('g').selectAll('line').data(y.ticks(5)).enter().append('line')
      .attr('x1', 0).attr('x2', innerW).attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#f1f5f9').attr('stroke-width', 0.8);

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '11px').attr('dy', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');

    ['No Code Context', 'With Code Context'].forEach(category => {
      categories.forEach(emotion => {
        const val = category === 'No Code Context' ? matrix[emotion].noCode : matrix[emotion].withCode;
        g.append('rect')
          .attr('class', 'impact-bar')
          .attr('x', x0(category)! + x1(emotion)!)
          .attr('y', innerH).attr('width', x1.bandwidth()).attr('height', 0)
          .attr('rx', 2)
          .attr('fill', EMOTXT_COLORS[emotion])
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            g.selectAll('.impact-bar').transition().duration(250).style('opacity', 0.25);
            d3.select(event.currentTarget as SVGRectElement).raise()
              .transition().duration(250).ease(d3.easeCubicOut)
              .style('opacity', 1)
              .style('filter', `drop-shadow(0 0 6px ${emotxtGlow(emotion)})`);
            setGlobalTooltip({
              emotion: emotion,
              emotionColor: EMOTXT_COLORS[emotion],
              count: val,
              extraFields: { 'Code Block Context': category },
            });
          }).on('mouseout', () => {
            g.selectAll('.impact-bar').transition().duration(250).ease(d3.easeCubicOut)
              .style('opacity', 1).style('filter', 'none');
            setGlobalTooltip(null);
          })
          .transition().duration(800).ease(d3.easeCubicInOut)
          .attr('y', y(val)).attr('height', innerH - y(val));
      });
    });

    const leg = g.append('g').attr('transform', `translate(${innerW + 12}, 5)`);
    categories.forEach((c, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2).attr('fill', EMOTXT_COLORS[c]);
      row.append('text').attr('x', 17).attr('y', 9).attr('font-size', '10px').attr('font-weight', 'bold').attr('fill', '#475569').text(c);
    });

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Code Presence in Prompt / Answer');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -28)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('GPT Turn Count');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart E7: Prompt Length vs Sentiment Polarity (Scatter) ──────────────────
export function EmoTxtRelation({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const devTurns = data.filter(t => t.speaker === 'Developer' && t.word_count > 0);
    const sampled = devTurns.length > 350
      ? devTurns.filter((_, i) => i % Math.ceil(devTurns.length / 350) === 0)
      : devTurns;

    const margin = { top: 20, right: 110, bottom: 50, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const maxX = d3.max(sampled, t => t.word_count) || 200;
    const x = d3.scaleLinear().domain([0, Math.min(maxX, 500)]).range([0, innerW]);
    const y = d3.scaleLinear().domain([-1, 1]).range([innerH, 0]);

    // Grid
    g.append('g').selectAll('line').data(y.ticks(5)).enter().append('line')
      .attr('x1', 0).attr('x2', innerW).attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#f1f5f9').attr('stroke-width', 0.8);
      
    // Zero line
    g.append('line').attr('x1', 0).attr('x2', innerW).attr('y1', y(0)).attr('y2', y(0))
      .attr('stroke', '#cbd5e1').attr('stroke-dasharray', '4,3').attr('stroke-width', 1);

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px').attr('dy', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');

    // Dots
    g.selectAll('.sc-dot').data(sampled).enter().append('circle')
      .attr('class', 'sc-dot')
      .attr('cx', d => x(d.word_count))
      .attr('cy', d => y(d.sentiment_polarity))
      .attr('r', 5.5)
      .attr('fill', d => EMOTXT_COLORS[d.emotion_dev || 'Neutral'])
      .attr('stroke', '#ffffff').attr('stroke-width', 1)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        g.selectAll('.sc-dot').transition().duration(200).style('opacity', 0.15);
        d3.select(event.currentTarget as SVGCircleElement)
          .transition().duration(200).ease(d3.easeCubicOut)
          .attr('r', 10)
          .style('opacity', 1);
        
        setGlobalTooltip({
          emotion: d.emotion_dev || 'Neutral',
          emotionColor: EMOTXT_COLORS[d.emotion_dev || 'Neutral'],
          speaker: 'Developer',
          textSnippet: d.text_preview,
          confidence: d.emotion_confidence,
          extraFields: { 'Words count': d.word_count, 'Sentiment Polarity': d.sentiment_polarity.toFixed(3) },
        });
      }).on('mouseout', function() {
        g.selectAll('.sc-dot').transition().duration(200).style('opacity', 0.8);
        d3.select(this).transition().duration(200).ease(d3.easeCubicOut).attr('r', 5.5);
        setGlobalTooltip(null);
      });

    // Legend
    const leg = g.append('g').attr('transform', `translate(${innerW + 12}, 5)`);
    Object.keys(EMOTXT_COLORS).forEach((c, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 18})`);
      row.append('circle').attr('r', 5.5).attr('cx', 5.5).attr('cy', 5.5).attr('fill', EMOTXT_COLORS[c]);
      row.append('text').attr('x', 16).attr('y', 9).attr('font-size', '10px').attr('font-weight', 'bold').attr('fill', '#475569').text(c);
    });

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Prompt Word Count');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -32)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('VADER Sentiment Compound Score');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}
