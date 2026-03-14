// packages/core/src/types.ts — All shared types for Lingo Bharat

export type Locale = string; // BCP-47: 'hi', 'hi-IN', 'ta', 'te', etc.

export type CheckId =
  | 'number-format'
  | 'font-stack'
  | 'string-overflow'
  | 'formality-register'
  | 'coverage';

export type Severity = 'critical' | 'high' | 'medium' | 'info';

export interface Violation {
  file?: string;
  line?: number;
  locale: Locale;
  key?: string;
  message: string;
  severity: Severity;
  found?: string;
  expected?: string;
  autoFix?: AutoFix;
}

export interface AutoFix {
  type: 'css-append' | 'json-patch' | 'i18n-config-patch' | 'lingo-sdk-retranslate';
  patch: string | Record<string, unknown>;
  description: string;
}

export interface CheckResult {
  checkId: CheckId;
  name: string;
  description: string;
  score: number;           // 0-100 for this check
  maxScore: number;        // Weight allocated to this check
  violations: Violation[];
  autoFixableCount: number;
  passed: boolean;
}

export interface BharatReport {
  generatedAt: string;         // ISO timestamp
  projectRoot: string;
  i18nConfigPath: string;
  sourceLocale: Locale;
  targetLocales: Locale[];
  indicLocales: Locale[];      // subset of targetLocales that are Indic
  bharatReadinessScore: number; // 0-100 overall BRS
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: CheckResult[];
  coverageSummary: {
    currentCoveragePercent: number;
    coveredLocales: Locale[];
    topRecommendations: LocaleRecommendation[];
  };
  localeValidation?: LocaleValidationResult[];
  totalViolations: number;
  autoFixableViolations: number;
}

export interface IndicPopulation {
  language: string;
  users_millions: number;
  percentage: number;
  script: string;
  states: string[];
}

export interface IndicFontRequirement {
  script: string;
  requiredFonts: string[];
  googleFontsUrl: string;
  systemFallbacks: string[];
}

export interface LocaleRecommendation {
  locale: Locale;
  language: string;
  percentageGain: number;
  newTotalAfterAdding: number;
  effortLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface LingoConfig {
  $schema?: string;
  version: string;
  locale: {
    source: string;
    targets: string[];
  };
  buckets: Record<string, BucketConfig>;
  provider?: {
    id: string;
    model?: string;
    prompt?: string;
  };
}

export interface BucketConfig {
  include: string[];
  exclude?: string[];
  lockedKeys?: string[];
  ignoredKeys?: string[];
  preservedKeys?: string[];
}

export interface LocaleValidationResult {
  declaredLocale: Locale;
  detectedLocale: string | null;
  confidence: number;
  match: boolean;
  sampleText: string;
}

export interface CheckerContext {
  projectRoot: string;
  config: LingoConfig;
  sourceLocale: Locale;
  targetLocales: Locale[];
  indicLocales: Locale[];
  translationFiles: Map<Locale, string[]>;
  sourceFiles: string[];
  ignoredKeys: Set<string>;
  lockedKeys: Set<string>;
  localeValidation: Map<Locale, LocaleValidationResult>;
}
