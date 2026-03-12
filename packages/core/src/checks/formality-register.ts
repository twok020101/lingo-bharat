// packages/core/src/checks/formality-register.ts
import type { CheckResult, CheckerContext, Violation } from '../types.js';
import { loadTranslationFiles } from '../parsers/json-bucket.js';
import { TU_REGISTER_PATTERNS, FORMALITY_REPLACEMENTS } from '../data/formality-patterns.js';
import { CHECK_WEIGHTS, CHECK_NAMES, CHECK_DESCRIPTIONS } from '../scoring/weights.js';
import { scoreCheck } from '../scoring/engine.js';

/**
 * Scan a Hindi string for tu-register violations.
 */
function findFormalityViolations(
  value: string,
  key: string,
  locale: string,
  file: string
): Violation[] {
  const violations: Violation[] = [];

  // Check pronouns
  for (const pattern of TU_REGISTER_PATTERNS.pronouns) {
    // Create fresh regex to reset lastIndex
    const regex = new RegExp(pattern.source, pattern.flags);
    const match = regex.exec(value);
    if (match) {
      const found = match[0];
      const replacement = FORMALITY_REPLACEMENTS[found];
      violations.push({
        file,
        locale,
        key,
        message: `Tu-register pronoun "${found}" detected — inappropriate for app UI`,
        severity: 'high',
        found,
        expected: replacement
          ? `Use aap-register: "${replacement}"`
          : `Use formal/aap-register equivalent`,
        autoFix: {
          type: 'lingo-sdk-retranslate',
          patch: { key, sourceKey: key, targetLocale: locale },
          description: `Re-translate with formal register via Lingo.dev SDK, or replace "${found}" with "${replacement ?? 'आप-form'}"`,
        },
      });
    }
  }

  // Check verb forms (tu-conjugation)
  for (const pattern of TU_REGISTER_PATTERNS.verbForms) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const match = regex.exec(value);
    if (match) {
      violations.push({
        file,
        locale,
        key,
        message: `Tu-register verb form "${match[0]}" detected — use formal conjugation`,
        severity: 'medium',
        found: match[0],
        expected: `Use aap-register verb form (e.g., करें instead of कर)`,
        autoFix: {
          type: 'lingo-sdk-retranslate',
          patch: { key, sourceKey: key, targetLocale: locale },
          description: `Re-translate with formal register via Lingo.dev SDK`,
        },
      });
    }
  }

  return violations;
}

/**
 * Run the Formality Register Check.
 * Only applies to Hindi (hi, hi-IN) translations.
 */
export async function checkFormalityRegister(ctx: CheckerContext): Promise<CheckResult> {
  const violations: Violation[] = [];

  // Filter to Hindi locales only
  const hindiLocales = ctx.indicLocales.filter(l => {
    const base = l.split('-')[0];
    return base === 'hi';
  });

  for (const locale of hindiLocales) {
    const files = ctx.translationFiles.get(locale) ?? [];
    const translations = await loadTranslationFiles(files);

    for (const [key, value] of Object.entries(translations)) {
      // Skip ignored/locked keys
      if (ctx.ignoredKeys.has(key) || ctx.lockedKeys.has(key)) continue;

      const keyViolations = findFormalityViolations(
        value, key, locale,
        files[0] ?? 'unknown'
      );
      violations.push(...keyViolations);
    }
  }

  const score = scoreCheck(violations);
  const checkId = 'formality-register' as const;

  return {
    checkId,
    name: CHECK_NAMES[checkId],
    description: CHECK_DESCRIPTIONS[checkId],
    score,
    maxScore: CHECK_WEIGHTS[checkId],
    violations,
    autoFixableCount: violations.filter(v => v.autoFix).length,
    passed: violations.length === 0,
  };
}
