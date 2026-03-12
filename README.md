# 🇮🇳 Lingo Bharat: Indic Localization Readiness Checker

![BRS Dashboard Demo](./packages/dashboard/public/preview.png)

Lingo Bharat is an open-source, CLI-first code quality and localization auditing tool, specifically built to measure and improve the readiness of web applications for Indian users. 

Built on top of the [Lingo.dev](https://lingo.dev) i18n specification, Lingo Bharat acts as an "ESLint for Indic Localization," analyzing source code, CSS, and translation files to produce a **Bharat Readiness Score (BRS)**. 

### Why Lingo Bharat?

India has over 22 official languages and a massively fragmented internet user base. Standard internationalization (i18n) checks often miss India-specific nuances. Lingo Bharat automatically catches:
1. **Number Formatting**: Detects international formatting (1,234,567) instead of the Indian Lakh/Crore system (12,34,567).
2. **Font Stacks**: Scans CSS to ensure appropriate Indic font fallbacks (e.g., `Noto Sans Devanagari`, `Tiro Tamil`) are present, preventing "tofu" boxes.
3. **Formality Register (Tu vs Aap)**: Uses the **Lingo.dev SDK** to semantically scan Hindi translations for overly informal or disrespectful pronouns ("तू", "तेरा") and auto-corrects them to formal equivalents ("आप", "आपका").
4. **String Overflow**: Identifies UI containers where Indic scripts (which take up significantly more vertical and horizontal space) are likely to overflow or get clipped.
5. **Coverage Reach**: Calculates the actual percentage of the Indian internet population your app can reach based on your currently supported locales.

## Workspace Structure

This repo is a Turborepo monorepo using `pnpm`:
- `packages/core`: The analysis engine, checks, parsers, scoring math, and data constants.
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
- The portfolio value is `₹1,234,567` (International format).
- Switch to **Hindi**: The welcome message says "नमस्ते! तू यहाँ आ।" ("Hey! You come here." - extremely informal/disrespectful using *tu* register).
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
- Patch the JSON file to use the Indian Lakh/Crore format (`₹12,34,567`).
- Connect to the **Lingo.dev SDK** to re-translate the inappropriate Hindi strings into formal register.

### 5. Check the Dashboard
If you prefer a beautiful, shareable web UI instead of the terminal:

```bash
npx lingo-bharat serve --config ./i18n.json --open
```

### 6. Reset Demo State
Want to test it again?
```bash
pnpm --filter @lingo-bharat/demo reset
```

## Continuous Integration

Lingo Bharat comes with a pre-configured GitHub Action (`.github/workflows/lingo-bharat.yml`) that runs checks on every PR affecting `.json` or `.css` files.

## Built With
- [Lingo.dev SDK](https://lingo.dev)
- TypeScript & Node.js
- Commander.js
- React & Vite (Dashboard)
- Tailwind CSS

Built for the Lingo.dev Hackathon 2026.
