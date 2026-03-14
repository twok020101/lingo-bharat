import { describe, it, expect } from 'vitest';
import { checkCoverage } from '../src/checks/coverage.js';
import { calculateCoverage } from '../src/scoring/engine.js';
import type { CheckerContext } from '../src/types.js';

function makeCtx(targetLocales: string[]): CheckerContext {
  const indicLocales = targetLocales.filter(l => {
    const base = l.split('-')[0];
    return ['hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'or'].includes(base);
  });

  return {
    projectRoot: '/test-project',
    config: {
      version: '1.10',
      locale: { source: 'en', targets: targetLocales },
      buckets: { json: { include: ['locales/[locale].json'] } },
    },
    sourceLocale: 'en',
    targetLocales,
    indicLocales,
    translationFiles: new Map(),
    sourceFiles: [],
    ignoredKeys: new Set(),
    lockedKeys: new Set(),
    localeValidation: new Map(),
  } as unknown as CheckerContext;
}

describe('Coverage Checker', () => {
  it('returns correct coverage for Hindi-only (~38.9%)', async () => {
    const ctx = makeCtx(['en', 'hi']);
    const result = await checkCoverage(ctx);

    expect(result.checkId).toBe('coverage');
    // Hindi covers ~38.9% -> below 70%, so should have a violation
    expect(result.violations.length).toBe(1);
    expect(result.passed).toBe(false);
  });

  it('accumulates coverage for multiple locales', async () => {
    const ctx = makeCtx(['en', 'hi', 'bn', 'te', 'mr', 'ta']);
    const result = await checkCoverage(ctx);

    // hi(38.9) + bn(8) + te(7) + mr(7) + ta(6) = 66.9
    const coverage = calculateCoverage(ctx.targetLocales);
    expect(coverage.currentCoveragePercent).toBe(66.9);
  });

  it('produces sorted recommendations by percentage gain', async () => {
    const coverage = calculateCoverage(['hi']);

    // After Hindi, Bengali should be top recommendation (8%)
    expect(coverage.recommendations.length).toBeGreaterThan(0);
    expect(coverage.recommendations[0].language).toBe('Bengali');
    expect(coverage.recommendations[0].percentageGain).toBe(8);
  });

  it('marks Devanagari-shared locales as LOW effort', async () => {
    const coverage = calculateCoverage(['hi']);

    // Marathi shares Devanagari script with Hindi -> LOW effort
    const marathiRec = coverage.recommendations.find(r => r.locale === 'mr');
    if (marathiRec) {
      expect(marathiRec.effortLevel).toBe('LOW');
    }
  });

  it('marks non-Devanagari locales as MEDIUM effort', async () => {
    const coverage = calculateCoverage(['hi']);

    // Bengali uses Bengali script (not Devanagari) -> MEDIUM effort
    const bengaliRec = coverage.recommendations.find(r => r.locale === 'bn');
    if (bengaliRec) {
      expect(bengaliRec.effortLevel).toBe('MEDIUM');
    }
  });

  it('passes when coverage >= 70%', async () => {
    // hi(38.9) + bn(8) + te(7) + mr(7) + ta(6) + gu(5) = 71.9
    const ctx = makeCtx(['en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu']);
    const result = await checkCoverage(ctx);

    expect(result.passed).toBe(true);
  });

  it('provides autoFix with i18n-config-patch for coverage expansion', async () => {
    const ctx = makeCtx(['en', 'hi']);
    const result = await checkCoverage(ctx);

    expect(result.violations.length).toBe(1);
    const fix = result.violations[0].autoFix;
    expect(fix).toBeDefined();
    expect(fix?.type).toBe('i18n-config-patch');
  });
});
