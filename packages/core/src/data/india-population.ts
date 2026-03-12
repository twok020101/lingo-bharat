// packages/core/src/data/india-population.ts
import type { IndicPopulation } from '../types.js';

// Source: TRAI 2024 + IAMAI 2024 + Census linguistic data
export const INDIA_INTERNET_POPULATION: Record<string, IndicPopulation> = {
  'hi': {
    language: 'Hindi',
    users_millions: 350,
    percentage: 38.9,
    script: 'Devanagari',
    states: ['UP', 'MP', 'Bihar', 'Rajasthan', 'Haryana', 'Delhi'],
  },
  'bn': {
    language: 'Bengali',
    users_millions: 72,
    percentage: 8.0,
    script: 'Bengali',
    states: ['West Bengal', 'Tripura'],
  },
  'te': {
    language: 'Telugu',
    users_millions: 63,
    percentage: 7.0,
    script: 'Telugu',
    states: ['Andhra Pradesh', 'Telangana'],
  },
  'mr': {
    language: 'Marathi',
    users_millions: 63,
    percentage: 7.0,
    script: 'Devanagari',
    states: ['Maharashtra'],
  },
  'ta': {
    language: 'Tamil',
    users_millions: 54,
    percentage: 6.0,
    script: 'Tamil',
    states: ['Tamil Nadu', 'Puducherry'],
  },
  'gu': {
    language: 'Gujarati',
    users_millions: 45,
    percentage: 5.0,
    script: 'Gujarati',
    states: ['Gujarat'],
  },
  'kn': {
    language: 'Kannada',
    users_millions: 36,
    percentage: 4.0,
    script: 'Kannada',
    states: ['Karnataka'],
  },
  'ml': {
    language: 'Malayalam',
    users_millions: 31,
    percentage: 3.5,
    script: 'Malayalam',
    states: ['Kerala'],
  },
  'pa': {
    language: 'Punjabi',
    users_millions: 27,
    percentage: 3.0,
    script: 'Gurmukhi',
    states: ['Punjab', 'Haryana'],
  },
  'or': {
    language: 'Odia',
    users_millions: 13,
    percentage: 1.5,
    script: 'Odia',
    states: ['Odisha'],
  },
};

// Total of all tracked percentages
export const TOTAL_TRACKED_PERCENTAGE = Object.values(INDIA_INTERNET_POPULATION)
  .reduce((sum, data) => sum + data.percentage, 0);

// Set of all known Indic locale codes
export const INDIC_LOCALE_CODES = new Set(Object.keys(INDIA_INTERNET_POPULATION));
