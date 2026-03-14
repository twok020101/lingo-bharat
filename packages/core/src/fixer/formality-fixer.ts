// packages/core/src/fixer/formality-fixer.ts
import type { Violation } from '../types.js';
import { applyFormalityPatternFix, TU_REGISTER_PATTERNS } from '../data/formality-patterns.js';

/**
 * FormalityFixer uses Lingo.dev SDK's localizeObject() to batch re-translate
 * formality violations in a single API call, rather than calling localizeText()
 * per-string. Falls back to pattern-based replacement if SDK is unavailable.
 */
export class FormalityFixer {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fix a batch of formality violations using localizeObject() for efficient
   * batch re-translation via the Lingo.dev SDK.
   *
   * @param violations - Formality violations to fix
   * @param sourceStrings - Source language key-value map (e.g., English)
   * @param sourceLocale - Source locale code (e.g., 'en')
   * @returns Map of key -> fixed translated value
   */
  async fixBatch(
    violations: Violation[],
    sourceStrings: Record<string, string>,
    sourceLocale: string = 'en'
  ): Promise<Record<string, string>> {
    // Group violations by target locale
    const byLocale = new Map<string, Set<string>>();
    for (const v of violations) {
      if (!v.key) continue;
      const keys = byLocale.get(v.locale) ?? new Set();
      keys.add(v.key);
      byLocale.set(v.locale, keys);
    }

    const results: Record<string, string> = {};

    for (const [targetLocale, keys] of byLocale) {
      // Build the source object with only the keys that need fixing
      const sourceObject: Record<string, string> = {};
      for (const key of keys) {
        const sourceValue = sourceStrings[key];
        if (sourceValue) {
          sourceObject[key] = sourceValue;
        }
      }

      if (Object.keys(sourceObject).length === 0) continue;

      try {
        const { LingoDotDevEngine } = await import('lingo.dev/sdk');
        const engine = new LingoDotDevEngine({ apiKey: this.apiKey });

        // Batch re-translate using localizeObject() — single API call
        const translated = await engine.localizeObject(sourceObject, {
          sourceLocale,
          targetLocale,
        });

        // Post-process: verify aap-register, fall back to pattern fix if needed
        for (const [key, value] of Object.entries(translated)) {
          if (typeof value !== 'string') continue;

          if (this.hasTuRegister(value)) {
            // SDK translation still has tu-register — apply pattern fix
            results[key] = applyFormalityPatternFix(value);
          } else {
            results[key] = value;
          }
        }
      } catch {
        // SDK unavailable — fall back to pattern-based replacement
        for (const key of keys) {
          const violation = violations.find(v => v.key === key && v.locale === targetLocale);
          if (violation?.found) {
            results[key] = applyFormalityPatternFix(violation.found);
          }
        }
      }
    }

    return results;
  }

  /**
   * Check if a string still contains tu-register patterns.
   */
  private hasTuRegister(text: string): boolean {
    for (const pattern of TU_REGISTER_PATTERNS.pronouns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      if (regex.test(text)) return true;
    }
    return false;
  }
}
