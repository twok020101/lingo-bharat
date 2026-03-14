import { describe, it, expect, vi } from 'vitest';
import { checkFontStack } from '../src/checks/font-stack.js';
import type { CheckerContext } from '../src/types.js';

// Mock glob and readFile
vi.mock('glob', () => ({
  glob: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

import { glob } from 'glob';
import { readFile } from 'fs/promises';

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
    translationFiles: new Map(),
    sourceFiles: [],
    ignoredKeys: new Set(),
    lockedKeys: new Set(),
    localeValidation: new Map(),
  } as unknown as CheckerContext;
}

describe('Font Stack Checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports violations when no CSS files have Indic fonts', async () => {
    // No CSS files found
    vi.mocked(glob).mockResolvedValue([]);

    const ctx = makeCtx(['hi', 'ta']);
    const result = await checkFontStack(ctx);

    expect(result.checkId).toBe('font-stack');
    // Should have violations for both hi (Devanagari) and ta (Tamil)
    expect(result.violations.length).toBe(2);
    expect(result.passed).toBe(false);

    const locales = result.violations.map(v => v.locale);
    expect(locales).toContain('hi');
    expect(locales).toContain('ta');

    // Each violation should have an autoFix
    for (const v of result.violations) {
      expect(v.autoFix).toBeDefined();
      expect(v.autoFix?.type).toBe('css-append');
      expect(v.severity).toBe('critical');
    }
  });

  it('passes when Noto Sans Devanagari is present for hi locale', async () => {
    // Return a CSS file
    vi.mocked(glob).mockImplementation(async (pattern: string) => {
      if (pattern === '**/*.css') return ['src/styles/globals.css'];
      return [];
    });

    vi.mocked(readFile).mockResolvedValue(
      `body { font-family: 'Inter', 'Noto Sans Devanagari', sans-serif; }`
    );

    const ctx = makeCtx(['hi']);
    const result = await checkFontStack(ctx);

    expect(result.violations.length).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('handles multiple locales — pass for some, fail for others', async () => {
    vi.mocked(glob).mockImplementation(async (pattern: string) => {
      if (pattern === '**/*.css') return ['src/styles/globals.css'];
      return [];
    });

    // Only Devanagari font present, not Tamil
    vi.mocked(readFile).mockResolvedValue(
      `body { font-family: 'Inter', 'Noto Sans Devanagari', sans-serif; }`
    );

    const ctx = makeCtx(['hi', 'ta', 'mr']);
    const result = await checkFontStack(ctx);

    // hi and mr share Devanagari, so they pass. ta (Tamil) should fail.
    expect(result.violations.length).toBe(1);
    expect(result.violations[0].locale).toBe('ta');
  });

  it('generates correct autoFix format with CSS import and custom property', async () => {
    vi.mocked(glob).mockResolvedValue([]);

    const ctx = makeCtx(['hi']);
    const result = await checkFontStack(ctx);

    expect(result.violations.length).toBe(1);
    const fix = result.violations[0].autoFix;
    expect(fix).toBeDefined();
    expect(fix?.type).toBe('css-append');
    expect(typeof fix?.patch).toBe('string');
    // Verify the patch contains Google Fonts import
    expect(fix?.patch as string).toContain('@import url(');
    expect(fix?.patch as string).toContain('Noto+Sans+Devanagari');
  });
});
