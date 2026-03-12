// packages/core/src/checks/index.ts — CheckRunner: parallel execution of all 5 checks
import type { CheckResult, CheckerContext } from '../types.js';
import { checkNumberFormat } from './number-format.js';
import { checkFontStack } from './font-stack.js';
import { checkFormalityRegister } from './formality-register.js';
import { checkStringOverflow } from './string-overflow.js';
import { checkCoverage } from './coverage.js';

export type CheckFunction = (ctx: CheckerContext) => Promise<CheckResult>;

/**
 * All available checkers, in order of display.
 */
export const ALL_CHECKERS: CheckFunction[] = [
  checkNumberFormat,
  checkFontStack,
  checkFormalityRegister,
  checkStringOverflow,
  checkCoverage,
];

/**
 * Run all checks in parallel and return results.
 */
export async function runAllChecks(ctx: CheckerContext): Promise<CheckResult[]> {
  const results = await Promise.allSettled(
    ALL_CHECKERS.map(checker => checker(ctx))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    // If a checker failed, return a zero-score result
    const checkIds = [
      'number-format', 'font-stack', 'formality-register',
      'string-overflow', 'coverage',
    ] as const;
    return {
      checkId: checkIds[index],
      name: `Check ${index + 1}`,
      description: `Check failed to run: ${result.reason}`,
      score: 0,
      maxScore: 0,
      violations: [],
      autoFixableCount: 0,
      passed: false,
    } satisfies CheckResult;
  });
}

/**
 * Run specific checks by ID.
 */
export async function runChecks(
  ctx: CheckerContext,
  checkIds?: string[]
): Promise<CheckResult[]> {
  if (!checkIds || checkIds.length === 0) {
    return runAllChecks(ctx);
  }

  const checkerMap: Record<string, CheckFunction> = {
    'number-format': checkNumberFormat,
    'font-stack': checkFontStack,
    'formality-register': checkFormalityRegister,
    'string-overflow': checkStringOverflow,
    'coverage': checkCoverage,
  };

  const selectedCheckers = checkIds
    .map(id => checkerMap[id])
    .filter((c): c is CheckFunction => c !== undefined);

  const results = await Promise.allSettled(
    selectedCheckers.map(checker => checker(ctx))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      checkId: checkIds[index] as CheckResult['checkId'],
      name: `Check failed`,
      description: `Error: ${result.reason}`,
      score: 0,
      maxScore: 0,
      violations: [],
      autoFixableCount: 0,
      passed: false,
    } satisfies CheckResult;
  });
}

// Re-export individual checkers
export { checkNumberFormat } from './number-format.js';
export { checkFontStack } from './font-stack.js';
export { checkFormalityRegister } from './formality-register.js';
export { checkStringOverflow } from './string-overflow.js';
export { checkCoverage } from './coverage.js';
