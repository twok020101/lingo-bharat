// packages/cli/src/commands/report.ts
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { buildCheckerContext, runChecks, buildReport } from '@lingo-bharat/core';
import { writeJsonReport } from '../renderers/json.js';

interface ReportOptions {
  config: string;
  format: string;
  output: string;
}

export async function reportCommand(options: ReportOptions): Promise<void> {
  const configPath = path.resolve(options.config);
  const projectRoot = path.dirname(configPath);

  const spinner = ora('Generating report...').start();

  try {
    const ctx = await buildCheckerContext(configPath, projectRoot);
    const results = await runChecks(ctx);

    const report = buildReport(
      results,
      projectRoot,
      configPath,
      ctx.sourceLocale,
      ctx.targetLocales,
      ctx.indicLocales,
      ctx.localeValidation
    );

    const outputPath = path.resolve(options.output);

    if (options.format === 'json') {
      await writeJsonReport(report, outputPath);
      spinner.succeed(`Report written to ${chalk.cyan(outputPath)}`);
    } else {
      spinner.fail(`Unsupported format: ${options.format}. Use --format json`);
    }
  } catch (error) {
    spinner.fail('Report generation failed');
    if (error instanceof Error) {
      console.error(`\n${error.message}`);
    }
    process.exit(1);
  }
}
