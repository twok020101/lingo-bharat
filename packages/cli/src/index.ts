#!/usr/bin/env node
// packages/cli/src/index.ts — CLI entry point
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { Command } from 'commander';
import { checkCommand } from './commands/check.js';
import { fixCommand } from './commands/fix.js';
import { reportCommand } from './commands/report.js';
import { serveCommand } from './commands/serve.js';

// Load .env file (walk up from cwd to find it)
function loadEnvFile(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
  ];

  for (const envPath of candidates) {
    try {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
      break; // Found and loaded
    } catch {
      // File not found, try next candidate
    }
  }
}

loadEnvFile();

const program = new Command();

program
  .name('lingo-bharat')
  .description('🇮🇳 Indic localization readiness checker for Lingo.dev projects')
  .version('1.0.0');

program
  .command('check')
  .description('Run all Indic localization checks')
  .option('-c, --config <path>', 'Path to i18n.json config', './i18n.json')
  .option('--only <checks>', 'Run specific checks only (comma-separated)', '')
  .option('--min-score <score>', 'Minimum BRS score (CI mode)', '')
  .option('--ci', 'CI mode: exit code 1 if below min-score', false)
  .option('--verbose', 'Show all violations (not just top 3)', false)
  .option('--report-path <path>', 'Write JSON report to file path')
  .action(checkCommand);

program
  .command('fix')
  .description('Auto-fix all fixable violations')
  .option('-c, --config <path>', 'Path to i18n.json config', './i18n.json')
  .option('--check <checkId>', 'Fix specific check only', '')
  .option('--dry-run', 'Show what would be fixed without applying', false)
  .action(fixCommand);

program
  .command('report')
  .description('Export report to file')
  .option('-c, --config <path>', 'Path to i18n.json config', './i18n.json')
  .option('-f, --format <format>', 'Output format (json)', 'json')
  .option('-o, --output <path>', 'Output file path', './bharat-report.json')
  .action(reportCommand);

program
  .command('serve')
  .description('Start the Lingo Bharat dashboard')
  .option('-c, --config <path>', 'Path to i18n.json config', './i18n.json')
  .option('-p, --port <port>', 'Dashboard port', '4321')
  .option('--open', 'Open browser automatically', false)
  .action(serveCommand);

program.parse();
