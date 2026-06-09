'use client';

import { useState, useMemo } from 'react';
import type { ConversationGroup } from '@/lib/types';
import { EMOTION_COLORS_DEV, EMOTION_COLORS_GPT } from '@/lib/colors';

interface ConversationListProps {
  groups: ConversationGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery?: string;
}

export default function ConversationList({ groups, selectedId, onSelect, searchQuery = '' }: ConversationListProps) {
  const [sortField, setSortField] = useState<'title' | 'author' | 'turns' | 'devEmotion' | 'gptEmotion'>('turns');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filteredGroups = useMemo(() => {
    let result = groups;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        g =>
          g.sharing_title.toLowerCase().includes(q) ||
          g.source_author.toLowerCase().includes(q) ||
          g.repo_name.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.sharing_title.localeCompare(b.sharing_title);
          break;
        case 'author':
          cmp = a.source_author.localeCompare(b.source_author);
          break;
        case 'turns':
          cmp = a.num_turns - b.num_turns;
          break;
        case 'devEmotion': {
          const aDev = a.turns.filter(t => t.speaker === 'Developer' && t.emotion_dev);
          const bDev = b.turns.filter(t => t.speaker === 'Developer' && t.emotion_dev);
          const aEmotion = aDev.length > 0 ? aDev[0].emotion_dev || '' : '';
          const bEmotion = bDev.length > 0 ? bDev[0].emotion_dev || '' : '';
          cmp = aEmotion.localeCompare(bEmotion);
          break;
        }
        case 'gptEmotion': {
          const aGpt = a.turns.filter(t => t.speaker === 'GPT' && t.emotion_dev);
          const bGpt = b.turns.filter(t => t.speaker === 'GPT' && t.emotion_dev);
          const aEmotion = aGpt.length > 0 ? aGpt[0].emotion_dev || '' : '';
          const bEmotion = bGpt.length > 0 ? bGpt[0].emotion_dev || '' : '';
          cmp = aEmotion.localeCompare(bEmotion);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [groups, searchQuery, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const getDevEmotion = (g: ConversationGroup) => {
    const devTurns = g.turns.filter(t => t.speaker === 'Developer' && t.emotion_dev && t.emotion_dev !== 'Neutral');
    if (devTurns.length === 0) return 'Neutral';
    // Most common emotion
    const counts: Record<string, number> = {};
    devTurns.forEach(t => { counts[t.emotion_dev!] = (counts[t.emotion_dev!] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  const getGptEmotion = (g: ConversationGroup) => {
    const gptTurns = g.turns.filter(t => t.speaker === 'GPT' && t.emotion_dev && t.emotion_dev !== 'Neutral');
    if (gptTurns.length === 0) return 'Neutral';
    const counts: Record<string, number> = {};
    gptTurns.forEach(t => { counts[t.emotion_dev!] = (counts[t.emotion_dev!] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  const getAvgConfidence = (g: ConversationGroup) => {
    const confs = g.turns.map(t => t.emotion_confidence);
    return confs.length > 0 ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02),0_10px_20px_rgba(0,0,0,0.015)]">
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
            <tr className="border-b border-slate-200">
              {[
                { field: 'title' as const, label: 'Title' },
                { field: 'author' as const, label: 'Author' },
                { field: 'turns' as const, label: '#Turns' },
                { field: 'devEmotion' as const, label: 'Dev Emotion' },
                { field: 'gptEmotion' as const, label: 'GPT Emotion' },
              ].map(({ field, label }) => (
                <th
                  key={field}
                  className="text-left px-3 py-2.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:text-slate-800 transition-colors"
                  onClick={() => toggleSort(field)}
                >
                  {label}
                  {sortField === field && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                </th>
              ))}
              <th className="text-left px-3 py-2.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.slice(0, 50).map((g) => {
              const devEmotion = getDevEmotion(g);
              const gptEmotion = getGptEmotion(g);
              const avgConf = getAvgConfidence(g);
              const isSelected = selectedId === g.conversation_id;

              return (
                <tr
                  key={g.conversation_id}
                  className={`border-b border-slate-100 cursor-pointer transition-all duration-200 ${
                    isSelected ? 'bg-indigo-50/60 border-l-2 border-l-indigo-500' : 'hover:bg-slate-50/50'
                  }`}
                  onClick={() => onSelect(g.conversation_id)}
                >
                  <td className="px-3 py-2 text-slate-800 font-semibold max-w-[180px] truncate">{g.sharing_title}</td>
                  <td className="px-3 py-2 text-slate-500 font-medium">{g.source_author}</td>
                  <td className="px-3 py-2 text-slate-500 font-medium">{g.num_turns}</td>
                  <td className="px-3 py-2">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${EMOTION_COLORS_DEV[devEmotion as keyof typeof EMOTION_COLORS_DEV] || '#6b7280'}15`,
                        color: EMOTION_COLORS_DEV[devEmotion as keyof typeof EMOTION_COLORS_DEV] || '#6b7280',
                      }}
                    >
                      {devEmotion}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${EMOTION_COLORS_GPT[gptEmotion as keyof typeof EMOTION_COLORS_GPT] || '#6b7280'}15`,
                        color: EMOTION_COLORS_GPT[gptEmotion as keyof typeof EMOTION_COLORS_GPT] || '#6b7280',
                      }}
                    >
                      {gptEmotion}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500 font-semibold text-xs">{(avgConf * 100).toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredGroups.length > 50 && (
        <div className="p-2 text-center text-xs text-slate-400 font-medium border-t border-slate-100 bg-slate-50/30">
          Showing 50 of {filteredGroups.length} conversations
        </div>
      )}
    </div>
  );
}
