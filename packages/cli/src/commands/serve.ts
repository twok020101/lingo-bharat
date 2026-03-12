// packages/cli/src/commands/serve.ts
import path from 'path';
import { readFile } from 'fs/promises';
import { createServer } from 'http';
import chalk from 'chalk';
import ora from 'ora';
import {
  buildCheckerContext,
  runChecks,
  buildReport as generateBharatReport,
} from '@lingo-bharat/core';

interface ServeOptions {
  config: string;
  port: string;
  open: boolean;
}

export async function serveCommand(options: ServeOptions): Promise<void> {
  const configPath = path.resolve(options.config);
  const projectRoot = path.dirname(configPath);
  const port = parseInt(options.port, 10) || 4321;

  const spinner = ora('Running checks and building report...').start();

  try {
    const ctx = await buildCheckerContext(configPath, projectRoot);
    const results = await runChecks(ctx);
    const report = generateBharatReport(
      results,
      projectRoot,
      configPath,
      ctx.sourceLocale,
      ctx.targetLocales,
      ctx.indicLocales
    );

    spinner.succeed('Report generated');

    // Try to find the built dashboard
    let dashboardHtml: string;
    try {
      // Look for dashboard dist relative to the CLI package
      const dashboardDistPath = path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        '../../dashboard/dist/index.html'
      );
      dashboardHtml = await readFile(dashboardDistPath, 'utf-8');

      // Read the CSS and JS assets
      const distDir = path.dirname(dashboardDistPath);
      const cssMatch = dashboardHtml.match(/href="(\/assets\/[^"]+\.css)"/);
      const jsMatch = dashboardHtml.match(/src="(\/assets\/[^"]+\.js)"/);

      let cssContent = '';
      let jsContent = '';

      if (cssMatch) {
        try {
          cssContent = await readFile(path.join(distDir, cssMatch[1]), 'utf-8');
        } catch { /* ignore */ }
      }
      if (jsMatch) {
        try {
          jsContent = await readFile(path.join(distDir, jsMatch[1]), 'utf-8');
        } catch { /* ignore */ }
      }

      // Inject the report data and inline assets
      dashboardHtml = dashboardHtml
        .replace(
          '</head>',
          `<script>window.__BHARAT_REPORT__=${JSON.stringify(report)}</script></head>`
        );

      // Inline CSS and JS if found
      if (cssContent) {
        dashboardHtml = dashboardHtml.replace(
          /<link[^>]*href="\/assets\/[^"]+\.css"[^>]*>/,
          `<style>${cssContent}</style>`
        );
      }
      if (jsContent) {
        dashboardHtml = dashboardHtml.replace(
          /<script[^>]*src="\/assets\/[^"]+\.js"[^>]*><\/script>/,
          `<script type="module">${jsContent}</script>`
        );
      }
    } catch {
      // Dashboard not built — serve a minimal self-contained HTML page
      dashboardHtml = generateFallbackDashboard(report);
    }

    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(dashboardHtml);
    });

    server.listen(port, () => {
      console.log('');
      console.log(chalk.bold('🇮🇳 Lingo Bharat Dashboard'));
      console.log(`   ${chalk.cyan(`http://localhost:${port}`)}`);
      console.log('');
      console.log(chalk.gray('   Press Ctrl+C to stop'));
      console.log('');

      if (options.open) {
        import('child_process').then(({ exec }) => {
          exec(`open http://localhost:${port}`);
        });
      }
    });
  } catch (error) {
    spinner.fail('Failed to start dashboard');
    if (error instanceof Error) {
      console.error(`\n${error.message}`);
    }
    process.exit(1);
  }
}

interface ReportData {
  bharatReadinessScore: number;
  grade: string;
  totalViolations: number;
  autoFixableViolations: number;
  checks: Array<{
    name: string;
    score: number;
    violations: Array<{
      severity: string;
      message: string;
      key?: string;
      found?: string;
      expected?: string;
    }>;
  }>;
  coverageSummary: {
    currentCoveragePercent: number;
    coveredLocales: string[];
    topRecommendations: Array<{
      language: string;
      percentageGain: number;
      effortLevel: string;
    }>;
  };
}

