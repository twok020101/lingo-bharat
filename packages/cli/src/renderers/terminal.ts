// packages/cli/src/renderers/terminal.ts
import chalk from 'chalk';
import Table from 'cli-table3';
import type { BharatReport, CheckResult, Violation, LocaleValidationResult } from '@lingo-bharat/core';

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🔴',
  high: '🟡',
  medium: '🟠',
  info: 'ℹ️',
};

const SEVERITY_COLOR: Record<string, (s: string) => string> = {
  critical: chalk.red,
  high: chalk.yellow,
  medium: chalk.hex('#FFA500'),
  info: chalk.blue,
};

const GRADE_COLORS: Record<string, (s: string) => string> = {
  A: chalk.green,
  B: chalk.greenBright,
  C: chalk.yellow,
  D: chalk.hex('#FFA500'),
  F: chalk.red,
};

/**
 * Render a full terminal report.
 */
export function renderTerminalReport(report: BharatReport, verbose: boolean): void {
  console.log('');
  console.log(chalk.bold('🇮🇳 Lingo Bharat — Indic Localization Readiness Checker'));
  console.log(chalk.gray('━'.repeat(56)));
  console.log('');

  // Project info
  console.log(`${chalk.gray('📋 Project:')}    ${report.projectRoot.split('/').pop()}`);
  console.log(`${chalk.gray('📁 Config:')}     ${report.i18nConfigPath}`);
  console.log(`${chalk.gray('🌍 Locales:')}    ${report.indicLocales.join(', ')} (${report.indicLocales.length} Indic locale${report.indicLocales.length !== 1 ? 's' : ''} detected)`);

  const totalFiles = report.checks.reduce((sum, c) => {
    const fileCount = new Set(c.violations.map(v => v.file).filter(Boolean)).size;
    return sum + fileCount;
  }, 0);
  console.log(`${chalk.gray('📄 Files:')}      ${totalFiles || 'multiple'} translation files scanned`);

  // Display locale validation results (Lingo.dev SDK recognizeLocale)
  if (report.localeValidation && report.localeValidation.length > 0) {
    console.log('');
    console.log(`${chalk.gray('🔍 Locale Validation')} ${chalk.gray('(via Lingo.dev recognizeLocale)')}`);
    for (const v of report.localeValidation) {
      const icon = v.match ? chalk.green('✓') : chalk.red('✗');
      const detected = v.detectedLocale ?? 'unknown';
      console.log(`   ${icon} ${v.declaredLocale}: detected as ${chalk.cyan(detected)}${v.match ? '' : chalk.red(` (mismatch!)`)}`);
    }
  }

  console.log('');
  console.log('Running checks...');
  console.log('');

  // Check summary lines
  for (const check of report.checks) {
    const statusIcon = check.passed ? chalk.green('✓') : chalk.red('✗');
    const severityLabel = check.violations.length > 0
      ? getHighestSeverity(check.violations).toUpperCase()
      : 'PASS';
    const violationCount = check.violations.length > 0
      ? `${check.violations.length} violation${check.violations.length !== 1 ? 's' : ''}`
      : 'clean';

    const dots = '.'.repeat(Math.max(1, 35 - check.name.length));
    console.log(
      `  ${statusIcon} ${check.name} ${chalk.gray(dots)} ${formatSeverityLabel(severityLabel)} — ${violationCount}`
    );
  }

  // BRS Score
  console.log('');
  console.log(chalk.gray('━'.repeat(56)));
  console.log('');

  const gradeColor = GRADE_COLORS[report.grade] ?? chalk.white;
  console.log(
    `🎯 ${chalk.bold('BHARAT READINESS SCORE:')} ${gradeColor(String(report.bharatReadinessScore))} / 100  ← Grade: ${gradeColor(report.grade)}`
  );

  console.log('');
  console.log(chalk.gray('━'.repeat(56)));

  // Detailed breakdown per check
  for (const check of report.checks) {
    if (check.violations.length === 0) continue;

    console.log('');
    const highestSeverity = getHighestSeverity(check.violations);
    const emoji = SEVERITY_EMOJI[highestSeverity] ?? '•';
    const color = SEVERITY_COLOR[highestSeverity] ?? chalk.white;

    console.log(
      `${emoji} ${color(highestSeverity.toUpperCase())}: ${check.name} (${check.score}/${check.maxScore} pts)`
    );

    const displayCount = verbose ? check.violations.length : Math.min(3, check.violations.length);
    const violations = check.violations.slice(0, displayCount);

    for (const v of violations) {
      renderViolation(v);
    }

    if (!verbose && check.violations.length > displayCount) {
      console.log(
        chalk.gray(`   ... ${check.violations.length - displayCount} more violations. Run with --verbose to see all.`)
      );
    }
  }

  // Coverage recommendations
  if (report.coverageSummary.topRecommendations.length > 0) {
    console.log('');
    console.log(chalk.gray('   Top recommendations to increase coverage:'));

    const table = new Table({
      head: ['Locale', 'Language', '+% Users', 'Total After', 'Effort'].map(h => chalk.gray(h)),
      style: { head: [], border: [] },
      chars: {
        'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
        'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
        'right': '│', 'right-mid': '┤', 'middle': '│'
      }
    });

    for (const rec of report.coverageSummary.topRecommendations) {
      const effortColor = rec.effortLevel === 'LOW' ? chalk.green : chalk.yellow;
      table.push([
        rec.locale,
        rec.language,
        `+${rec.percentageGain}%`,
        `${rec.newTotalAfterAdding}%`,
        effortColor(rec.effortLevel),
      ]);
    }

    console.log(table.toString());
  }

  // Footer
  console.log('');
  console.log(chalk.gray('━'.repeat(56)));
  console.log('');

  if (report.autoFixableViolations > 0) {
    console.log(
      `💡 ${chalk.bold('Auto-fixable violations:')} ${report.autoFixableViolations} / ${report.totalViolations}`
    );
    console.log(`   Run ${chalk.cyan('npx lingo-bharat fix')} to remediate automatically`);
  }

  console.log(`📊 Open dashboard: ${chalk.cyan('npx lingo-bharat serve --open')}`);
  console.log('');
}

function renderViolation(v: Violation): void {
  const fileInfo = v.file
    ? chalk.gray(`${v.file}${v.line ? `:${v.line}` : ''}`)
    : '';
  const keyInfo = v.key ? chalk.cyan(v.key) : '';

  console.log(`   ${fileInfo}  ${keyInfo}`);
  console.log(`   ${chalk.gray('│')} ${v.message}`);

  if (v.found) {
    console.log(`   ${chalk.gray('│')} Found:    ${chalk.red(`"${v.found}"`)}`);
  }
  if (v.expected) {
    console.log(`   ${chalk.gray('│')} Expected: ${chalk.green(v.expected)}`);
  }
  if (v.autoFix) {
    console.log(`   ${chalk.gray('│')} ${chalk.green('[Auto-fix available]')}`);
  }
  console.log('');
}

function getHighestSeverity(violations: Violation[]): string {
  const order = ['critical', 'high', 'medium', 'info'];
  for (const severity of order) {
    if (violations.some(v => v.severity === severity)) {
      return severity;
    }
  }
  return 'info';
}

function formatSeverityLabel(severity: string): string {
  const colorFn = SEVERITY_COLOR[severity.toLowerCase()];
  return colorFn ? colorFn(severity) : severity;
}
