// packages/cli/src/commands/check.ts
import path from 'path';
import ora from 'ora';
import { buildCheckerContext, runChecks, buildReport } from '@lingo-bharat/core';
import { renderTerminalReport } from '../renderers/terminal.js';
import { writeJsonReport } from '../renderers/json.js';

interface CheckOptions {
  config: string;
  only: string;
  minScore: string;
  ci: boolean;
  verbose: boolean;
  reportPath?: string;
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  const configPath = path.resolve(options.config);
  const projectRoot = path.dirname(configPath);

  const spinner = ora('Loading Lingo Bharat configuration...').start();

  try {
    // Build context
    const ctx = await buildCheckerContext(configPath, projectRoot);

    if (ctx.indicLocales.length === 0) {
      spinner.warn('No Indic locales found in i18n.json targets. Nothing to check.');
      process.exit(0);
    }

    spinner.text = 'Running Indic localization checks...';

    // Determine which checks to run
    const checkIds = options.only
      ? options.only.split(',').map(s => s.trim())
      : undefined;

    // Run checks
    const results = await runChecks(ctx, checkIds);

    spinner.stop();

    // Build report
    const report = buildReport(
      results,
      projectRoot,
      configPath,
      ctx.sourceLocale,
      ctx.targetLocales,
      ctx.indicLocales,
      ctx.localeValidation
    );

    // Render terminal output
    renderTerminalReport(report, options.verbose);

    // Write JSON report if --report-path specified
    if (options.reportPath) {
      const reportPath = path.resolve(options.reportPath);
      await writeJsonReport(report, reportPath);
      console.log(`\n📄 Report written to ${reportPath}`);
    }

    // CI mode: exit with error code if below threshold
    if (options.ci) {
      const minScore = parseInt(options.minScore || '70', 10);
      if (report.bharatReadinessScore < minScore) {
        console.error(
          `\n❌ BRS ${report.bharatReadinessScore} is below minimum threshold of ${minScore}`
        );
        process.exit(1);
      }
    }
  } catch (error) {
    spinner.fail('Check failed');
    if (error instanceof Error) {
      console.error(`\n${error.message}`);
    }
    process.exit(1);
  }
}
