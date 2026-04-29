'use client';

import { EMOTION_ORDER, EMOTION_COLORS_DEV, EMOTION_COLORS_GPT } from '@/lib/colors';
import type { EmotionType } from '@/lib/types';

export default function PatternDefs() {
  return (
    <defs>
      {/* GPT stripe patterns for each emotion */}
      {EMOTION_ORDER.map((emotion) => {
        const baseColor = EMOTION_COLORS_GPT[emotion];
        const devColor = EMOTION_COLORS_DEV[emotion];
        const patternId = `pattern-gpt-${emotion.toLowerCase()}`;
        return (
          <pattern
            key={patternId}
            id={patternId}
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" fill={baseColor} />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke={devColor}
              strokeWidth="1.5"
              opacity="0.3"
            />
          </pattern>
        );
      })}
      {/* Generic GPT stripe pattern */}
      <pattern
        id="pattern-gpt"
        patternUnits="userSpaceOnUse"
        width="6"
        height="6"
        patternTransform="rotate(45)"
      >
        <rect width="6" height="6" fill="#9ca3af" />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="6"
          stroke="#4b5563"
          strokeWidth="1.5"
          opacity="0.3"
        />
      </pattern>
    </defs>
  );
}
