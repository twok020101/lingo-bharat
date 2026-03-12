// packages/core/src/checks/string-overflow.ts
import type { CheckResult, CheckerContext, Violation } from '../types.js';
import { loadTranslationFiles } from '../parsers/json-bucket.js';
import { SCRIPT_WIDTH_MULTIPLIERS, OVERFLOW_THRESHOLD } from '../data/width-multipliers.js';
import { CHECK_WEIGHTS, CHECK_NAMES, CHECK_DESCRIPTIONS } from '../scoring/weights.js';
import { scoreCheck } from '../scoring/engine.js';

/**
 * Run the String Overflow Check.
 * Compares translated string length ratios against expected multipliers per script.
 */
export async function checkStringOverflow(ctx: CheckerContext): Promise<CheckResult> {
  const violations: Violation[] = [];

  // Load source (English) strings
  const sourceStrings = await loadTranslationFiles(ctx.sourceFiles);

  for (const locale of ctx.indicLocales) {
    const baseLang = locale.split('-')[0];
    const multiplier = SCRIPT_WIDTH_MULTIPLIERS[baseLang];
    if (!multiplier) continue;

    const files = ctx.translationFiles.get(locale) ?? [];
    const translatedStrings = await loadTranslationFiles(files);

    for (const [key, sourceValue] of Object.entries(sourceStrings)) {
      // Skip ignored/locked keys
      if (ctx.ignoredKeys.has(key) || ctx.lockedKeys.has(key)) continue;

      const translatedValue = translatedStrings[key];
      if (!translatedValue || sourceValue.length === 0) continue;

      // Compare actual length ratio against expected max for this script
      const widthRatio = translatedValue.length / sourceValue.length;
      const expectedMaxRatio = multiplier * OVERFLOW_THRESHOLD;

      if (widthRatio > expectedMaxRatio) {
        const overflowPercent = Math.round((widthRatio - 1) * 100);
        const expectedMaxPercent = Math.round((expectedMaxRatio - 1) * 100);

        violations.push({
          locale,
          key,
          message: `String is ${overflowPercent}% wider than English (expected max: ${expectedMaxPercent}%)`,
          severity: 'medium',
          found: `"${translatedValue}" (${translatedValue.length} chars, ratio: ${widthRatio.toFixed(1)}x)`,
          expected: `Max ratio for ${baseLang}: ${expectedMaxRatio.toFixed(1)}x (${multiplier}x multiplier × ${OVERFLOW_THRESHOLD} threshold)`,
          file: files[0],
        });
      }
    }
  }

  const score = scoreCheck(violations);
  const checkId = 'string-overflow' as const;

  return {
    checkId,
    name: CHECK_NAMES[checkId],
    description: CHECK_DESCRIPTIONS[checkId],
    score,
    maxScore: CHECK_WEIGHTS[checkId],
    violations,
    autoFixableCount: 0, // String overflow requires UI changes, not auto-fixable
    passed: violations.length === 0,
  };
}
