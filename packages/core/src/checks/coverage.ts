// packages/core/src/checks/coverage.ts
import type { CheckResult, CheckerContext, Violation } from '../types.js';
import { INDIA_INTERNET_POPULATION, TOTAL_TRACKED_PERCENTAGE } from '../data/india-population.js';
import { calculateCoverage } from '../scoring/engine.js';
import { CHECK_WEIGHTS, CHECK_NAMES, CHECK_DESCRIPTIONS } from '../scoring/weights.js';

/**
 * Run the Coverage Check.
 * Maps target locales to Indian internet user population percentages.
 */
export async function checkCoverage(ctx: CheckerContext): Promise<CheckResult> {
  const violations: Violation[] = [];
  const coverage = calculateCoverage(ctx.targetLocales);

  // Determine severity based on coverage gap
  let severity: 'info' | 'medium' | 'high';
  if (coverage.currentCoveragePercent >= 70) {
    severity = 'info';
  } else if (coverage.currentCoveragePercent >= 40) {
    severity = 'medium';
  } else {
    severity = 'high';
  }

  // Add a single coverage violation with recommendations
  if (coverage.currentCoveragePercent < TOTAL_TRACKED_PERCENTAGE) {
    const coveredLanguages = coverage.coveredLocales
      .map(l => {
        const base = l.split('-')[0];
        return INDIA_INTERNET_POPULATION[base]?.language ?? l;
      })
      .join(', ');

    const recommendationText = coverage.recommendations
      .map(r => `+${r.language} (${r.locale}): +${r.percentageGain}% → ${r.newTotalAfterAdding}% total`)
      .join('; ');

    violations.push({
      locale: 'all',
      message: `Current coverage: ${coverage.currentCoveragePercent}% of Indian internet users (${coveredLanguages || 'none'})`,
      severity,
      found: `${coverage.coveredLocales.length} Indic locale(s): ${coverage.currentCoveragePercent}% coverage`,
      expected: `Add more locales for wider reach. Top recommendations: ${recommendationText}`,
      autoFix: coverage.recommendations.length > 0
        ? {
          type: 'i18n-config-patch',
          patch: {
            _comment: `Lingo Bharat: Add locales to increase coverage to ${coverage.recommendations[coverage.recommendations.length - 1]?.newTotalAfterAdding ?? coverage.currentCoveragePercent}%`,
            locale: {
              targets: [
                ...ctx.targetLocales,
                ...coverage.recommendations.map(r => r.locale),
              ],
            },
          },
          description: `Add ${coverage.recommendations.map(r => r.language).join(', ')} to i18n.json targets`,
        }
        : undefined,
    });
  }

  const checkId = 'coverage' as const;

  return {
    checkId,
    name: CHECK_NAMES[checkId],
    description: CHECK_DESCRIPTIONS[checkId],
    score: coverage.score,
    maxScore: CHECK_WEIGHTS[checkId],
    violations,
    autoFixableCount: violations.filter(v => v.autoFix).length,
    passed: coverage.currentCoveragePercent >= 70,
  };
}
