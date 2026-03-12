// packages/core/src/checks/font-stack.ts
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import path from 'path';
import type { CheckResult, CheckerContext, Violation } from '../types.js';
import { INDIC_FONT_MAP } from '../data/indic-fonts.js';
import { CHECK_WEIGHTS, CHECK_NAMES, CHECK_DESCRIPTIONS } from '../scoring/weights.js';
import { scoreCheck } from '../scoring/engine.js';

/**
 * Extract all font-family declarations from a list of files.
 * Searches CSS, JS/TS, Tailwind config, Next config, and HTML files.
 */
async function extractFontDeclarations(
  projectRoot: string,
  filePaths: string[]
): Promise<string[]> {
  const declarations: string[] = [];

  for (const relPath of filePaths) {
    const fullPath = path.join(projectRoot, relPath);
    try {
      const content = await readFile(fullPath, 'utf-8');

      // CSS font-family declarations
      const cssFontMatches = content.match(/font-family\s*:\s*([^;}{]+)/gi);
      if (cssFontMatches) {
        declarations.push(...cssFontMatches);
      }

      // JS/TS fontFamily in style objects
      const jsFontMatches = content.match(/fontFamily\s*:\s*['"`]([^'"`]+)['"`]/gi);
      if (jsFontMatches) {
        declarations.push(...jsFontMatches);
      }

      // Tailwind config theme.fontFamily
      const tailwindFontMatches = content.match(/fontFamily\s*:\s*\{[^}]+\}/gis);
      if (tailwindFontMatches) {
        declarations.push(...tailwindFontMatches);
      }

      // Google Fonts <link> tags
      const googleFontsMatches = content.match(/fonts\.googleapis\.com[^"'`>\s]+/gi);
      if (googleFontsMatches) {
        declarations.push(...googleFontsMatches);
      }

      // @import url for fonts
      const importMatches = content.match(/@import\s+url\(['"]?([^'")\s]+)['"]?\)/gi);
      if (importMatches) {
        declarations.push(...importMatches);
      }

      // next/font imports (e.g., import { Noto_Sans_Devanagari } from 'next/font/google')
      const nextFontMatches = content.match(/from\s+['"]next\/font\/google['"]/gi);
      if (nextFontMatches) {
        // Check what fonts are imported
        const importLineMatches = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]next\/font\/google['"]/gi);
        if (importLineMatches) {
          declarations.push(...importLineMatches);
        }
      }
    } catch {
      // File not readable, skip
    }
  }

  return declarations;
}

/**
 * Generate a CSS fix for a missing Indic font.
 */
function generateFontFix(locale: string, requirement: typeof INDIC_FONT_MAP[string]): string {
  return [
    `/* Lingo Bharat: ${requirement.script} font for locale '${locale}' */`,
    `@import url('${requirement.googleFontsUrl}&display=swap');`,
    '',
    `:root[lang="${locale}"] {`,
    `  --font-primary: 'Inter', '${requirement.requiredFonts[0]}', sans-serif;`,
    `}`,
  ].join('\n');
}

/**
 * Run the Font Stack Check.
 */
export async function checkFontStack(ctx: CheckerContext): Promise<CheckResult> {
  const violations: Violation[] = [];

  // Gather all files to check (maximum scope)
  const cssFiles = await glob('**/*.css', {
    cwd: ctx.projectRoot,
    ignore: ['node_modules/**', 'dist/**', '.next/**'],
  });
  const codeFiles = await glob('**/*.{tsx,jsx,ts,js}', {
    cwd: ctx.projectRoot,
    ignore: ['node_modules/**', 'dist/**', '.next/**'],
  });
  const tailwindConfig = await glob('tailwind.config.{ts,js,mjs}', {
    cwd: ctx.projectRoot,
  });
  const nextConfig = await glob('next.config.{ts,js,mjs}', {
    cwd: ctx.projectRoot,
  });
  const htmlFiles = await glob('**/*.html', {
    cwd: ctx.projectRoot,
    ignore: ['node_modules/**', 'dist/**', '.next/**'],
  });

  const allFiles = [
    ...cssFiles,
    ...codeFiles,
    ...tailwindConfig,
    ...nextConfig,
    ...htmlFiles,
  ];

  const fontDeclarations = await extractFontDeclarations(ctx.projectRoot, allFiles);
  const allDeclarationsJoined = fontDeclarations.join(' ').toLowerCase();

  for (const locale of ctx.indicLocales) {
    const baseLang = locale.split('-')[0];
    const required = INDIC_FONT_MAP[baseLang];
    if (!required) continue;

    // Check if any required font or system fallback is present
    const hasRequiredFont = required.requiredFonts.some(font =>
      allDeclarationsJoined.includes(font.toLowerCase())
    ) || required.systemFallbacks.some(font =>
      allDeclarationsJoined.includes(font.toLowerCase())
    );

    if (!hasRequiredFont) {
      const fix = generateFontFix(baseLang, required);
      violations.push({
        locale,
        message: `No ${required.script} font found in font stack for locale '${locale}'`,
        severity: 'critical',
        expected: `Add one of: ${required.requiredFonts.join(', ')}`,
        autoFix: {
          type: 'css-append',
          patch: fix,
          description: `Append ${required.script} font imports and CSS custom property to globals.css`,
        },
      });
    }
  }

  const score = scoreCheck(violations);
  const checkId = 'font-stack' as const;

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
