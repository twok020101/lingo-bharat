// packages/core/src/scoring/engine.ts
import type { CheckId, CheckResult, Violation, BharatReport, Locale, LocaleRecommendation, LocaleValidationResult } from '../types.js';
import { CHECK_WEIGHTS, GRADE_THRESHOLDS } from './weights.js';
import { INDIA_INTERNET_POPULATION, TOTAL_TRACKED_PERCENTAGE } from '../data/india-population.js';

/**
 * Calculate the Bharat Readiness Score from individual check results.
 * Each check contributes (check.score / 100) * weight points.
 */
export function calculateBRS(checkResults: CheckResult[]): number {
  return Math.round(
    checkResults.reduce((total, check) => {
      const weight = CHECK_WEIGHTS[check.checkId];
      const contribution = (check.score / 100) * weight;
      return total + contribution;
    }, 0)
  );
}

/**
 * Score a single check based on its violations.
 * Deducts points per violation severity.
 */
export function scoreCheck(violations: Violation[]): number {
  if (violations.length === 0) return 100;

  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const highCount = violations.filter(v => v.severity === 'high').length;
  const mediumCount = violations.filter(v => v.severity === 'medium').length;

  const deduction =
    (criticalCount * 25) +
    (highCount * 10) +
    (mediumCount * 5);

  return Math.max(0, 100 - deduction);
}

/**
 * Get letter grade from BRS score.
 */
export function getGrade(brs: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (brs >= GRADE_THRESHOLDS.A) return 'A';
  if (brs >= GRADE_THRESHOLDS.B) return 'B';
  if (brs >= GRADE_THRESHOLDS.C) return 'C';
  if (brs >= GRADE_THRESHOLDS.D) return 'D';
  return 'F';
}

/**
 * Calculate coverage data for the coverage check.
 */
export function calculateCoverage(targetLocales: Locale[]): {
  currentCoveragePercent: number;
  coveredLocales: Locale[];
  score: number;
  recommendations: LocaleRecommendation[];
} {
  const indicLocales = targetLocales.filter(l => {
    const base = l.split('-')[0];
    return INDIA_INTERNET_POPULATION[base] !== undefined;
  });

  const covered = indicLocales.reduce((sum, locale) => {
    const base = locale.split('-')[0];
    return sum + (INDIA_INTERNET_POPULATION[base]?.percentage ?? 0);
  }, 0);

  const uncovered = Object.entries(INDIA_INTERNET_POPULATION)
    .filter(([locale]) => {
      return !indicLocales.some(l => l.split('-')[0] === locale);
    })
    .sort(([, a], [, b]) => b.percentage - a.percentage);

  const recommendations: LocaleRecommendation[] = uncovered.slice(0, 3).map(([locale, data]) => ({
    locale,
    language: data.language,
    percentageGain: data.percentage,
    newTotalAfterAdding: Math.round((covered + data.percentage) * 10) / 10,
    effortLevel: data.script === 'Devanagari' ? 'LOW' as const : 'MEDIUM' as const,
  }));

  const score = TOTAL_TRACKED_PERCENTAGE > 0
    ? Math.round((covered / TOTAL_TRACKED_PERCENTAGE) * 100)
    : 0;

  return {
    currentCoveragePercent: Math.round(covered * 10) / 10,
    coveredLocales: indicLocales,
    score,
    recommendations,
  };
}

/**
 * Build a complete BharatReport from check results and context.
 */
export function buildReport(
  checkResults: CheckResult[],
  projectRoot: string,
  configPath: string,
  sourceLocale: Locale,
  targetLocales: Locale[],
  indicLocales: Locale[],
  localeValidation?: Map<Locale, LocaleValidationResult>
): BharatReport {
  const brs = calculateBRS(checkResults);
  const grade = getGrade(brs);
  const coverageData = calculateCoverage(targetLocales);

  const totalViolations = checkResults.reduce(
    (sum, c) => sum + c.violations.length, 0
  );
  const autoFixableViolations = checkResults.reduce(
    (sum, c) => sum + c.autoFixableCount, 0
  );

  return {
    generatedAt: new Date().toISOString(),
    projectRoot,
    i18nConfigPath: configPath,
    sourceLocale,
    targetLocales,
    indicLocales,
    bharatReadinessScore: brs,
    grade,
    checks: checkResults,
    coverageSummary: {
      currentCoveragePercent: coverageData.currentCoveragePercent,
      coveredLocales: coverageData.coveredLocales,
      topRecommendations: coverageData.recommendations,
    },
    localeValidation: localeValidation ? Array.from(localeValidation.values()) : undefined,
    totalViolations,
    autoFixableViolations,
  };
}
