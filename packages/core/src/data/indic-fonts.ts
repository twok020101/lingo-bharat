// packages/core/src/data/indic-fonts.ts
import type { IndicFontRequirement } from '../types.js';

export const INDIC_FONT_MAP: Record<string, IndicFontRequirement> = {
  'hi': {
    script: 'Devanagari',
    requiredFonts: ['Noto Sans Devanagari', 'Hind', 'Poppins', 'Mukta'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700',
    systemFallbacks: ['Mangal', 'Kokila', 'Aparajita'],
  },
  'mr': {
    script: 'Devanagari',
    requiredFonts: ['Noto Sans Devanagari', 'Hind', 'Baloo 2'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari',
    systemFallbacks: ['Mangal'],
  },
  'ta': {
    script: 'Tamil',
    requiredFonts: ['Noto Sans Tamil', 'Latha', 'Tamil Sangam MN'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700',
    systemFallbacks: ['Latha', 'Vijaya'],
  },
  'te': {
    script: 'Telugu',
    requiredFonts: ['Noto Sans Telugu', 'Vani', 'Gautami'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;500;700',
    systemFallbacks: ['Vani', 'Gautami'],
  },
  'kn': {
    script: 'Kannada',
    requiredFonts: ['Noto Sans Kannada', 'Tunga', 'Kedage'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;500;700',
    systemFallbacks: ['Tunga'],
  },
  'bn': {
    script: 'Bengali',
    requiredFonts: ['Noto Sans Bengali', 'Hind Siliguri', 'Kalpurush'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700',
    systemFallbacks: ['Vrinda'],
  },
  'gu': {
    script: 'Gujarati',
    requiredFonts: ['Noto Sans Gujarati', 'Shruti'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;500;700',
    systemFallbacks: ['Shruti'],
  },
  'pa': {
    script: 'Gurmukhi',
    requiredFonts: ['Noto Sans Gurmukhi', 'Raavi'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gurmukhi:wght@400;500;700',
    systemFallbacks: ['Raavi'],
  },
  'ml': {
    script: 'Malayalam',
    requiredFonts: ['Noto Sans Malayalam', 'Kartika', 'Rachana'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;500;700',
    systemFallbacks: ['Kartika'],
  },
  'or': {
    script: 'Odia',
    requiredFonts: ['Noto Sans Oriya', 'Kalinga'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Oriya:wght@400;700',
    systemFallbacks: ['Kalinga'],
  },
};
