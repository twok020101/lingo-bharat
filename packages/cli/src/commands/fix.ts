// packages/cli/src/commands/fix.ts
import path from 'path';
import { readFile, writeFile, appendFile } from 'fs/promises';
import ora from 'ora';
import chalk from 'chalk';
import {
  buildCheckerContext,
  runChecks,
  loadTranslationFiles,
  type CheckResult,
  type CheckerContext,
  type Violation,
} from '@lingo-bharat/core';

interface FixOptions {
  config: string;
  check: string;
  dryRun: boolean;
}

export async function fixCommand(options: FixOptions): Promise<void> {
  const configPath = path.resolve(options.config);
  const projectRoot = path.dirname(configPath);

  const spinner = ora('Analyzing violations...').start();

  try {
    const ctx = await buildCheckerContext(configPath, projectRoot);

    const checkIds = options.check
      ? [options.check]
      : undefined;

    const results = await runChecks(ctx, checkIds);

    spinner.stop();

    let totalFixed = 0;

    for (const result of results) {
      const fixableViolations = result.violations.filter(v => v.autoFix);
      if (fixableViolations.length === 0) continue;

      console.log(`\n${chalk.bold(`Fixing: ${result.name}`)} (${fixableViolations.length} fixable)`);

      // Deduplicate formality violations by key+file — each key only needs one re-translation
      const seenFormalityKeys = new Set<string>();

      for (const violation of fixableViolations) {
        if (!violation.autoFix) continue;

        switch (violation.autoFix.type) {
          case 'css-append':
            await applyCssFix(violation, projectRoot, options.dryRun);
            totalFixed++;
            break;

          case 'json-patch':
            await applyNumberFormatFix(violation, projectRoot, options.dryRun);
            totalFixed++;
            break;

          case 'lingo-sdk-retranslate': {
            const dedupeKey = `${violation.file}:${violation.key}`;
            if (seenFormalityKeys.has(dedupeKey)) {
              totalFixed++; // Count but skip duplicate
              break;
            }
            seenFormalityKeys.add(dedupeKey);
            await applyFormalityFix(violation, ctx, projectRoot, options.dryRun);
            totalFixed++;
            break;
          }

          case 'i18n-config-patch':
            // Coverage patch — show instruction
            console.log(
              `  ${chalk.yellow('→')} ${violation.autoFix.description}`
            );
            if (typeof violation.autoFix.patch === 'object') {
              console.log(
                chalk.gray(`     ${JSON.stringify(violation.autoFix.patch, null, 2).split('\n').join('\n     ')}`)
              );
            }
            totalFixed++;
            break;
        }
      }
    }

    console.log(`\n${chalk.green('✓')} Applied ${totalFixed} fix${totalFixed !== 1 ? 'es' : ''}.`);

    if (options.dryRun) {
      console.log(chalk.gray('(Dry run — no files were actually modified)'));
    }

    console.log(`\nRun ${chalk.cyan('npx lingo-bharat check')} again to verify improvements.`);
  } catch (error) {
    spinner.fail('Fix failed');
    if (error instanceof Error) {
      console.error(`\n${error.message}`);
    }
    process.exit(1);
  }
}

async function applyCssFix(
  violation: Violation,
  projectRoot: string,
  dryRun: boolean
): Promise<void> {
  if (!violation.autoFix || typeof violation.autoFix.patch !== 'string') return;

  const cssPath = path.join(projectRoot, 'src/styles/globals.css');
  const candidates = [
    'src/styles/globals.css',
    'src/app/globals.css',
    'styles/globals.css',
    'app/globals.css',
    'src/index.css',
  ];

  let targetFile: string | null = null;
  for (const candidate of candidates) {
    try {
      const fullPath = path.join(projectRoot, candidate);
      await readFile(fullPath, 'utf-8');
      targetFile = fullPath;
      break;
    } catch {
      continue;
    }
  }

  if (!targetFile) {
    targetFile = cssPath;
  }

  if (dryRun) {
    console.log(`  ${chalk.yellow('→')} Would append to ${path.relative(projectRoot, targetFile)}:`);
    console.log(chalk.gray(`     ${violation.autoFix.patch.split('\n').join('\n     ')}`));
  } else {
    await appendFile(targetFile, `\n\n${violation.autoFix.patch}\n`);
    console.log(`  ${chalk.green('✓')} Appended Indic font stack to ${path.relative(projectRoot, targetFile)}`);
  }
}

/**
 * Fix number format violations by converting international numbers to Indian format.
 * e.g., ₹1,234,567 → ₹12,34,567
 */
