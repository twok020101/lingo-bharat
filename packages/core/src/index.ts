// packages/core/src/index.ts — Main entry point for @lingo-bharat/core

// Types
export type {
  Locale,
  CheckId,
  Severity,
  Violation,
  AutoFix,
  CheckResult,
  BharatReport,
  IndicPopulation,
  IndicFontRequirement,
  LocaleRecommendation,
  LingoConfig,
  BucketConfig,
  CheckerContext,
} from './types.js';

// Parsers
export {
  parseLingoConfig,
  resolveTranslationFiles,
  resolveSourceFiles,
  collectSkippedKeys,
  filterIndicLocales,
  buildCheckerContext,
} from './parsers/i18n-config.js';
export {
  loadJsonTranslationFile,
  loadTranslationFiles,
  unflattenObject,
} from './parsers/json-bucket.js';
export {
  extractFontFamiliesFromCSS,
  parseCSSFile,
} from './parsers/css-parser.js';

// Checks
export {
  runAllChecks,
  runChecks,
  checkNumberFormat,
  checkFontStack,
  checkFormalityRegister,
  checkStringOverflow,
  checkCoverage,
} from './checks/index.js';

// Scoring
export {
  calculateBRS,
  scoreCheck,
  getGrade,
  calculateCoverage,
  buildReport,
} from './scoring/engine.js';
export {
  CHECK_WEIGHTS,
  GRADE_THRESHOLDS,
  CHECK_NAMES,
  CHECK_DESCRIPTIONS,
} from './scoring/weights.js';

// Data
export { INDIA_INTERNET_POPULATION, TOTAL_TRACKED_PERCENTAGE, INDIC_LOCALE_CODES } from './data/india-population.js';
export { INDIC_FONT_MAP } from './data/indic-fonts.js';
export { TU_REGISTER_PATTERNS, FORMALITY_REPLACEMENTS, applyFormalityPatternFix } from './data/formality-patterns.js';
export { SCRIPT_WIDTH_MULTIPLIERS, OVERFLOW_THRESHOLD } from './data/width-multipliers.js';