function generateFallbackDashboard(report: ReportData): string {
  const gradeColors: Record<string, string> = {
    A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444',
  };
  const color = gradeColors[report.grade] ?? '#eab308';

  const checksHtml = report.checks.map(c => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-weight:600">${c.name}</span>
        <span style="color:#94a3b8;font-family:monospace">${c.score}/100</span>
      </div>
      <div style="height:8px;background:#1e293b;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${Math.max(5, c.score)}%;background:${color};border-radius:4px"></div>
      </div>
      <span style="font-size:11px;color:#64748b">${c.violations.length} violation${c.violations.length !== 1 ? 's' : ''}</span>
    </div>
  `).join('');

  const violationsHtml = report.checks.flatMap(c =>
    c.violations.map(v => `
      <div style="padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:6px">
        <span style="font-size:10px;padding:2px 6px;border-radius:8px;background:${
          v.severity === 'critical' ? 'rgba(239,68,68,0.2)' :
          v.severity === 'high' ? 'rgba(234,179,8,0.2)' :
          'rgba(249,115,22,0.2)'
        };color:${
          v.severity === 'critical' ? '#ef4444' :
          v.severity === 'high' ? '#eab308' :
          '#f97316'
        }">${v.severity.toUpperCase()}</span>
        <span style="font-size:11px;color:#64748b;margin-left:6px">${c.name}</span>
        <p style="font-size:13px;color:#e2e8f0;margin:4px 0 0">${v.message}</p>
        ${v.key ? `<p style="font-size:11px;color:#64748b;font-family:monospace">${v.key}</p>` : ''}
      </div>
    `)
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>🇮🇳 Lingo Bharat Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,sans-serif;background:#0a0a1a;color:#f1f5f9;min-height:100vh}
    .container{max-width:900px;margin:0 auto;padding:32px 24px}
    .card{background:rgba(26,26,46,0.8);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:24px;margin-bottom:20px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    @media(max-width:640px){.grid{grid-template-columns:1fr}}
    h1{font-size:20px;font-weight:700} h2{font-size:16px;font-weight:600;margin-bottom:12px}
    .score{font-size:64px;font-weight:800;color:${color}}
    .grade{display:inline-block;padding:4px 12px;border-radius:9999px;font-size:13px;font-weight:700;background:${color}20;color:${color}}
    .stat{text-align:center;padding:16px;background:rgba(26,26,46,0.8);border-radius:12px;border:1px solid rgba(255,255,255,0.06)}
    .stat-num{font-size:28px;font-weight:700} .stat-label{font-size:11px;color:#94a3b8;margin-top:4px}
    header{border-bottom:1px solid rgba(255,255,255,0.05);padding:16px 24px;display:flex;align-items:center;gap:12px}
    footer{text-align:center;padding:32px;color:#475569;font-size:12px}
  </style>
</head>
<body>
  <header><span style="font-size:24px">🇮🇳</span><div><h1>Lingo Bharat</h1><p style="font-size:11px;color:#64748b">Indic Localization Readiness</p></div></header>
  <div class="container">
    <div class="card" style="display:flex;align-items:center;gap:32px;box-shadow:0 0 20px ${color}15">
      <div style="text-align:center"><div class="score">${report.bharatReadinessScore}</div><span class="grade">Grade ${report.grade}</span></div>
      <div style="flex:1">
        <h2>Bharat Readiness Score</h2>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <div class="stat"><div class="stat-num">${report.totalViolations}</div><div class="stat-label">Total Violations</div></div>
          <div class="stat"><div class="stat-num" style="color:#22c55e">${report.autoFixableViolations}</div><div class="stat-label">Auto-fixable</div></div>
        </div>
      </div>
    </div>
    <div class="grid">
      <div class="card"><h2>Check Breakdown</h2>${checksHtml}</div>
      <div class="card">
        <h2>🌍 Coverage: ${report.coverageSummary.currentCoveragePercent}%</h2>
        <div style="height:16px;background:#1e293b;border-radius:8px;overflow:hidden;margin-bottom:12px">
          <div style="height:100%;width:${Math.min(100, (report.coverageSummary.currentCoveragePercent / 83.9) * 100)}%;background:linear-gradient(90deg,#e98c18,#f5ad23);border-radius:8px"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
          ${report.coverageSummary.coveredLocales.map(l => `<span style="padding:4px 10px;background:rgba(34,197,94,0.1);color:#22c55e;border-radius:9999px;font-size:11px;border:1px solid rgba(34,197,94,0.2)">🇮🇳 ${l}</span>`).join('')}
        </div>
        ${report.coverageSummary.topRecommendations.map(r => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:4px">
            <span style="font-size:13px">${r.language} <span style="color:#64748b;font-size:11px">+${r.percentageGain}%</span></span>
            <span style="font-size:10px;padding:2px 8px;border-radius:9999px;${r.effortLevel === 'LOW' ? 'color:#22c55e;background:rgba(34,197,94,0.1)' : 'color:#eab308;background:rgba(234,179,8,0.1)'}">${r.effortLevel}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="card"><h2>Violations</h2>${violationsHtml}</div>
  </div>
  <footer>Built with ❤️ for the Lingo.dev Hackathon • Run <code style="color:#f5ad23">npx lingo-bharat fix</code> to auto-remediate</footer>
</body>
</html>`;
}
