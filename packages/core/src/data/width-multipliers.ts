// packages/core/src/data/width-multipliers.ts

/**
 * Empirically derived visual width multipliers for rendered text.
 * Represents the approximate pixel width of an Indic script character
 * relative to an English character at the same font-size.
 *
 * Used by the string-overflow checker to estimate if translated strings
 * will overflow fixed-width containers.
 */
export const SCRIPT_WIDTH_MULTIPLIERS: Record<string, number> = {
  'hi': 1.6,   // Devanagari — matras add vertical space but moderate horizontal
  'mr': 1.6,   // Same as Hindi (same script)
  'ta': 2.4,   // Tamil — complex ligatures, longer words
  'te': 2.6,   // Telugu — very long words, heavy letterforms
  'kn': 2.2,   // Kannada — similar to Telugu
  'bn': 1.7,   // Bengali — moderate
  'gu': 1.8,   // Gujarati — moderate
  'pa': 1.7,   // Punjabi — moderate
  'ml': 2.8,   // Malayalam — the longest — highly complex ligatures
  'or': 1.8,   // Odia — moderate
};

// Allow translated strings to be up to 20% beyond the expected multiplied length
export const OVERFLOW_THRESHOLD = 1.2;
