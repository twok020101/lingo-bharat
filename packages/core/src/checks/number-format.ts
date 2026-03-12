// packages/core/src/checks/number-format.ts
import type { CheckResult, CheckerContext, Violation } from '../types.js';
import { loadTranslationFiles } from '../parsers/json-bucket.js';
import { CHECK_WEIGHTS, CHECK_NAMES, CHECK_DESCRIPTIONS } from '../scoring/weights.js';
import { scoreCheck } from '../scoring/engine.js';

// Indian number format (anchored full-string match):
// 1,23,456 or 12,34,567 (groups of 2 from left, last group of 3)
const INDIAN_FORMAT_FULL = /^\d{1,2}(,\d{2})*,\d{3}$/;

// International format (anchored full-string match):
// 1,234 or 1,234,567 (groups of 3)
const INTL_FORMAT_FULL = /^\d{1,3}(,\d{3})+$/;

// Extract numbers with commas from strings (with optional ₹ prefix)
const NUMBER_WITH_COMMAS = /₹?\s*(\d[\d,]+\d)/g;

// Hardcoded Intl.NumberFormat without en-IN
const INTL_NUMBER_FORMAT_PATTERN = /new\s+Intl\.NumberFormat\(\s*['"](?!en-IN)[^'"]*['"]/g;

// toLocaleString without en-IN
const TO_LOCALE_PATTERN = /\.toLocaleString\(\s*['"](?!en-IN)[^'"]*['"]/g;

/**
 * Determine if a number string is a violation (international-only format).
 * Uses full-string anchored matching to prevent substring false positives.
 * Numbers valid in both Indian and international systems (e.g., 10,000) are NOT violations.
 */
function isNumberViolation(numberStr: string): boolean {
  // Strip currency symbol and whitespace
  const cleaned = numberStr.replace(/[₹\s]/g, '');

  // Must contain at least one comma to be relevant
  if (!cleaned.includes(',')) return false;

  // Full-string match: if it matches Indian format, it's fine
  if (INDIAN_FORMAT_FULL.test(cleaned)) return false;

  // Full-string match: if it matches international format, it's a violation
  return INTL_FORMAT_FULL.test(cleaned);
}

/**
 * Scan a translation string for number format violations.
 */
function findNumberViolationsInString(
  value: string,
  key: string,
  locale: string,
  file: string
): Violation[] {
  const violations: Violation[] = [];

  // Extract all numbers with commas from the string
  const numberMatches = [...value.matchAll(NUMBER_WITH_COMMAS)];

  for (const match of numberMatches) {
    const fullMatch = match[0]; // May include ₹ prefix
    const numberPart = match[1]; // Just the number portion

    if (isNumberViolation(numberPart)) {
      const numericValue = parseInt(numberPart.replace(/,/g, ''), 10);
      const hasCurrency = fullMatch.includes('₹');

      violations.push({
        file,
        locale,
        key,
        message: hasCurrency
          ? `International number format used instead of Indian Lakh/Crore system`
          : `Large number uses international formatting (should use Indian Lakh/Crore system)`,
        severity: 'critical',
        found: fullMatch,
        expected: hasCurrency
          ? `₹${formatIndian(numericValue)} (use en-IN locale)`
          : `${formatIndian(numericValue)} (Indian Lakh/Crore grouping)`,
        autoFix: {
          type: 'json-patch',
          patch: `Replace ${fullMatch} with ${hasCurrency ? '₹' : ''}${formatIndian(numericValue)}`,
          description: `Use Intl.NumberFormat('en-IN') for Indian number formatting`,
        },
      });
    }
  }

  return violations;
}

/**
 * Format a number in Indian style (lakh/crore grouping).
 */
function formatIndian(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Scan source code files for Intl.NumberFormat or toLocaleString without en-IN.
 */
async function findCodeViolations(
  projectRoot: string,
  locale: string
): Promise<Violation[]> {
  const { glob } = await import('glob');
  const { readFile } = await import('fs/promises');

  const violations: Violation[] = [];
  const codeFiles = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: projectRoot,
    ignore: ['node_modules/**', 'dist/**', '.next/**'],
  });

  for (const file of codeFiles) {
    const content = await readFile(`${projectRoot}/${file}`, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (INTL_NUMBER_FORMAT_PATTERN.test(line)) {
        INTL_NUMBER_FORMAT_PATTERN.lastIndex = 0; // Reset regex
        violations.push({
          file,
          line: i + 1,
          locale,
          message: `Intl.NumberFormat used without 'en-IN' locale`,
          severity: 'critical',
          found: line.trim(),
          expected: `new Intl.NumberFormat('en-IN', ...)`,
        });
      }

      if (TO_LOCALE_PATTERN.test(line)) {
        TO_LOCALE_PATTERN.lastIndex = 0;
        violations.push({
          file,
          line: i + 1,
          locale,
          message: `.toLocaleString() used without 'en-IN' locale`,
          severity: 'critical',
          found: line.trim(),
          expected: `.toLocaleString('en-IN', ...)`,
        });
      }
    }
  }

  return violations;
}

/**
 * Run the Number Format Check.
 */
export async function checkNumberFormat(ctx: CheckerContext): Promise<CheckResult> {
  const violations: Violation[] = [];

  // Check translation files for hardcoded numbers in international format
  for (const locale of ctx.indicLocales) {
    const files = ctx.translationFiles.get(locale) ?? [];
    const translations = await loadTranslationFiles(files);

    for (const [key, value] of Object.entries(translations)) {
      // Skip ignored/locked keys
      if (ctx.ignoredKeys.has(key) || ctx.lockedKeys.has(key)) continue;

      const keyViolations = findNumberViolationsInString(
        value, key, locale,
        files[0] ?? 'unknown'
      );
      violations.push(...keyViolations);
    }
  }

  // Check source code for hardcoded locale usage
  const codeViolations = await findCodeViolations(
    ctx.projectRoot,
    ctx.indicLocales[0] ?? 'hi'
  );
  violations.push(...codeViolations);

  const score = scoreCheck(violations);
  const checkId = 'number-format' as const;

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
