import { describe, it, expect, vi } from 'vitest';
import { checkNumberFormat } from '../src/checks/number-format.js';
import type { CheckerContext } from '../src/types.js';
import * as jsonBucket from '../src/parsers/json-bucket.js';

// Mock the file parser
vi.mock('../src/parsers/json-bucket.js', () => ({
  loadTranslationFiles: vi.fn(),
}));

describe('Number Format Checker', () => {
  it('detects international formatting correctly and allows Indian formatting', async () => {
    // Fake context
    const ctx = {
      projectRoot: '/test',
      i18nConfigPath: '/test/i18n.json',
      sourceLocale: 'en',
      targetLocales: ['hi'],
      indicLocales: ['hi'],
      sourceFiles: [],
      targetFiles: [
        {
          locale: 'hi',
          path: '/locales/hi.json',
          type: 'json' as const,
        }
      ],
      translationFiles: new Map([
        ['hi', [{ locale: 'hi', path: '/locales/hi.json', type: 'json' as const }]]
      ]),
      ignoredKeys: new Set<string>(),
      lockedKeys: new Set<string>(),
    } as unknown as CheckerContext;

    // Mock translation data: 
    // - valid_small: 123
    // - valid_thousand: 1,234
    // - valid_indian_lakh: 12,34,567
    // - valid_indian_crore: 1,23,45,678
    // - invalid_intl_million: 1,234,567
    // - invalid_intl_billion: 1,234,567,890
    // - with_text: "Price is ₹1,234,567 fixed" (should catch)
    vi.mocked(jsonBucket.loadTranslationFiles).mockResolvedValue({
      'valid_small': '123',
      'valid_thousand': '1,234',
      'valid_indian_lakh': '12,34,567',
      'valid_indian_crore': '1,23,45,678',
      'invalid_intl_million': '1,234,567',
      'invalid_intl_billion': '1,234,567,890',
      'with_text': 'Price is ₹1,234,567 fixed',
      'valid_with_text': 'Price is ₹12,34,567 fixed',
    });

    const result = await checkNumberFormat(ctx);

    expect(result.score).toBeLessThan(100);
    expect(result.violations.length).toBe(3);
    
    // Check specific violations
    const violationKeys = result.violations.map(v => v.key).sort();
    expect(violationKeys).toEqual([
      'invalid_intl_billion',
      'invalid_intl_million',
      'with_text'
    ]);

    // Check autofix suggestions
    const millionFix = result.violations.find(v => v.key === 'invalid_intl_million');
    expect(millionFix?.autoFix).toBeDefined();
    expect(millionFix?.autoFix?.type).toBe('json-patch');

    // Make sure we didn't flag valid formats
    expect(result.violations.find(v => v.key === 'valid_indian_lakh')).toBeUndefined();
    expect(result.violations.find(v => v.key === 'valid_thousand')).toBeUndefined();
  });
});
