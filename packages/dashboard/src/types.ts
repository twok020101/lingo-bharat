// Types matching @lingo-bharat/core BharatReport — duplicated here to avoid
// importing core into the Vite bundle (dashboard receives report as JSON).

export type Severity = 'critical' | 'high' | 'medium' | 'info';

export interface Violation {
  file?: string;
  line?: number;
  locale: string;
  key?: string;
  message: string;
  severity: Severity;
  found?: string;
  expected?: string;
  autoFix?: {
    type: string;
    patch: string | Record<string, unknown>;
    description: string;
  };
}

export interface CheckResult {
  checkId: string;
  name: string;
  description: string;
  score: number;
  maxScore: number;
  violations: Violation[];
  autoFixableCount: number;
  passed: boolean;
}

export interface LocaleRecommendation {
  locale: string;
  language: string;
  percentageGain: number;
  newTotalAfterAdding: number;
  effortLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface BharatReport {
  generatedAt: string;
  projectRoot: string;
  i18nConfigPath: string;
  sourceLocale: string;
  targetLocales: string[];
  indicLocales: string[];
  bharatReadinessScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: CheckResult[];
  coverageSummary: {
    currentCoveragePercent: number;
    coveredLocales: string[];
    topRecommendations: LocaleRecommendation[];
  };
  totalViolations: number;
  autoFixableViolations: number;
}