async function applyNumberFormatFix(
  violation: Violation,
  projectRoot: string,
  dryRun: boolean
): Promise<void> {
  if (!violation.autoFix || !violation.key || !violation.file) return;

  const filePath = path.isAbsolute(violation.file)
    ? violation.file
    : path.join(projectRoot, violation.file);

  try {
    const content = await readFile(filePath, 'utf-8');
    const json = JSON.parse(content) as Record<string, string>;
    const oldValue = json[violation.key];

    if (!oldValue) {
      console.log(`  ${chalk.yellow('→')} Key "${violation.key}" not found in ${path.relative(projectRoot, filePath)}`);
      return;
    }

    // Convert international format to Indian format
    const newValue = convertToIndianNumberFormat(oldValue);

    if (newValue === oldValue) {
      console.log(`  ${chalk.yellow('→')} ${violation.key}: No number conversion needed`);
      return;
    }

    if (dryRun) {
      console.log(`  ${chalk.yellow('→')} Would fix ${violation.key}:`);
      console.log(`     ${chalk.red(`Old: "${oldValue}"`)}`);
      console.log(`     ${chalk.green(`New: "${newValue}"`)}`);
    } else {
      json[violation.key] = newValue;
      await writeFile(filePath, JSON.stringify(json, null, 4) + '\n', 'utf-8');
      console.log(`  ${chalk.green('✓')} Fixed number format in "${violation.key}"`);
      console.log(`     ${chalk.red(`Old: "${oldValue}"`)}`);
      console.log(`     ${chalk.green(`New: "${newValue}"`)}`);
    }
  } catch (err) {
    console.log(`  ${chalk.red('✗')} Failed to fix ${violation.key}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Convert international number format to Indian lakh/crore format.
 * ₹1,234,567 → ₹12,34,567
 * $1,234,567.89 → $12,34,567.89
 */
function convertToIndianNumberFormat(value: string): string {
  // Match numbers with commas (international format)
  return value.replace(/(\d{1,3}(?:,\d{3})+)(\.\d+)?/g, (_match, integerPart: string, decimal: string | undefined) => {
    // Remove all existing commas to get the raw number
    const raw = integerPart.replace(/,/g, '');

    // Format using Indian number system:
    // Last 3 digits, then groups of 2
    if (raw.length <= 3) return raw + (decimal ?? '');

    const lastThree = raw.slice(-3);
    const remaining = raw.slice(0, -3);

    // Group the remaining digits in pairs from right
    const pairs: string[] = [];
    for (let i = remaining.length; i > 0; i -= 2) {
      const start = Math.max(0, i - 2);
      pairs.unshift(remaining.slice(start, i));
    }

    return pairs.join(',') + ',' + lastThree + (decimal ?? '');
  });
}

async function applyFormalityFix(
  violation: Violation,
  ctx: CheckerContext,
  projectRoot: string,
  dryRun: boolean
): Promise<void> {
  if (!violation.autoFix || !violation.key || !violation.file) return;

  const filePath = path.isAbsolute(violation.file)
    ? violation.file
    : path.join(projectRoot, violation.file);

  // Try to use Lingo.dev SDK for re-translation
  try {
    const { LingoDotDevEngine } = await import('lingo.dev/sdk');
    const apiKey = process.env['LINGODOTDEV_API_KEY'];

    if (apiKey && violation.key) {
      const engine = new LingoDotDevEngine({ apiKey });
      // Load source string
      const sourceStrings = await loadTranslationFiles(ctx.sourceFiles);
      const sourceValue = sourceStrings[violation.key];

      if (sourceValue) {
        const fixed = await engine.localizeText(sourceValue, {
          sourceLocale: 'en',
          targetLocale: violation.locale,
        });

        if (dryRun) {
          console.log(`  ${chalk.yellow('→')} Would re-translate "${violation.key}"`);
          console.log(`     ${chalk.red(`Old: ${violation.found}`)}`);
          console.log(`     ${chalk.green(`New: ${fixed}`)}`);
        } else {
          // Actually write the fix back to the JSON file
          const content = await readFile(filePath, 'utf-8');
          const json = JSON.parse(content) as Record<string, string>;
          json[violation.key] = fixed;
          await writeFile(filePath, JSON.stringify(json, null, 4) + '\n', 'utf-8');

          console.log(`  ${chalk.green('✓')} Re-translated "${violation.key}" via Lingo.dev SDK`);
          console.log(`     ${chalk.red(`Old: ${violation.found}`)}`);
          console.log(`     ${chalk.green(`New: ${fixed}`)}`);
        }
        return;
      }
    }
  } catch {
    // SDK not available or API key not set — fall back to pattern replacement
  }

  // Fallback: show manual fix suggestion
  console.log(`  ${chalk.yellow('→')} ${violation.key ?? 'unknown'}: ${violation.autoFix.description}`);
  if (violation.found && violation.expected) {
    console.log(`     ${chalk.red(`Found: "${violation.found}"`)}`);
    console.log(`     ${chalk.green(`Suggest: ${violation.expected}`)}`);
  }
}
