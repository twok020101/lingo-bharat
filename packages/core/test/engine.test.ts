import { describe, it, expect } from 'vitest';
import { calculateBRS, getGrade, calculateCoverage } from '../src/scoring/engine.js';
import type { CheckResult } from '../src/types.js';

describe('Scoring Engine', () => {
  it('calculates BRS score based on check results', () => {
    const fakeResults: CheckResult[] = [
      {
        checkId: 'number-format',
        name: 'Number Format',
        description: '',
        score: 100, // maxScore 25 -> 25
        maxScore: 25,
        violations: [],
        autoFixableCount: 0,
        passed: true,
      },
      {
        checkId: 'font-stack',
        name: 'Font Stack',
        description: '',
        score: 50, // maxScore 20 -> 10
        maxScore: 20,
        violations: [],
        autoFixableCount: 0,
        passed: false,
      },
      {
        checkId: 'formality-register',
        name: 'Formality',
        description: '',
        score: 20, // maxScore 20 -> 4
        maxScore: 20,
        violations: [],
        autoFixableCount: 0,
        passed: false,
      },
      {
        checkId: 'string-overflow',
        name: 'Overflow',
        description: '',
        score: 0, // maxScore 15 -> 0
        maxScore: 15,
        violations: [],
        autoFixableCount: 0,
        passed: false,
      },
      {
        checkId: 'coverage',
        name: 'Coverage',
        description: '',
        score: 90, // maxScore 20 -> 18
        maxScore: 20,
        violations: [],
        autoFixableCount: 0,
        passed: true,
      }
    ];

    // Total = 25 + 10 + 4 + 0 + 18 = 57
    expect(calculateBRS(fakeResults)).toBe(57);
  });

  describe('getGrade', () => {
    it('returns correct grades based on thresholds', () => {
      // A: 90, B: 75, C: 60, D: 40, F: 0
      expect(getGrade(95)).toBe('A');
      expect(getGrade(85)).toBe('B');
      expect(getGrade(75)).toBe('B'); // 75 falls in B (>= 75)
      expect(getGrade(65)).toBe('C');
      expect(getGrade(55)).toBe('D');
      expect(getGrade(35)).toBe('F');
    });
  });

  describe('calculateCoverage', () => {
    it('calculates correctly for single Hindi locale', () => {
      const result = calculateCoverage(['hi']);
      expect(result.currentCoveragePercent).toBe(38.9); // Hindi is exactly ~38.92% (rounded based on population)
      expect(result.coveredLocales).toEqual(['hi']);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]!.language).toBe('Bengali');
    });

    it('calculates correctly for multiple locales', () => {
      const result = calculateCoverage(['hi', 'bn', 'te']);
      // hi(38.9) + bn(8) + te(7) = 53.9 (rounded)
      expect(result.currentCoveragePercent).toBe(53.9);
      expect(result.coveredLocales).toEqual(['hi', 'bn', 'te']);
    });
  });
});
