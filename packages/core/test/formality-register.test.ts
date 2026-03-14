import { describe, it, expect, vi } from 'vitest';
import { checkFormalityRegister } from '../src/checks/formality-register.js';
import type { CheckerContext } from '../src/types.js';
import * as jsonBucket from '../src/parsers/json-bucket.js';

vi.mock('../src/parsers/json-bucket.js', () => ({
  loadTranslationFiles: vi.fn(),
}));

function makeCtx(
  indicLocales: string[],
  translationFiles?: Map<string, string[]>
): CheckerContext {
  return {
    projectRoot: '/test-project',
    config: {
      version: '1.10',
      locale: { source: 'en', targets: indicLocales },
      buckets: { json: { include: ['locales/[locale].json'] } },
    },
    sourceLocale: 'en',
    targetLocales: indicLocales,
    indicLocales,
    translationFiles: translationFiles ?? new Map(
      indicLocales.map(l => [l, [`/test-project/locales/${l}.json`]])
    ),
    sourceFiles: ['/test-project/locales/en.json'],
    ignoredKeys: new Set(),
    lockedKeys: new Set(),
    localeValidation: new Map(),
  } as unknown as CheckerContext;
}

describe('Formality Register Checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects tu-register pronouns in Hindi translations', async () => {
    vi.mocked(jsonBucket.loadTranslationFiles).mockResolvedValue({
      'welcome': 'नमस्ते! तू यहाँ आ।',
      'greeting': 'तेरा स्वागत है',
    });

    const ctx = makeCtx(['hi']);
    const result = await checkFormalityRegister(ctx);

    expect(result.checkId).toBe('formality-register');
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
    expect(result.passed).toBe(false);

    // Should detect 'तू' and 'तेरा'
    const foundPatterns = result.violations.map(v => v.found);
    expect(foundPatterns).toContain('तू');
    expect(foundPatterns).toContain('तेरा');
  });

  it('passes when aap-register is used', async () => {
    vi.mocked(jsonBucket.loadTranslationFiles).mockResolvedValue({
      'welcome': 'नमस्ते! आप कैसे हैं?',
      'greeting': 'आपका स्वागत है',
      'instruction': 'कृपया अपना नाम दर्ज करें',
    });

    const ctx = makeCtx(['hi']);
    const result = await checkFormalityRegister(ctx);

    expect(result.violations.length).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('detects tu-register verb forms', async () => {
    vi.mocked(jsonBucket.loadTranslationFiles).mockResolvedValue({
      'action': 'यहाँ कर',
    });

    const ctx = makeCtx(['hi']);
    const result = await checkFormalityRegister(ctx);

    const verbViolations = result.violations.filter(v =>
      v.message.includes('verb form')
    );
    expect(verbViolations.length).toBeGreaterThan(0);
  });

  it('skips non-Hindi locales', async () => {
    vi.mocked(jsonBucket.loadTranslationFiles).mockResolvedValue({
      'greeting': 'Some Tamil text',
    });

    // Only Tamil locale — no Hindi to check
    const ctx = makeCtx(['ta']);
    const result = await checkFormalityRegister(ctx);

    // Should not check formality for non-Hindi locales
    expect(result.violations.length).toBe(0);
    expect(result.passed).toBe(true);
  });

  it('provides autoFix with lingo-sdk-retranslate type', async () => {
    vi.mocked(jsonBucket.loadTranslationFiles).mockResolvedValue({
      'rude': 'तू जा',
    });

    const ctx = makeCtx(['hi']);
    const result = await checkFormalityRegister(ctx);

    expect(result.violations.length).toBeGreaterThan(0);
    for (const v of result.violations) {
      expect(v.autoFix).toBeDefined();
      expect(v.autoFix?.type).toBe('lingo-sdk-retranslate');
    }
    expect(result.autoFixableCount).toBeGreaterThan(0);
  });

  it('respects ignoredKeys', async () => {
    vi.mocked(jsonBucket.loadTranslationFiles).mockResolvedValue({
      'ignored_key': 'तू यहाँ आ',
      'normal_key': 'तेरा काम',
    });

    const ctx = makeCtx(['hi']);
    ctx.ignoredKeys = new Set(['ignored_key']);
    const result = await checkFormalityRegister(ctx);

    // Only normal_key should be flagged
    const flaggedKeys = result.violations.map(v => v.key);
    expect(flaggedKeys).not.toContain('ignored_key');
    expect(flaggedKeys).toContain('normal_key');
  });
});
