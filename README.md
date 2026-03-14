# Lingo Bharat: Indic Localization Readiness Checker

[![npm version](https://img.shields.io/npm/v/lingo-bharat)](https://www.npmjs.com/package/lingo-bharat)
[![CI](https://github.com/AjayPoshak/Lingo_Bharat/actions/workflows/lingo-bharat.yml/badge.svg)](https://github.com/AjayPoshak/Lingo_Bharat/actions)
[![Built for Lingo.dev Hackathon](https://img.shields.io/badge/Built%20for-Lingo.dev%20Hackathon%202026-6C5CE7?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)](https://lingo.dev)

![BRS Dashboard Demo](./packages/dashboard/public/preview.png)

Lingo Bharat is an open-source, CLI-first code quality and localization auditing tool, specifically built to measure and improve the readiness of web applications for Indian users.

Built on top of the [Lingo.dev](https://lingo.dev) i18n specification and SDK, Lingo Bharat acts as an "ESLint for Indic Localization," analyzing source code, CSS, and translation files to produce a **Bharat Readiness Score (BRS)**.

### Why Lingo Bharat?

India has over 22 official languages and a massively fragmented internet user base. Standard internationalization (i18n) checks often miss India-specific nuances. Lingo Bharat automatically catches:
1. **Number Formatting**: Detects international formatting (1,234,567) instead of the Indian Lakh/Crore system (12,34,567).
2. **Font Stacks**: Scans CSS to ensure appropriate Indic font fallbacks (e.g., `Noto Sans Devanagari`, `Tiro Tamil`) are present, preventing "tofu" boxes.
3. **Formality Register (Tu vs Aap)**: Uses the **Lingo.dev SDK** to semantically scan Hindi translations for overly informal or disrespectful pronouns ("tu", "tera") and auto-corrects them to formal equivalents ("aap", "aapka").
4. **String Overflow**: Identifies UI containers where Indic scripts (which take up significantly more vertical and horizontal space) are likely to overflow or get clipped.
5. **Coverage Reach**: Calculates the actual percentage of the Indian internet population your app can reach based on your currently supported locales.

---

## Lingo.dev Integration Showcase

Lingo Bharat deeply integrates with the Lingo.dev ecosystem at every layer:

### 1. `i18n.json` Config Compatibility
Lingo Bharat reads the same `i18n.json` configuration file used by the Lingo.dev CLI. Zero additional configuration needed — if you use Lingo.dev, you already have everything Lingo Bharat needs.

### 2. `recognizeLocale()` - Locale Validation
During the analysis pipeline, Lingo Bharat uses `LingoDotDevEngine.recognizeLocale()` to validate that translation files actually contain the declared language. This catches stale or misplaced translation files before they ship.

```
Locale Validation (via Lingo.dev recognizeLocale)
   hi: detected as hi
   ta: detected as ta
```

### 3. `localizeObject()` - Batch Re-translation
The `FormalityFixer` class uses `LingoDotDevEngine.localizeObject()` to batch re-translate all formality violations in a single API call. This is dramatically more efficient than per-string translation and ensures consistent register across the entire file.

```typescript
// Single API call re-translates all violating keys at once
const fixer = new FormalityFixer(apiKey);
const fixed = await fixer.fixBatch(violations, sourceStrings, 'en');
```

### 4. `localizeText()` - Individual String Re-translation
For targeted single-string fixes, Lingo Bharat falls back to `localizeText()` to re-translate individual strings with formal register.

### 5. CI/CD Action - Quality Gate After Lingo.dev Translate
The GitHub Action runs **after** `lingodotdev/lingo.dev@main` translate step, creating a quality gate pipeline:

```
Lingo.dev Translate (sync translations)
         |
         v
Lingo Bharat Check (quality gate)
         |
         v
PR Comment with BRS Score Table
```

---

## Architecture

```
                    i18n.json (Lingo.dev config)
                         |
                         v
              +---------------------+
              | buildCheckerContext  |
              |  - parseLingoConfig |
              |  - resolveFiles     |
              |  - recognizeLocale  | <-- Lingo.dev SDK
              +---------------------+
                         |
            +------------+------------+
            |            |            |
            v            v            v
      +---------+  +-----------+  +----------+
      | Number  |  |   Font    |  | Formality|
      | Format  |  |   Stack   |  | Register |
      +---------+  +-----------+  +----------+
            |            |            |
            v            v            v
      +---------+  +-----------+
      | String  |  | Coverage  |
      | Overflow|  |  Reach    |
      +---------+  +-----------+
            |            |
            +-----+------+
                  |
                  v
         +----------------+
         | Scoring Engine |
         |  BRS 0-100     |
         |  Grade A-F     |
         +----------------+
                  |
         +-------+-------+
         |       |       |
         v       v       v
      Terminal  JSON   Dashboard
      Report   Report   (React)
```

### Before & After: BRS Score Transformation

```
BEFORE (raw demo app):          AFTER (lingo-bharat fix):
BRS: 24/100 (Grade F)          BRS: 85/100 (Grade B)

  Number Format .... CRITICAL    Number Format .... PASS
  Font Stack ....... CRITICAL    Font Stack ....... PASS
  Formality ........ HIGH        Formality ........ PASS
  String Overflow .. MEDIUM      String Overflow .. PASS
  Coverage ......... HIGH        Coverage ......... MEDIUM
```

---

## Workspace Structure

This repo is a Turborepo monorepo using `pnpm`:
- `packages/core`: The analysis engine, checks, parsers, scoring math, fixers, and data constants.
- `packages/cli`: The Commander.js CLI interface (`check`, `fix`, `serve`, `report`).
- `packages/dashboard`: Optional Vite/React dashboard for a beautiful web UI of the readiness report.
- `apps/demo`: A sample Next.js application ("PayBharat") intentionally riddled with Indic localization bugs for testing the CLI.

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
pnpm build
```

### 2. Run the Demo
The demo app is specifically designed to showcase Lingo Bharat. It represents a fictional fintech app ("PayBharat").

Start the demo application:
```bash
cd apps/demo
pnpm dev
# Opens http://localhost:3000
```

Notice the issues:
- The portfolio value is `$1,234,567` (International format).
- Switch to **Hindi**: The welcome message says "Hey! You come here." - extremely informal/disrespectful using *tu* register.
- The text might look slightly off or use default system fonts instead of beautiful Indic web fonts.

### 3. Run Lingo Bharat Checks
In the `apps/demo` directory, run the checker against the `i18n.json` config.

```bash
# Set your Lingo.dev API key so the 'Formality Register' check can use the SDK
export LINGODOTDEV_API_KEY="lingo_sk_..."

# Run the CLI
npx lingo-bharat check --config ./i18n.json
```

You'll get a terminal report showing a failing **BRS Score (Grade C)** with around 12 violations found.

### 4. Auto-Fix Violations
Lingo Bharat doesn't just complain; it fixes your problems.

```bash
npx lingo-bharat fix --config ./i18n.json
```
The CLI will automatically:
- Append required Indic web fonts to `src/styles/globals.css`.
- Patch the JSON file to use the Indian Lakh/Crore format (`12,34,567`).
- Connect to the **Lingo.dev SDK** to batch re-translate the inappropriate Hindi strings via `localizeObject()`.

### 5. Generate a JSON Report
```bash
npx lingo-bharat check --config ./i18n.json --report-path ./bharat-report.json
```

### 6. Check the Dashboard
If you prefer a beautiful, shareable web UI instead of the terminal:

```bash
npx lingo-bharat serve --config ./i18n.json --open
```

### 7. Reset Demo State
Want to test it again?
```bash
pnpm --filter @lingo-bharat/demo reset
```

## Continuous Integration

Lingo Bharat comes with a pre-configured GitHub Action (`.github/workflows/lingo-bharat.yml`) that implements a full CI pipeline:

1. **Lingo.dev Translate** - Syncs translations using `lingodotdev/lingo.dev@main`
2. **Lingo Bharat Check** - Runs quality gate with `--min-score 70 --ci`
3. **PR Comment** - Posts a BRS score table on every pull request
4. **Artifact Upload** - Attaches the JSON report for download

```yaml
# Example: Add to your workflow
- name: Lingo.dev Translate
  uses: lingodotdev/lingo.dev@main
  with:
    api-key: ${{ secrets.LINGODOTDEV_API_KEY }}

- name: Lingo Bharat Quality Gate
  run: npx lingo-bharat check --config ./i18n.json --min-score 70 --ci --report-path ./bharat-report.json
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `lingo-bharat check` | Run all Indic localization checks |
| `lingo-bharat fix` | Auto-fix all fixable violations |
| `lingo-bharat serve` | Start the dashboard web UI |
| `lingo-bharat report` | Export report to JSON file |

### Check Options

| Flag | Description |
|------|-------------|
| `-c, --config <path>` | Path to i18n.json config (default: `./i18n.json`) |
| `--only <checks>` | Run specific checks only (comma-separated) |
| `--min-score <score>` | Minimum BRS score threshold |
| `--ci` | CI mode: exit code 1 if below min-score |
| `--verbose` | Show all violations (not just top 3) |
| `--report-path <path>` | Write JSON report to file path |

## Built With
- [Lingo.dev SDK](https://lingo.dev) (`recognizeLocale`, `localizeObject`, `localizeText`)
- TypeScript & Node.js
- Commander.js
- React & Vite (Dashboard)
- Tailwind CSS
- Vitest (32 tests across 7 test files)

Built for the Lingo.dev Hackathon 2026.
