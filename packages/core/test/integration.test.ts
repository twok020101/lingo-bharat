import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runChecks, buildReport, scoreCheck, calculateBRS, getGrade } from '../src/index.js';
import type { CheckerContext, Violation } from '../src/types.js';
import * as jsonBucket from '../src/parsers/json-bucket.js';

// Mock file system operations
vi.mock('../src/parsers/json-bucket.js', () => ({
  loadTranslationFiles: vi.fn(),
  loadJsonTranslationFile: vi.fn(),
}));

vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue([]),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(''),
}));

function makeFullCtx(): CheckerContext {
  return {
    projectRoot: '/test-project',
    config: {
      version: '1.10',
      locale: { source: 'en', targets: ['hi', 'ta'] },
      buckets: { json: { include: ['locales/[locale].json'] } },
    },
    sourceLocale: 'en',
    targetLocales: ['hi', 'ta'],
    indicLocales: ['hi', 'ta'],
    translationFiles: new Map([
      ['hi', ['/test-project/locales/hi.json']],
      ['ta', ['/test-project/locales/ta.json']],
    ]),
    sourceFiles: ['/test-project/locales/en.json'],
    ignoredKeys: new Set(),
    lockedKeys: new Set(),
    localeValidation: new Map(),
  } as unknown as CheckerContext;
}

describe('Integration: Full Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs all checks and builds a valid report structure', async () => {
    // Mock translations with some violations
    let callCount = 0;
    vi.mocked(jsonBucket.loadTranslationFiles).mockImplementation(async () => {
      callCount++;
      // First call is for source strings in some checks
      if (callCount <= 2) {
        return {
          'welcome': 'Welcome to PayBharat',
          'amount': 'Amount: $1,234,567',
        };
      }
      // Subsequent calls for target locales
      return {
        'welcome': 'नमस्ते! तू यहाँ आ।',
        'amount': '₹1,234,567',
      };
    });

    const ctx = makeFullCtx();
    const results = await runChecks(ctx);

    expect(results.length).toBe(5);

    // Build report
    const report = buildReport(
      results,
      ctx.projectRoot,
      '/test-project/i18n.json',
      ctx.sourceLocale,
      ctx.targetLocales,
      ctx.indicLocales
    );

    // Verify report structure
    expect(report.generatedAt).toBeDefined();
    expect(report.projectRoot).toBe('/test-project');
    expect(report.sourceLocale).toBe('en');
    expect(report.targetLocales).toEqual(['hi', 'ta']);
    expect(report.indicLocales).toEqual(['hi', 'ta']);
    expect(report.bharatReadinessScore).toBeGreaterThanOrEqual(0);
    expect(report.bharatReadinessScore).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
    expect(report.checks.length).toBe(5);
    expect(report.totalViolations).toBeGreaterThanOrEqual(0);
    expect(report.autoFixableViolations).toBeGreaterThanOrEqual(0);

    // Verify check IDs
    const checkIds = report.checks.map(c => c.checkId).sort();
    expect(checkIds).toEqual([
      'coverage',
      'font-stack',
      'formality-register',
      'number-format',
      'string-overflow',
    ]);

    // Coverage summary should exist
    expect(report.coverageSummary).toBeDefined();
    expect(report.coverageSummary.currentCoveragePercent).toBeGreaterThan(0);
  });

  it('scoreCheck deducts correctly for mixed severity violations', () => {
    const violations: Violation[] = [
      { locale: 'hi', message: 'critical', severity: 'critical' },
      { locale: 'hi', message: 'high', severity: 'high' },
      { locale: 'hi', message: 'medium', severity: 'medium' },
    ];
    // 100 - 25 - 10 - 5 = 60
    expect(scoreCheck(violations)).toBe(60);
  });

  it('BRS is correctly weighted across checks', () => {
    const results = [
      { checkId: 'number-format' as const, score: 100, name: '', description: '', maxScore: 25, violations: [], autoFixableCount: 0, passed: true },
      { checkId: 'font-stack' as const, score: 100, name: '', description: '', maxScore: 20, violations: [], autoFixableCount: 0, passed: true },
      { checkId: 'formality-register' as const, score: 100, name: '', description: '', maxScore: 20, violations: [], autoFixableCount: 0, passed: true },
      { checkId: 'string-overflow' as const, score: 100, name: '', description: '', maxScore: 15, violations: [], autoFixableCount: 0, passed: true },
      { checkId: 'coverage' as const, score: 100, name: '', description: '', maxScore: 20, violations: [], autoFixableCount: 0, passed: true },
    ];

    expect(calculateBRS(results)).toBe(100);
    expect(getGrade(100)).toBe('A');
  });

  it('grade F for very low scores', () => {
    expect(getGrade(10)).toBe('F');
    expect(getGrade(0)).toBe('F');
    expect(getGrade(39)).toBe('F');
  });

  it('runs specific checks by ID', async () => {
    vi.mocked(jsonBucket.loadTranslationFiles).mockResolvedValue({});

    const ctx = makeFullCtx();
    const results = await runChecks(ctx, ['coverage']);

    expect(results.length).toBe(1);
    expect(results[0].checkId).toBe('coverage');
  });
});
