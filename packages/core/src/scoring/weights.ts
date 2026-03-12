// packages/core/src/scoring/weights.ts
import type { CheckId } from '../types.js';

export const CHECK_WEIGHTS: Record<CheckId, number> = {
  'number-format':      25,  // Critical for fintech/e-commerce
  'font-stack':         20,  // Critical for rendering
  'formality-register': 20,  // High trust impact
  'string-overflow':    15,  // High usability impact
  'coverage':           20,  // Strategic reach
};
// Total: 100

export const GRADE_THRESHOLDS = {
  A: 90,
  B: 75,
  C: 60,
  D: 40,
  F: 0,
} as const;

export const CHECK_NAMES: Record<CheckId, string> = {
  'number-format':      'Number Format',
  'font-stack':         'Font Stack',
  'formality-register': 'Formality Register',
  'string-overflow':    'String Overflow',
  'coverage':           'Coverage',
};

export const CHECK_DESCRIPTIONS: Record<CheckId, string> = {
  'number-format':      'Detects international number formatting instead of Indian Lakh/Crore system',
  'font-stack':         'Checks for Indic script font fallbacks in CSS',
  'formality-register': 'Scans Hindi translations for inappropriate tu-register pronouns',
  'string-overflow':    'Identifies translated strings that may overflow fixed-width UI containers',
  'coverage':           'Measures percentage of Indian internet users reached by supported locales',
};
