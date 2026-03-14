import { describe, it, expect, vi } from 'vitest';
import { checkStringOverflow } from '../src/checks/string-overflow.js';
import type { CheckerContext } from '../src/types.js';
import * as jsonBucket from '../src/parsers/json-bucket.js';

vi.mock('../src/parsers/json-bucket.js', () => ({
  loadTranslationFiles: vi.fn(),
}));

function makeCtx(indicLocales: string[]): CheckerContext {
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
    translationFiles: new Map(
      indicLocales.map(l => [l, [`/test-project/locales/${l}.json`]])
    ),
    sourceFiles: ['/test-project/locales/en.json'],
    ignoredKeys: new Set(),
    lockedKeys: new Set(),
    localeValidation: new Map(),
  } as unknown as CheckerContext;
}

describe('String Overflow Checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects Tamil string exceeding overflow threshold', async () => {
    // Tamil multiplier is 2.4, threshold is 1.2 -> max ratio = 2.88
    // Source: 10 chars, Tamil: 30 chars -> ratio = 3.0 > 2.88
    const sourceStrings = { 'button': 'Click here' }; // 10 chars
    const tamilStrings = { 'button': 'இங்கே கிளிக் செய்யவும் தயவுசெய்து' }; // >30 chars

    let callCount = 0;
    vi.mocked(jsonBucket.loadTranslationFiles).mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? sourceStrings : tamilStrings;
    });

    const ctx = makeCtx(['ta']);
    const result = await checkStringOverflow(ctx);

    expect(result.checkId).toBe('string-overflow');
    expect(result.violations.length).toBe(1);
    expect(result.violations[0].locale).toBe('ta');
    expect(result.violations[0].key).toBe('button');
    expect(result.violations[0].severity).toBe('medium');
  });

  it('passes for Hindi string within threshold', async () => {
    // Hindi multiplier is 1.6, threshold is 1.2 -> max ratio = 1.92
    // Source: 10 chars, Hindi: 15 chars -> ratio = 1.5 < 1.92
    const sourceStrings = { 'label': 'Hello World' }; // 11 chars
    const hindiStrings = { 'label': 'नमस्ते दुनिया' }; // 13 chars

    let callCount = 0;
    vi.mocked(jsonBucket.loadTranslationFiles).mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? sourceStrings : hindiStrings;
    });

    const ctx = makeCtx(['hi']);
    const result = await checkStringOverflow(ctx);

    expect(result.violations.length).toBe(0);
    expect(result.passed).toBe(true);
  });

  it('skips empty or missing keys', async () => {
    const sourceStrings = {
      'key1': 'Hello',
      'key2': '',     // empty source
      'key3': 'World',
    };
    const translatedStrings = {
      'key1': 'नमस्ते',
      // key2 not present in translation
      // key3 not present in translation
    };

    let callCount = 0;
    vi.mocked(jsonBucket.loadTranslationFiles).mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? sourceStrings : translatedStrings;
    });

    const ctx = makeCtx(['hi']);
    const result = await checkStringOverflow(ctx);

    // Should not crash and should not flag missing/empty keys
    expect(result.violations.every(v => v.key !== 'key2')).toBe(true);
    expect(result.violations.every(v => v.key !== 'key3')).toBe(true);
  });

  it('reports correct severity for overflow violations', async () => {
    // Create an extremely long Tamil translation
    const sourceStrings = { 'msg': 'Hi' }; // 2 chars
    const tamilStrings = { 'msg': 'இது மிகவும் நீண்ட தமிழ் மொழிபெயர்ப்பு வாக்கியம்' }; // ~45 chars

    let callCount = 0;
    vi.mocked(jsonBucket.loadTranslationFiles).mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? sourceStrings : tamilStrings;
    });

    const ctx = makeCtx(['ta']);
    const result = await checkStringOverflow(ctx);

    expect(result.violations.length).toBe(1);
    expect(result.violations[0].severity).toBe('medium');
  });

  it('string overflow has zero autoFixableCount', async () => {
    const sourceStrings = { 'btn': 'OK' };
    const tamilStrings = { 'btn': 'சரி என்று உறுதிப்படுத்தவும்' };

    let callCount = 0;
    vi.mocked(jsonBucket.loadTranslationFiles).mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? sourceStrings : tamilStrings;
    });

    const ctx = makeCtx(['ta']);
    const result = await checkStringOverflow(ctx);

    // String overflow is NOT auto-fixable
    expect(result.autoFixableCount).toBe(0);
  });
});
