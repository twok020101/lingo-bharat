# Lingo Bharat — Product Requirements Document

> **Hackathon:** Lingo.dev Hackathon (Week 2, March 2026)  
> **Author:** Kshitij (Solo)  
> **Version:** 1.1.0  
> **Status:** Refined — Implementation Ready

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Market Context](#3-market-context)
4. [Solution Overview](#4-solution-overview)
5. [Product Architecture](#5-product-architecture)
6. [Feature Specification](#6-feature-specification)
7. [Technical Implementation](#7-technical-implementation)
8. [Lingo.dev Integration](#8-lingodev-integration)
9. [Scoring Engine](#9-scoring-engine)
10. [Dashboard UI Spec](#10-dashboard-ui-spec)
11. [CLI Spec](#11-cli-spec)
12. [GitHub Action Spec](#12-github-action-spec)
13. [Demo App Spec](#13-demo-app-spec)
14. [6-Day Execution Plan](#14-6-day-execution-plan)
15. [Repository Structure](#15-repository-structure)
16. [Tech Stack](#16-tech-stack)
17. [Environment & Config](#17-environment--config)
18. [Test Strategy](#18-test-strategy)
19. [Deployment](#19-deployment)
20. [Pitch Narrative](#20-pitch-narrative)

---

## 1. Executive Summary

**Lingo Bharat** is an Indic localization quality assurance tool built on top of Lingo.dev. It analyzes translation files and running web apps to detect India-specific localization failures that generic i18n tools completely miss.

A developer can translate their app to Hindi using Lingo.dev and think they're done. Lingo Bharat tells them the truth: their number formatting uses the international system instead of lakh/crore, their Hindi UI uses `तू` (offensive informal register) instead of `आप`, their Tamil strings overflow fixed-width buttons, their font stack has no Devanagari fallback causing tofu rendering, and their "Hindi only" strategy reaches just 41% of Indian internet users.

**One-line pitch:** *The first localization QA tool that actually understands India.*

---

## 2. Problem Statement

### 2.1 The Translation ≠ Localization Gap

Lingo.dev solves translation brilliantly. But translation is a subset of localization. For India specifically, a perfectly translated app can still be deeply broken for its users across multiple dimensions that no existing tool — including Lingo Guardian — checks for.

### 2.2 Concrete Failure Modes

#### Failure 1: Number Formatting

India uses the **Lakh/Crore numbering system** (2-2-3 grouping from right), not the international thousands system.

```
International (WRONG for India):   ₹1,234,567
Indian Standard (CORRECT):         ₹12,34,567
```

An app showing `₹1,234,567` to an Indian user:
- Looks like a foreign product
- Creates cognitive friction reading large numbers
- In fintech, creates genuine trust issues and potential for misread amounts
- The difference between ₹1 crore and ₹10 lakh matters enormously

**Root cause:** Developers use `en-US` locale for Intl.NumberFormat or hardcode comma separators, never switching to `en-IN`. Or they use a formatting library without configuring it for Indian locales.

#### Failure 2: Indic Script Rendering (The Tofu Problem)

Devanagari (Hindi/Marathi), Tamil, Telugu, Kannada, Bengali, Gujarati, Odia — all require **complex text shaping** via HarfBuzz/OpenType features. When the app's CSS font stack lacks Indic-specific fonts, characters render as:
- Empty boxes (☐☐☐) — "tofu"  
- Broken conjuncts (consonant clusters split incorrectly)
- Misplaced matras (vowel diacritics above/below consonants)

```css
/* Broken — no Indic fallback */
font-family: 'Inter', 'Helvetica Neue', sans-serif;

/* Correct for Hindi */
font-family: 'Inter', 'Noto Sans Devanagari', 'Hind', sans-serif;

/* Correct for Tamil */
font-family: 'Inter', 'Noto Sans Tamil', 'Latha', sans-serif;

/* Correct for Telugu */
font-family: 'Inter', 'Noto Sans Telugu', 'Vani', sans-serif;
```

Each script family requires its own font. A single `sans-serif` fallback is catastrophically wrong.

#### Failure 3: String Length Overflow

Indian language strings are significantly longer than their English equivalents — not in characters necessarily, but in **visual/rendered width** due to combining characters and heavier letterforms.

| String | Language | Rendered width vs English |
|--------|----------|--------------------------|
| "Submit" | English | 1x |
| "जमा करें" | Hindi | ~1.8x |
| "சமர்ப்பி" | Tamil | ~2.5x |
| "సమర్పించు" | Telugu | ~2.8x |
| "ಸಲ್ಲಿಸು" | Kannada | ~2.2x |

Fixed-width buttons, `overflow: hidden` containers, truncated navigation tabs, and `white-space: nowrap` rules destroy Indic UIs. Lingo Guardian catches German/Russian overflow (which is documented and well-known). **It does not have Indic-specific width multipliers or script-aware overflow detection.**

#### Failure 4: Hindi Formality Register Violations

Hindi has three second-person pronouns, each carrying distinct social meaning:

| Pronoun | Register | Use Case | App Context |
|---------|----------|----------|-------------|
| `आप` (aap) | Formal/Respectful | Elders, strangers, officials | Banking, fintech, government |
| `तुम` (tum) | Neutral/Warm | Colleagues, friends | Consumer apps, e-commerce |
| `तू` (tu) | Intimate/Offensive | Very close friends only | **Never in production apps** |

AI translation engines — including most LLMs — default inconsistently. A common failure: the translation uses `तू` in error messages or CTAs, which feels rude to the user. In a banking app, this destroys trust immediately.

**Detection:** Scan all Hindi translation strings for `तू`, `तुझे`, `तेरा`, `तुझसे`, `तुम्हें` in contexts where formal register is required. Flag with suggested `आप`-register replacements via Lingo.dev SDK.

**Regional nuance (bonus):** Bihar/UP prefer `आप` even in consumer apps. Mumbai/Delhi consumer apps can use `तुम`. This is detectable by product category metadata.

#### Failure 5: Inadequate Language Coverage (The 60% Problem)

India's internet users by primary language:

| Language | Internet Users | Script |
|----------|---------------|--------|
| Hindi | ~41% | Devanagari |
| Bengali | ~8% | Bengali |
| Telugu | ~7% | Telugu |
| Marathi | ~7% | Devanagari |
| Tamil | ~6% | Tamil |
| Gujarati | ~5% | Gujarati |
| Kannada | ~4% | Kannada |
| Malayalam | ~3.5% | Malayalam |
| Punjabi | ~3% | Gurmukhi |
| Odia | ~1.5% | Odia |

An app that only supports Hindi reaches **41%** of Indian internet users. Adding Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada pushes coverage to **~78%**. This is a quantifiable, actionable metric that no existing tool surfaces.

**Source:** TRAI Telecom Subscription Data 2024, Census 2011 linguistic data, Internet and Mobile Association of India (IAMAI) 2024 report.

### 2.3 Why Existing Tools Don't Solve This

| Tool | What It Does | Indic Gap |
|------|-------------|-----------|
| Lingo.dev CLI | Translates files | No quality checking |
| Lingo Guardian | UI overflow, RTL, missing keys | No Indic-specific checks |
| Lingoport Localyzer QA | Enterprise QA suite | Not India-specific, expensive |
| SimpleLocalize LQA | Translation review workflow | Human-review only, no automation |
| Generic i18n linters | Missing keys, syntax | No cultural/rendering checks |

---

## 3. Market Context

### 3.1 India's Digital Landscape

- **900M+** internet users as of 2024 (IAMAI)
- **600M+** smartphone users
- **Google Play India**: 95% market share, supports store listings in 8+ Indian languages
- **Digital India push**: Government mandates for vernacular content in public services
- **Bharat (Tier 2/3 India)**: The next 500M users speak Indic languages first, English never
- **Fintech explosion**: PhonePe, Paytm, CRED, Zerodha — all serving users who read in Indic scripts

### 3.2 Developer Pain Point Reality

Most Indian SaaS and fintech companies start English-only. When they localize:
1. They use Lingo.dev or similar to auto-translate
2. They ship without testing the translation in context
3. They receive user complaints in vernacular ("app mein kuch gadbad hai")
4. They have no tool to systematically identify what's wrong
5. They manually fix ad-hoc, missing systemic issues

**Lingo Bharat fills this gap: from translate → to translate + verify → to translate + verify + fix.**

---

## 4. Solution Overview

### 4.1 What Lingo Bharat Is

A **CLI-first, dashboard-optional** tool that:

1. **Analyzes** your translation files (JSON, YAML — whatever Lingo.dev supports)
2. **Runs 5 Indic-specific checks** against your translations and optionally your live app URL
3. **Scores** your app's Indic readiness from 0–100 with a **Bharat Readiness Score (BRS)**
4. **Reports** exact file:line failures per check with severity levels
5. **Suggests fixes** using Lingo.dev SDK for automated remediation where possible
6. **Integrates** into CI/CD as a GitHub Action that can fail PRs below a BRS threshold

### 4.2 User Flow

```
Developer runs:
npx lingo-bharat@latest check --config i18n.json

        ↓

CLI reads i18n.json (Lingo.dev config)
        ↓

Discovers translation files per bucket config
        ↓

Runs 5 checks in parallel:
  ✓ Number Format Check
  ✓ Font Stack Check  
  ✓ String Length Check
  ✓ Formality Register Check
  ✓ Coverage Check
        ↓

Lingo.dev SDK called for:
  - recognizeLocale() on discovered files
  - localizeText() for formality fix suggestions
        ↓

Scoring engine calculates BRS
        ↓

Terminal report:
  Bharat Readiness Score: 34/100  🔴
  
  [CRITICAL] Number formatting: 12 violations in hi.json
  [CRITICAL] Font stack: No Devanagari fallback in globals.css
  [HIGH]     Formality: 8 tu-register violations in hi.json
  [MEDIUM]   String overflow: 3 Tamil strings >250% English length
  [INFO]     Coverage: Hindi only = 41% of Indian internet users
  
  Run `lingo-bharat fix` to auto-remediate 18/23 violations

        ↓ (optional)

Opens web dashboard at localhost:4321
Bharat Score card + per-check breakdown
Population coverage visualization
```

---

## 5. Product Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      lingo-bharat                            │
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │  CLI Layer  │    │ Check Engine │    │  Lingo.dev SDK │  │
│  │             │    │              │    │                │  │
│  │ check       │───▶│ NumberFormat │───▶│ recognizeLocale│  │
│  │ fix         │    │ FontStack    │    │ localizeText   │  │
│  │ report      │    │ StringLength │    │ localizeObject │  │
│  │ serve       │    │ Formality    │    │                │  │
│  └─────────────┘    │ Coverage     │    └────────────────┘  │
│                     └──────┬───────┘                        │
│                            │                                │
│                     ┌──────▼───────┐                        │
│                     │ Scoring      │                        │
│                     │ Engine       │                        │
│                     └──────┬───────┘                        │
│                            │                                │
│              ┌─────────────┼──────────────┐                 │
│              ▼             ▼              ▼                  │
│       ┌─────────┐  ┌──────────────┐ ┌─────────┐            │
│       │Terminal │  │  Web Dashboard│ │  JSON   │            │
│       │ Report  │  │ (Vite+React) │ │ Report  │            │
│       └─────────┘  └──────────────┘ └─────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 5.1 Data Flow

```
i18n.json (Lingo.dev config)
        │
        ▼
ConfigParser
  - reads locale.source, locale.targets
  - reads buckets[].include patterns
  - resolves file paths via glob
        │
        ▼
FileDiscovery
  - finds all translation files matching patterns
  - groups by locale
  - returns Map<locale, string[]> (locale → file paths)
        │
        ▼
CheckRunner (parallel execution via Promise.all)
  ├── NumberFormatChecker(files)
  ├── FontStackChecker(projectRoot)
  ├── StringLengthChecker(files, sourceLocale)
  ├── FormalityChecker(files, targetLocales)
  └── CoverageChecker(targetLocales)
        │
        ▼
CheckResult[]
  - checkId: string
  - severity: 'critical' | 'high' | 'medium' | 'info'
  - violations: Violation[]
  - score: number (0-100 for this check)
  - autoFixable: boolean
        │
        ▼
ScoringEngine
  - weights each check
  - calculates BRS (0-100)
  - generates fix suggestions
        │
        ▼
ReportRenderer
  ├── Terminal (chalk + table)
  ├── JSON file
  └── Dashboard (serves Next.js)
```

---

## 6. Feature Specification

### 6.1 Check 1: Number Format Check

**ID:** `number-format`  
**Severity if violated:** CRITICAL  
**Weight in BRS:** 25 points  
**Auto-fixable:** Yes (suggest `en-IN` locale config)

#### What it checks

**Static analysis of translation files:**

Scans all translation JSON/YAML files for patterns that suggest hardcoded number formatting or incorrect locale configuration.

Pattern detection targets:

```typescript
// Patterns that indicate US/international formatting being used
const VIOLATION_PATTERNS = [
  // Hardcoded currency without Indian locale
  /₹[\d,]+(?!\s*(?:लाख|करोड़|crore|lakh))/g,
  
  // Numbers formatted with thousands (not lakh/crore) separator
  /\b\d{1,3}(?:,\d{3})+\b/g,
  
  // Intl.NumberFormat without en-IN
  /new Intl\.NumberFormat\(['"](?!en-IN)['"]/g,
  
  // toLocaleString without en-IN
  /\.toLocaleString\(['"](?!en-IN)['"]/g,
];
```

**Config file analysis:**

Check `i18n.json` and any `next.config.ts` / `vite.config.ts` for locale settings.

```typescript
// In i18n.json — check that hi, ta, te, bn locales are present
// In app config — check that defaultLocale or numberLocale is en-IN for Indian locales
```

**Runtime check (if URL provided):**

Use Playwright to render the app at target Indian locale and detect number display patterns on the page.

#### Violation Output Format

```json
{
  "checkId": "number-format",
  "severity": "critical",
  "violations": [
    {
      "file": "locales/hi.json",
      "line": 45,
      "key": "portfolio.total_value",
      "found": "₹1,23,456",
      "expected": "Use Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })",
      "autoFix": "replace_with_intl_numberformat"
    }
  ]
}
```

#### Fix Suggestion

Auto-generate a `lingo-bharat.patch.js` that shows:

```javascript
// BEFORE (detected in your code)
const formatted = `₹${amount.toLocaleString()}`;

// AFTER (Lingo Bharat suggestion)
const formatted = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
}).format(amount);
// Output: ₹12,34,567 ✓
```

---

### 6.2 Check 2: Font Stack Check

**ID:** `font-stack`  
**Severity if violated:** CRITICAL  
**Weight in BRS:** 20 points  
**Auto-fixable:** Yes (append font-face declarations)

#### What it checks

Scans CSS files, Tailwind config, global stylesheets, and `<style>` tags for `font-family` declarations. Cross-references with the target locales to determine which Indic fonts are required.

#### Locale → Required Font Mapping

```typescript
export const INDIC_FONT_MAP: Record<string, IndicFontRequirement> = {
  'hi': {
    script: 'Devanagari',
    requiredFonts: ['Noto Sans Devanagari', 'Hind', 'Poppins', 'Mukta'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700',
    systemFallbacks: ['Mangal', 'Kokila', 'Aparajita'],
  },
  'mr': {
    script: 'Devanagari',
    requiredFonts: ['Noto Sans Devanagari', 'Hind', 'Baloo 2'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari',
    systemFallbacks: ['Mangal'],
  },
  'ta': {
    script: 'Tamil',
    requiredFonts: ['Noto Sans Tamil', 'Latha', 'Tamil Sangam MN'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700',
    systemFallbacks: ['Latha', 'Vijaya'],
  },
  'te': {
    script: 'Telugu',
    requiredFonts: ['Noto Sans Telugu', 'Vani', 'Gautami'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;500;700',
    systemFallbacks: ['Vani', 'Gautami'],
  },
  'kn': {
    script: 'Kannada',
    requiredFonts: ['Noto Sans Kannada', 'Tunga', 'Kedage'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;500;700',
    systemFallbacks: ['Tunga'],
  },
  'bn': {
    script: 'Bengali',
    requiredFonts: ['Noto Sans Bengali', 'Hind Siliguri', 'Kalpurush'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700',
    systemFallbacks: ['Vrinda'],
  },
  'gu': {
    script: 'Gujarati',
    requiredFonts: ['Noto Sans Gujarati', 'Shruti'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;500;700',
    systemFallbacks: ['Shruti'],
  },
  'pa': {
    script: 'Gurmukhi',
    requiredFonts: ['Noto Sans Gurmukhi', 'Raavi'],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gurmukhi:wght@400;500;700',
    systemFallbacks: ['Raavi'],
  },
};
```

#### Detection Logic

```typescript
async function checkFontStack(projectRoot: string, targetLocales: string[]): Promise<CheckResult> {
  const cssFiles = await glob('**/*.css', { cwd: projectRoot, ignore: ['node_modules/**'] });
  const tsxFiles = await glob('**/*.{tsx,jsx,ts,js}', { cwd: projectRoot, ignore: ['node_modules/**'] });
  const tailwindConfig = await glob('tailwind.config.{ts,js,mjs}', { cwd: projectRoot });
  const nextConfig = await glob('next.config.{ts,js,mjs}', { cwd: projectRoot });
  const htmlFiles = await glob('**/*.html', { cwd: projectRoot, ignore: ['node_modules/**'] });

  const fontDeclarations = extractFontDeclarations([
    ...cssFiles, ...tsxFiles, ...tailwindConfig, ...nextConfig, ...htmlFiles
  ]);
  const violations: Violation[] = [];

  for (const locale of targetLocales) {
    const required = INDIC_FONT_MAP[locale];
    if (!required) continue; // Non-Indic locale, skip

    const hasRequiredFont = required.requiredFonts.some(font =>
      fontDeclarations.some(decl => decl.includes(font))
    ) || required.systemFallbacks.some(font =>
      fontDeclarations.some(decl => decl.includes(font))
    );

    if (!hasRequiredFont) {
      violations.push({
        locale,
        script: required.script,
        severity: 'critical',
        message: `No ${required.script} font found in font stack for locale '${locale}'`,
        autoFix: generateFontFix(locale, required),
      });
    }
  }

  return buildCheckResult('font-stack', violations);
}
```

#### Auto-Fix Output

When `lingo-bharat fix font-stack` is run, it appends to `globals.css`:

```css
/* Lingo Bharat: Indic font stack additions */
/* Added for locale: hi, mr (Devanagari script) */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');

/* Added for locale: ta (Tamil script) */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap');

/* Applied to body — Lingo Bharat Indic font stack */
:root[lang="hi"], :root[lang="mr"] {
  --font-primary: 'Inter', 'Noto Sans Devanagari', 'Hind', sans-serif;
}

:root[lang="ta"] {
  --font-primary: 'Inter', 'Noto Sans Tamil', sans-serif;
}

:root[lang="te"] {
  --font-primary: 'Inter', 'Noto Sans Telugu', 'Vani', sans-serif;
}
```

---

### 6.3 Check 3: String Length / Overflow Check

**ID:** `string-overflow`  
**Severity if violated:** HIGH  
**Weight in BRS:** 15 points  
**Auto-fixable:** No (UI changes required, but provides specific CSS recommendations)

#### What it checks

Compares string lengths of translated content vs source (English) content. Uses **visual width multipliers** per script derived from typographic research.

#### Visual Width Multipliers

```typescript
// Empirically derived visual width multipliers for rendered text
// (pixel width of translated string relative to same English string at same font-size)
export const SCRIPT_WIDTH_MULTIPLIERS: Record<string, number> = {
  'hi': 1.6,   // Devanagari — matras add vertical space but moderate horizontal
  'mr': 1.6,   // Same as Hindi (same script)
  'ta': 2.4,   // Tamil — complex ligatures, longer words
  'te': 2.6,   // Telugu — very long words, heavy letterforms
  'kn': 2.2,   // Kannada — similar to Telugu
  'bn': 1.7,   // Bengali — moderate
  'gu': 1.8,   // Gujarati — moderate
  'pa': 1.7,   // Punjabi — moderate
  'ml': 2.8,   // Malayalam — the longest — highly complex ligatures
};

// Threshold: flag if translated string exceeds source * multiplier * OVERFLOW_THRESHOLD
const OVERFLOW_THRESHOLD = 1.2; // Allow 20% beyond expected
```

#### Detection Logic

```typescript
async function checkStringOverflow(
  sourceFiles: string[],
  translatedFiles: Map<string, string[]>,
  sourceLocale: string
): Promise<CheckResult> {
  const sourceStrings = await loadTranslationFiles(sourceFiles);
  const violations: Violation[] = [];

  for (const [locale, files] of translatedFiles) {
    const multiplier = SCRIPT_WIDTH_MULTIPLIERS[locale];
    if (!multiplier) continue;

    const translatedStrings = await loadTranslationFiles(files);

    for (const [key, sourceValue] of Object.entries(sourceStrings)) {
      const translatedValue = translatedStrings[key];
      if (!translatedValue || sourceValue.length === 0) continue;

      // Compare actual length ratio against expected max ratio for this script
      const widthRatio = translatedValue.length / sourceValue.length;
      const expectedMaxRatio = multiplier * OVERFLOW_THRESHOLD;

      if (widthRatio > expectedMaxRatio) {
        violations.push({
          locale,
          key,
          sourceValue,
          translatedValue,
          sourceLength: sourceValue.length,
          translatedLength: translatedValue.length,
          widthRatio: widthRatio.toFixed(2),
          recommendation: `String is ${((widthRatio - 1) * 100).toFixed(0)}% wider than English (expected max: ${((expectedMaxRatio - 1) * 100).toFixed(0)}%). Ensure container uses flex-wrap or auto-height.`,
          cssRecommendation: `
            /* For key: ${key} */
            .${keyToCssClass(key)} {
              overflow-wrap: break-word;
              word-break: break-word;
              hyphens: auto;
              min-height: fit-content;
              height: auto; /* Remove fixed height if set */
            }
          `
        });
      }
    }
  }

  return buildCheckResult('string-overflow', violations);
}
```

---

### 6.4 Check 4: Hindi Formality Register Check

**ID:** `formality-register`  
**Severity if violated:** HIGH (fintech/banking context) / MEDIUM (consumer apps)  
**Weight in BRS:** 20 points  
**Auto-fixable:** Yes (via Lingo.dev SDK re-translation with formality context)

#### What it checks

Scans all Hindi (`hi`, `hi-IN`) translation strings for `tu`-register pronoun and verb forms that are inappropriate for app UIs.

#### Tu-Register Patterns

```typescript
export const TU_REGISTER_PATTERNS = {
  // Direct pronouns
  pronouns: [
    /\bतू\b/g,          // tu
    /\bतुझे\b/g,        // tujhe (to you - tu form)
    /\bतेरा\b/g,        // tera (your - tu form)
    /\bतेरी\b/g,        // teri (your - tu form, feminine)
    /\bतेरे\b/g,        // tere (your - tu form, plural/oblique)
    /\bतुझसे\b/g,       // tujhse (from you - tu form)
    /\bतुझमें\b/g,      // tujhmein (in you - tu form)
  ],
  
  // Tu-conjugated verb forms (common in UI buttons/instructions)
  verbForms: [
    /\bकर\b(?!\s*(?:ें|ो|िए))/g,  // kar (imperative - tu form, vs करें karein = aap form)
    /\bदेख\b(?!\s*(?:ें|ो|िए))/g, // dekh (tu imperative)
    /\bजा\b(?!\s*(?:एं|ओ|इए))/g,  // ja (tu imperative for "go")
    /\bआ\b(?!\s*(?:एं|ओ|इए))/g,   // aa (tu imperative for "come")
  ]
};

// Suggested aap-register replacements
export const FORMALITY_REPLACEMENTS: Record<string, string> = {
  'तू': 'आप',
  'तुझे': 'आपको',
  'तेरा': 'आपका',
  'तेरी': 'आपकी',
  'तेरे': 'आपके',
  'तुझसे': 'आपसे',
};
```

#### Lingo.dev SDK Integration for Auto-Fix

```typescript
import { LingoDotDevEngine } from 'lingo.dev/sdk';

async function fixFormalityViolations(
  violations: FormalityViolation[],
  apiKey: string
): Promise<FixResult[]> {
  const engine = new LingoDotDevEngine({ apiKey });
  const fixes: FixResult[] = [];

  for (const violation of violations) {
    // Use Lingo.dev to re-translate with explicit formality instruction
    const fixed = await engine.localizeText(
      violation.sourceEnglishValue, // original English string
      {
        sourceLocale: 'en',
        targetLocale: 'hi',
        // Custom prompt instruction via the provider config
        // This uses Lingo.dev's context-aware translation
      }
    );

    // Post-process: verify aap-register was used
    const hasRespectfulForm = !TU_REGISTER_PATTERNS.pronouns.some(p => p.test(fixed));

    fixes.push({
      key: violation.key,
      original: violation.translatedValue,
      fixed: hasRespectfulForm ? fixed : applyDirectReplacement(violation.translatedValue),
      method: hasRespectfulForm ? 'lingo-sdk-retranslation' : 'pattern-replacement',
    });
  }

  return fixes;
}
```

---

### 6.5 Check 5: Coverage Check

**ID:** `coverage`  
**Severity if violated:** INFO → MEDIUM (based on gap)  
**Weight in BRS:** 20 points  
**Auto-fixable:** No (but generates Lingo.dev i18n.json patch to add missing locales)

#### What it checks

Reads `i18n.json` target locales. Maps them to Indian internet user population percentages. Calculates **Bharat Coverage Score** and shows which languages to add for maximum reach gain.

#### Population Data

```typescript
// Source: TRAI 2024 + IAMAI 2024 + Census linguistic data
export const INDIA_INTERNET_POPULATION: Record<string, IndicPopulation> = {
  'hi':  { language: 'Hindi',     users_millions: 350, percentage: 38.9, script: 'Devanagari', states: ['UP', 'MP', 'Bihar', 'Rajasthan', 'Haryana', 'Delhi'] },
  'bn':  { language: 'Bengali',   users_millions: 72,  percentage: 8.0,  script: 'Bengali',    states: ['West Bengal', 'Tripura'] },
  'te':  { language: 'Telugu',    users_millions: 63,  percentage: 7.0,  script: 'Telugu',     states: ['Andhra Pradesh', 'Telangana'] },
  'mr':  { language: 'Marathi',   users_millions: 63,  percentage: 7.0,  script: 'Devanagari', states: ['Maharashtra'] },
  'ta':  { language: 'Tamil',     users_millions: 54,  percentage: 6.0,  script: 'Tamil',      states: ['Tamil Nadu', 'Puducherry'] },
  'gu':  { language: 'Gujarati',  users_millions: 45,  percentage: 5.0,  script: 'Gujarati',   states: ['Gujarat'] },
  'kn':  { language: 'Kannada',   users_millions: 36,  percentage: 4.0,  script: 'Kannada',    states: ['Karnataka'] },
  'ml':  { language: 'Malayalam', users_millions: 31,  percentage: 3.5,  script: 'Malayalam',  states: ['Kerala'] },
  'pa':  { language: 'Punjabi',   users_millions: 27,  percentage: 3.0,  script: 'Gurmukhi',   states: ['Punjab', 'Haryana'] },
  'or':  { language: 'Odia',      users_millions: 13,  percentage: 1.5,  script: 'Odia',       states: ['Odisha'] },
};

// Total tracked: ~900M * indexed percentage = ~650M tagged users
```

#### Coverage Calculation

```typescript
function calculateCoverage(targetLocales: string[]): CoverageResult {
  const indicLocales = targetLocales.filter(l => INDIA_INTERNET_POPULATION[l]);
  
  const covered = indicLocales.reduce((sum, locale) => {
    return sum + (INDIA_INTERNET_POPULATION[locale]?.percentage ?? 0);
  }, 0);

  const uncovered = Object.entries(INDIA_INTERNET_POPULATION)
    .filter(([locale]) => !indicLocales.includes(locale))
    .sort(([, a], [, b]) => b.percentage - a.percentage);

  const recommendations = uncovered.slice(0, 3).map(([locale, data]) => ({
    locale,
    language: data.language,
    percentageGain: data.percentage,
    newTotalAfterAdding: covered + data.percentage,
    effortLevel: data.script === 'Devanagari' ? 'LOW' : 'MEDIUM', // Devanagari shared with Hindi
  }));

  return {
    currentCoveragePercent: covered,
    maxPossiblePercent: 85.9, // sum of all tracked
    gap: 85.9 - covered,
    score: Math.round((covered / 85.9) * 100),
    recommendations,
    i18nJsonPatch: generateI18nJsonPatch(recommendations.map(r => r.locale)),
  };
}
```

#### Auto-Generated i18n.json Patch

```json
{
  "_comment": "Lingo Bharat recommendation: Add these locales to increase Bharat coverage from 41% to 78%",
  "locale": {
    "source": "en",
    "targets": ["hi", "ta", "te", "mr", "bn", "gu", "kn"]
  }
}
```

---

## 7. Technical Implementation

### 7.1 Monorepo Structure

```
lingo-bharat/
├── packages/
│   ├── core/                     # Check engine, scoring, types
│   │   ├── src/
│   │   │   ├── checks/
│   │   │   │   ├── number-format.ts
│   │   │   │   ├── font-stack.ts
│   │   │   │   ├── string-overflow.ts
│   │   │   │   ├── formality-register.ts
│   │   │   │   ├── coverage.ts
│   │   │   │   └── index.ts
│   │   │   ├── scoring/
│   │   │   │   ├── engine.ts
│   │   │   │   └── weights.ts
│   │   │   ├── fixer/
│   │   │   │   ├── font-fixer.ts
│   │   │   │   ├── formality-fixer.ts
│   │   │   │   └── number-fixer.ts
│   │   │   ├── data/
│   │   │   │   ├── indic-fonts.ts
│   │   │   │   ├── india-population.ts
│   │   │   │   ├── formality-patterns.ts
│   │   │   │   └── width-multipliers.ts
│   │   │   ├── parsers/
│   │   │   │   ├── i18n-config.ts    # parse i18n.json
│   │   │   │   ├── json-bucket.ts    # parse locale JSON files
│   │   │   │   └── css-parser.ts     # parse CSS for font declarations
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                      # npx lingo-bharat
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── check.ts
│   │   │   │   ├── fix.ts
│   │   │   │   ├── report.ts
│   │   │   │   └── serve.ts
│   │   │   ├── renderers/
│   │   │   │   ├── terminal.ts   # chalk-based terminal output
│   │   │   │   └── json.ts       # JSON report file output
│   │   │   └── index.ts          # CLI entry point (commander.js)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── dashboard/                # Web dashboard (Vite + React)
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx          # Main score dashboard
│       │   │   ├── layout.tsx
│       │   │   └── api/
│       │   │       └── report/
│       │   │           └── route.ts  # Serves latest report JSON
│       │   ├── components/
│       │   │   ├── BharatScoreCard.tsx
│       │   │   ├── CheckBreakdown.tsx
│       │   │   ├── CoverageMap.tsx
│       │   │   ├── ViolationList.tsx
│       │   │   └── FixSuggestion.tsx
│       │   └── lib/
│       │       └── report-store.ts
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   └── demo/                     # Intentionally broken Indian fintech app
│       ├── locales/
│       │   ├── en.json
│       │   ├── hi.json           # Contains formality violations + bad numbers
│       │   └── ta.json           # Contains overflow strings
│       ├── src/
│       └── package.json
│
├── .github/
│   └── workflows/
│       └── bharat-check.yml      # Example GitHub Action
├── i18n.json                     # Root Lingo.dev config
├── package.json                  # pnpm workspace root
├── pnpm-workspace.yaml
└── turbo.json
```

---

### 7.2 Core Types

```typescript
// packages/core/src/types.ts

export type Locale = string; // BCP-47: 'hi', 'hi-IN', 'ta', 'te', etc.

export type CheckId =
  | 'number-format'
  | 'font-stack'
  | 'string-overflow'
  | 'formality-register'
  | 'coverage';

export type Severity = 'critical' | 'high' | 'medium' | 'info';

export interface Violation {
  file?: string;
  line?: number;
  locale: Locale;
  key?: string;
  message: string;
  severity: Severity;
  found?: string;
  expected?: string;
  autoFix?: AutoFix;
}

export interface AutoFix {
  type: 'css-append' | 'json-patch' | 'i18n-config-patch' | 'lingo-sdk-retranslate';
  patch: string | object;
  description: string;
}

export interface CheckResult {
  checkId: CheckId;
  name: string;
  description: string;
  score: number;           // 0-100 for this check
  maxScore: number;        // Weight allocated to this check
  violations: Violation[];
  autoFixableCount: number;
  passed: boolean;
}

export interface BharatReport {
  generatedAt: string;         // ISO timestamp
  projectRoot: string;
  i18nConfigPath: string;
  sourceLocale: Locale;
  targetLocales: Locale[];
  indicLocales: Locale[];      // subset of targetLocales that are Indic
  bharatReadinessScore: number; // 0-100 overall BRS
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: CheckResult[];
  coverageSummary: {
    currentCoveragePercent: number;
    coveredLocales: Locale[];
    topRecommendations: LocaleRecommendation[];
  };
  totalViolations: number;
  autoFixableViolations: number;
}

export interface IndicPopulation {
  language: string;
  users_millions: number;
  percentage: number;
  script: string;
  states: string[];
}

export interface LocaleRecommendation {
  locale: Locale;
  language: string;
  percentageGain: number;
  newTotalAfterAdding: number;
  effortLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

---

### 7.3 Scoring Engine

```typescript
// packages/core/src/scoring/engine.ts

export const CHECK_WEIGHTS: Record<CheckId, number> = {
  'number-format':      25,  // Critical for fintech/e-commerce
  'font-stack':         20,  // Critical for rendering
  'formality-register': 20,  // High trust impact
  'string-overflow':    15,  // High usability impact
  'coverage':           20,  // Strategic reach
};
// Total: 100

export const GRADE_THRESHOLDS = {
  A: 90,
  B: 75,
  C: 60,
  D: 40,
  F: 0,
};

export function calculateBRS(checkResults: CheckResult[]): number {
  return checkResults.reduce((total, check) => {
    const weight = CHECK_WEIGHTS[check.checkId];
    const contribution = (check.score / 100) * weight;
    return total + contribution;
  }, 0);
}

export function scoreCheck(checkId: CheckId, violations: Violation[]): number {
  if (violations.length === 0) return 100;

  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const highCount = violations.filter(v => v.severity === 'high').length;
  const mediumCount = violations.filter(v => v.severity === 'medium').length;

  // Scoring formula: start at 100, deduct per violation severity
  const deduction =
    (criticalCount * 25) +
    (highCount * 10) +
    (mediumCount * 5);

  return Math.max(0, 100 - deduction);
}

export function getGrade(brs: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (brs >= GRADE_THRESHOLDS.A) return 'A';
  if (brs >= GRADE_THRESHOLDS.B) return 'B';
  if (brs >= GRADE_THRESHOLDS.C) return 'C';
  if (brs >= GRADE_THRESHOLDS.D) return 'D';
  return 'F';
}
```

---

## 8. Lingo.dev Integration

### 8.1 How Lingo.dev is Used

Lingo Bharat is built **on top of** Lingo.dev, not parallel to it. Every interaction respects the Lingo.dev ecosystem.

| Lingo.dev Surface | How Lingo Bharat Uses It |
|-------------------|--------------------------|
| **CLI** (`npx lingo.dev@latest run`) | Lingo Bharat reads `i18n.json` — same config file. No duplication. |
| **SDK** `recognizeLocale()` | Detect which locales are present in discovered files without relying solely on filenames |
| **SDK** `localizeText()` | Re-translate strings with explicit formality context for Hindi auto-fix |
| **SDK** `localizeObject()` | Batch re-translate formality violations |
| **i18n.json** | Source of truth for project locale config — Lingo Bharat reads this, never creates a competing config |
| **CI/CD GitHub Action** | Lingo Bharat's GitHub Action runs **after** `lingodotdev/lingo.dev@main` action, as a quality gate |

### 8.2 SDK Integration Code

```typescript
// packages/core/src/fixer/formality-fixer.ts

import { LingoDotDevEngine } from 'lingo.dev/sdk';

export class FormalityFixer {
  private engine: LingoDotDevEngine;

  constructor(apiKey: string) {
    this.engine = new LingoDotDevEngine({ apiKey });
  }

  async fixFormalityViolations(
    violations: FormalityViolation[],
    sourceStrings: Record<string, string>
  ): Promise<Record<string, string>> {
    const fixes: Record<string, string> = {};

    // Batch: group by key, send source English strings for re-translation
    const toRetranslate = violations.reduce((acc, v) => {
      if (sourceStrings[v.key]) {
        acc[v.key] = sourceStrings[v.key];
      }
      return acc;
    }, {} as Record<string, string>);

    // Use localizeObject for batch efficiency
    const retranslated = await this.engine.localizeObject(
      toRetranslate,
      {
        sourceLocale: 'en',
        targetLocale: 'hi',
        // The engine will use context to determine appropriate register
        // We additionally post-process to verify aap-register
      }
    );

    for (const [key, value] of Object.entries(retranslated)) {
      // Verify the translation uses aap-register
      const hasViolation = TU_REGISTER_PATTERNS.pronouns.some(p =>
        new RegExp(p.source, 'g').test(value as string)
      );

      if (hasViolation) {
        // Fall back to pattern replacement
        fixes[key] = applyFormalityPatternFix(value as string);
      } else {
        fixes[key] = value as string;
      }
    }

    return fixes;
  }

  async detectLocale(text: string): Promise<string> {
    return this.engine.recognizeLocale(text);
  }
}
```

### 8.3 i18n.json Compatibility

Lingo Bharat reads the exact same `i18n.json` that Lingo.dev CLI uses:

```typescript
// packages/core/src/parsers/i18n-config.ts

import { readFile } from 'fs/promises';
import { glob } from 'glob';
import path from 'path';

export interface LingoConfig {
  $schema?: string;
  version: string;
  locale: {
    source: string;
    targets: string[];
  };
  buckets: Record<string, {
    include: string[];
    exclude?: string[];
    lockedKeys?: string[];    // Keys locked from re-translation
    ignoredKeys?: string[];   // Keys to skip entirely during checks
    preservedKeys?: string[]; // Keys to preserve as-is
  }>;
  provider?: {
    id: string;
    model?: string;
    prompt?: string;
  };
}

export async function parseLingoConfig(configPath: string): Promise<LingoConfig> {
  const raw = await readFile(configPath, 'utf-8');
  return JSON.parse(raw) as LingoConfig;
}

export async function resolveTranslationFiles(
  config: LingoConfig,
  projectRoot: string
): Promise<Map<string, string[]>> {
  const fileMap = new Map<string, string[]>();

  for (const locale of config.locale.targets) {
    const files: string[] = [];

    for (const [bucketType, bucketConfig] of Object.entries(config.buckets)) {
      for (const pattern of bucketConfig.include) {
        // Replace [locale] placeholder — same as Lingo.dev CLI does
        const resolvedPattern = pattern.replace('[locale]', locale);
        const matches = await glob(resolvedPattern, {
          cwd: projectRoot,
          ignore: bucketConfig.exclude,
        });
        files.push(...matches.map(f => path.join(projectRoot, f)));
      }
    }

    fileMap.set(locale, files);
  }

  return fileMap;
}
```

---

## 9. Scoring Engine

### 9.1 BRS Calculation Example

For a typical Hindi-only fintech app built by an Indian developer who used Lingo.dev CLI but never thought about Indic-specific issues:

| Check | Violations | Raw Score | Weight | Contribution |
|-------|-----------|-----------|--------|--------------|
| Number Format | 15 critical | 0/100 | 25 | 0 |
| Font Stack | 1 critical (no Devanagari font) | 0/100 | 20 | 0 |
| Formality Register | 8 high violations | 20/100 | 20 | 4 |
| String Overflow | 3 medium violations | 70/100 | 15 | 10.5 |
| Coverage | Hindi only = 41% | 47/100 | 20 | 9.4 |
| **TOTAL** | | | | **23.9 → BRS: 24** |

After `lingo-bharat fix` (auto-fixes number format, font stack, formality):

| Check | Violations | Raw Score | Weight | Contribution |
|-------|-----------|-----------|--------|--------------|
| Number Format | 0 | 100/100 | 25 | 25 |
| Font Stack | 0 | 100/100 | 20 | 20 |
| Formality Register | 0 | 100/100 | 20 | 20 |
| String Overflow | 3 medium | 70/100 | 15 | 10.5 |
| Coverage | Hindi only | 47/100 | 20 | 9.4 |
| **TOTAL** | | | | **84.9 → BRS: 85** |

**The story:** 24 → 85 in one `lingo-bharat fix` command. That's the demo.

---

## 10. Dashboard UI Spec

### 10.1 Tech

- **Framework:** Vite + React 19 (local-only, no SEO needed)
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts (coverage donut), react-circular-progressbar (BRS score)
- **Served by:** `lingo-bharat serve` command (starts local server, opens browser)

### 10.2 Page Layout

```
┌────────────────────────────────────────────────────────────────┐
│  🇮🇳 Lingo Bharat                             demo-fintech-app │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────┐    ┌──────────────────────────────────┐  │
│   │  Bharat          │    │  Check Breakdown                  │  │
│   │  Readiness       │    │                                   │  │
│   │  Score           │    │  ✓ Number Format    [████░░] 0    │  │
│   │                  │    │  ✗ Font Stack       [░░░░░░] 0    │  │
│   │    24 / 100      │    │  ⚠ Formality        [██░░░░] 20   │  │
│   │                  │    │  ⚠ Str. Overflow    [████░░] 70   │  │
│   │       F          │    │  ℹ Coverage         [████░░] 47   │  │
│   └──────────────────┘    └──────────────────────────────────┘  │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Bharat Coverage                                          │  │
│   │                                                           │  │
│   │  Current: ██████░░░░░░░░░░░░░░░░ 41%  (Hindi only)      │  │
│   │  +Tamil:  ████████░░░░░░░░░░░░░░ 47%  +6% users         │  │
│   │  +Telugu: ██████████░░░░░░░░░░░░ 54%  +7% users         │  │
│   │  +Marathi:████████████░░░░░░░░░░ 61%  +7% users         │  │
│   │  Full:    ████████████████░░░░░░ 86%  all tracked        │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Violations  [CRITICAL: 16]  [HIGH: 8]  [MEDIUM: 3]     │  │
│   │                                                           │  │
│   │  🔴 locales/hi.json:45  portfolio.total_value            │  │
│   │     Found: "₹1,23,456"  Expected: Intl.NumberFormat      │  │
│   │     [Auto-fix available]                                  │  │
│   │                                                           │  │
│   │  🔴 globals.css          No Devanagari font fallback      │  │
│   │     [Auto-fix available]                                  │  │
│   │                                                           │  │
│   │  🟡 locales/hi.json:102  user.welcome_message            │  │
│   │     Found: "तू यहाँ आ"   Tu-register pronoun detected    │  │
│   │     Suggest: "आप यहाँ आएं" [Auto-fix via Lingo SDK]      │  │
│   │                                                           │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│   [Run lingo-bharat fix]   [Export Report]   [Open in Editor]  │
└────────────────────────────────────────────────────────────────┘
```

### 10.3 BRS Score Card Component

```tsx
// packages/dashboard/src/components/BharatScoreCard.tsx

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';

const GRADE_COLORS = {
  A: '#22c55e',  // green
  B: '#84cc16',  // lime
  C: '#eab308',  // yellow
  D: '#f97316',  // orange
  F: '#ef4444',  // red
};

export function BharatScoreCard({ score, grade }: { score: number; grade: string }) {
  const color = GRADE_COLORS[grade as keyof typeof GRADE_COLORS];

  return (
    <div className="flex flex-col items-center gap-4 p-6 border rounded-xl bg-white shadow-sm">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
        Bharat Readiness Score
      </h2>
      <div className="w-36 h-36">
        <CircularProgressbar
          value={score}
          text={`${score}`}
          styles={buildStyles({
            pathColor: color,
            textColor: color,
            trailColor: '#f3f4f6',
            textSize: '28px',
          })}
        />
      </div>
      <div
        className="text-4xl font-black"
        style={{ color }}
      >
        Grade: {grade}
      </div>
      <p className="text-xs text-gray-400 text-center">
        {score < 40
          ? 'Your app has critical Indic localization failures'
          : score < 75
          ? 'Getting there — some important fixes needed'
          : 'Great Indic localization — minor improvements possible'}
      </p>
    </div>
  );
}
```

---

## 11. CLI Spec

### 11.1 Commands

```bash
# Run all checks
npx lingo-bharat@latest check

# Run with explicit config path
npx lingo-bharat@latest check --config ./i18n.json

# Run specific checks only
npx lingo-bharat@latest check --only number-format,font-stack

# Auto-fix all fixable violations
npx lingo-bharat@latest fix

# Fix specific check
npx lingo-bharat@latest fix --check font-stack

# Export JSON report
npx lingo-bharat@latest report --format json --output ./bharat-report.json

# Export HTML report
npx lingo-bharat@latest report --format html --output ./bharat-report.html

# Serve interactive dashboard
npx lingo-bharat@latest serve

# Serve and open browser
npx lingo-bharat@latest serve --open

# CI mode: exit code 1 if BRS below threshold
npx lingo-bharat@latest check --min-score 70 --ci
```

### 11.2 Terminal Output Format

```
$ npx lingo-bharat@latest check

🇮🇳 Lingo Bharat — Indic Localization Readiness Checker
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Project:    demo-fintech-app
📁 Config:     ./i18n.json
🌍 Locales:    hi, ta (2 Indic locales detected)
📄 Files:      8 translation files scanned

Running checks...

  ✓ Number Format Check.............. CRITICAL — 12 violations
  ✓ Font Stack Check................. CRITICAL — 2 violations
  ✓ Formality Register Check......... HIGH — 8 violations  
  ✓ String Overflow Check............ MEDIUM — 3 violations
  ✓ Coverage Check................... INFO — 41% coverage

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 BHARAT READINESS SCORE: 24 / 100  ← Grade: F

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRITICAL: Number Format (0/25 pts)
   12 violations in locales/hi.json

   Line 45   portfolio.total_value
             Found:    "कुल मूल्य: ₹1,23,456"
             Problem:  International (US) number grouping used
             Fix:      Use Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

   Line 67   transaction.amount
             Found:    "₹10,000"
             Problem:  ₹10,000 is ambiguous — is this 10 thousand or being misread?
             Fix:      Use en-IN locale: ₹10,000 → ₹10,000 (same here, but ₹1,00,000 ≠ ₹1,000,000)

   ... 10 more violations. Run with --verbose to see all.

🔴 CRITICAL: Font Stack (0/20 pts)
   2 violations

   src/styles/globals.css
             No Devanagari font fallback for locale 'hi'
             No Tamil font fallback for locale 'ta'
             Fix:      Run `lingo-bharat fix font-stack` to auto-append font imports

🟡 HIGH: Formality Register (4/20 pts)
   8 violations in locales/hi.json

   Line 102  user.welcome_message
             Found:    "तू यहाँ आ" (tu-register: तू detected)
             Suggest:  "आप यहाँ आएं" [Auto-fixable via Lingo.dev SDK]

   Line 118  error.retry_message
             Found:    "तुझे फिर से कोशिश करनी होगी"
             Suggest:  "आपको फिर से कोशिश करनी होगी" [Auto-fixable]

   ... 6 more violations.

🟠 MEDIUM: String Overflow (10.5/15 pts)
   3 violations

   locales/ta.json  submit_button
             Tamil string is 248% the width of English equivalent
             Ensure .submit-btn uses height: auto and overflow-wrap: break-word

ℹ️  INFO: Coverage (9.4/20 pts)
   Hindi only = 41% of Indian internet users

   Top recommendations to increase coverage:
   ┌─────────┬─────────────┬──────────────┬─────────────────┬────────┐
   │ Locale  │ Language    │ +% Users     │ Total After     │ Effort │
   ├─────────┼─────────────┼──────────────┼─────────────────┼────────┤
   │ bn      │ Bengali     │ +8.0%        │ 49%             │ MEDIUM │
   │ te      │ Telugu      │ +7.0%        │ 56%             │ MEDIUM │
   │ mr      │ Marathi     │ +7.0%        │ 63%  ⭐ Shared  │ LOW    │
   │         │             │              │     Devanagari  │        │
   └─────────┴─────────────┴──────────────┴─────────────────┴────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Auto-fixable violations: 22 / 25
   Run `npx lingo-bharat fix` to remediate automatically

📊 Open dashboard: `npx lingo-bharat serve --open`
```

---

## 12. GitHub Action Spec

### 12.1 Action YAML

```yaml
# .github/workflows/bharat-check.yml
name: Bharat Localization Check

on:
  push:
    branches: [main]
    paths:
      - 'locales/**'
      - 'i18n.json'
  pull_request:
    paths:
      - 'locales/**'
      - 'i18n.json'

jobs:
  bharat-check:
    name: Indic Localization Quality Gate
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Step 1: Run Lingo.dev translations first (standard workflow)
      - name: Lingo.dev Translate
        uses: lingodotdev/lingo.dev@main
        with:
          api-key: ${{ secrets.LINGODOTDEV_API_KEY }}

      # Step 2: Run Lingo Bharat quality gate
      - name: Lingo Bharat — Indic Quality Check
        run: |
          npx lingo-bharat@latest check \
            --config ./i18n.json \
            --min-score 70 \
            --ci \
            --report-path ./bharat-report.json
        env:
          LINGODOTDEV_API_KEY: ${{ secrets.LINGODOTDEV_API_KEY }}

      # Step 3: Post PR comment with score
      - name: Post BRS to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('./bharat-report.json', 'utf8'));
            const score = report.bharatReadinessScore;
            const grade = report.grade;
            const emoji = score >= 75 ? '✅' : score >= 40 ? '⚠️' : '🔴';

            const body = `## 🇮🇳 Lingo Bharat Report
            
            ${emoji} **Bharat Readiness Score: ${score}/100 (Grade: ${grade})**
            
            | Check | Score | Violations |
            |-------|-------|------------|
            ${report.checks.map(c =>
              `| ${c.name} | ${c.score}/100 | ${c.violations.length} |`
            ).join('\n')}
            
            **Coverage:** ${report.coverageSummary.currentCoveragePercent.toFixed(1)}% of Indian internet users
            
            ${report.autoFixableViolations > 0
              ? `💡 ${report.autoFixableViolations} violations can be auto-fixed with \`npx lingo-bharat fix\``
              : ''}
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });

      # Step 4: Upload report artifact
      - name: Upload Bharat Report
        uses: actions/upload-artifact@v4
        with:
          name: bharat-report
          path: ./bharat-report.json
```

---

## 13. Demo App Spec

### 13.1 Purpose

A purpose-built Next.js app that demonstrates all 5 failure categories **before** and the fixed state **after** running `lingo-bharat fix`. This is the core of the hackathon demo.

### 13.2 App: "PayBharat" — Fake Fintech App

A simple portfolio/wallet page with:
- Portfolio value display
- Transaction history
- Fund transfer form
- Welcome message
- Navigation items

### 13.3 Intentional Failures Seeded

**locales/hi.json (Hindi translations — broken):**

```json
{
  "nav.home": "होम",
  "nav.portfolio": "पोर्टफोलियो",
  "nav.transfer": "ट्रांसफर",

  "portfolio.total_value": "कुल मूल्य: ₹1,23,456",
  "portfolio.daily_gain": "+₹1,234 आज",

  "welcome.message": "नमस्ते! तू यहाँ आ।",
  "welcome.subtext": "तेरा पोर्टफोलियो देखने के लिए यहाँ क्लिक कर।",

  "transfer.button": "पैसे भेजो",
  "transfer.confirm": "तुझे यकीन है?",

  "error.retry": "तुझे फिर से कोशिश करनी होगी।",
  "error.network": "नेटवर्क की समस्या है। तू बाद में आ।"
}
```

**Failures present:**
- `₹1,23,456` — looks Indian but verify this is rendered by the app using en-US formatting (`₹123,456`)
- `तू`, `तेरा`, `तुझे`, `तू` — 4 tu-register violations in a fintech app

**globals.css (broken):**

```css
/* No Indic fonts */
body {
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
}
```

**locales/ta.json (Tamil — overflow):**

```json
{
  "transfer.button": "பணத்தை அனுப்புங்கள் இப்போதே",
  "nav.portfolio": "போர்ட்ஃபோலியோ மேலாண்மை"
}
```

These Tamil strings will overflow a standard button/nav tab.

### 13.4 Demo Flow Script

```
1. Show the app running in English — clean, beautiful
2. Switch to Hindi — numbers display wrong, Devanagari in tofu boxes (no font)
3. Switch to Tamil — nav overflows, button text clipped
4. Run: npx lingo-bharat check
   → Score: 24/100  Grade: F
   → Show full violation list
5. Run: npx lingo-bharat fix
   → Auto-fixes font stack, formality violations, generates number format patch
6. Apply number format patch manually (5 lines of code shown)
7. Re-run: npx lingo-bharat check
   → Score: 85/100  Grade: B
8. Show the app in Hindi again — fonts render, numbers correct, no tu violations
9. npx lingo-bharat serve --open
   → Show the dashboard with the before/after story
10. Show the PR comment screenshot (GitHub Action output)
```

---

## 14. 7-Day Execution Plan (March 11–17)

### Day 1 (Today — Tuesday)
**Goal:** Scaffold, core types, Number Format Checker working end-to-end

- [ ] Init pnpm monorepo with Turborepo
- [ ] `packages/core` — scaffold, types.ts, weights.ts
- [ ] Implement `ConfigParser` (read i18n.json)
- [ ] Implement `FileDiscovery` (glob translation files)
- [ ] Implement `NumberFormatChecker` (static analysis + pattern matching)
- [ ] Implement `ScoringEngine` (basic weighted scoring)
- [ ] `packages/cli` — scaffold with Commander.js
- [ ] Wire `check` command → run NumberFormatChecker → terminal output
- [ ] **End of day:** `npx lingo-bharat check` runs and finds number violations

### Day 2 (Wednesday)
**Goal:** Font Stack + Formality checkers + Lingo SDK integration

- [ ] Implement `FontStackChecker` (CSS scanning + locale→font mapping)
- [ ] Implement `FormalityChecker` (regex pattern scanning for tu-register)
- [ ] Integrate Lingo.dev SDK — `formality-fixer.ts`
- [ ] Implement `fix` command for font-stack (auto-append CSS)
- [ ] Implement `fix` command for formality (Lingo SDK re-translate)
- [ ] Write unit tests for pattern matching
- [ ] **End of day:** All 3 critical checks working, auto-fix working

### Day 3 (Thursday)
**Goal:** String Overflow + Coverage + complete scoring

- [ ] Implement `StringOverflowChecker` (width multiplier analysis)
- [ ] Implement `CoverageChecker` (locale → population mapping)
- [ ] Complete `ScoringEngine` (all 5 checks, BRS calculation, grade)
- [ ] Implement `report` command (JSON output)
- [ ] Build the Demo App ("PayBharat") with seeded failures
- [ ] **End of day:** Full `check` run gives 24/100 on demo app, `fix` brings it to 85/100

### Day 4 (Friday)
**Goal:** Dashboard UI

- [ ] Scaffold `packages/dashboard` (Next.js 15)
- [ ] `BharatScoreCard` component
- [ ] `CheckBreakdown` component
- [ ] `CoverageBar` component
- [ ] `ViolationList` component
- [ ] `serve` command wires dashboard + passes report data
- [ ] **End of day:** `lingo-bharat serve --open` shows beautiful dashboard

### Day 5 (Saturday)
**Goal:** GitHub Action + polish + README

- [ ] Build GitHub Action (`action.yml` + composite action)
- [ ] Test full CI workflow end-to-end
- [ ] Polish terminal output (colors, spacing, tables)
- [ ] Write comprehensive README.md
- [ ] Record demo video (screen recording with narration)
- [ ] **End of day:** Everything works, README done, video recorded

### Day 6 (Saturday–Sunday)
**Goal:** Deploy, submit, final polish

- [ ] Deploy dashboard to Vercel (live demo URL)
- [ ] Publish `lingo-bharat` to npm
- [ ] Final README polish (GIFs, badges, screenshots)
- [ ] Hackathon submission form filled
- [ ] Backup: ensure demo app is deployed on Vercel too

### Day 7 (Monday — evening deadline)
**Goal:** Final testing, buffer, submission

- [ ] Full end-to-end test of demo flow
- [ ] Record demo video (screen recording with narration)
- [ ] Final submission and polish

---

## 15. Repository Structure

```
github.com/[username]/lingo-bharat
├── README.md                         # Main docs — this is what judges read
├── package.json                      # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── i18n.json                         # Lingo.dev config for this repo itself
│
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── checks/
│   │   │   │   ├── number-format.ts
│   │   │   │   ├── font-stack.ts
│   │   │   │   ├── string-overflow.ts
│   │   │   │   ├── formality-register.ts
│   │   │   │   ├── coverage.ts
│   │   │   │   └── index.ts          # CheckRunner (parallel Promise.all)
│   │   │   ├── scoring/
│   │   │   │   ├── engine.ts
│   │   │   │   └── weights.ts
│   │   │   ├── fixer/
│   │   │   │   ├── font-fixer.ts
│   │   │   │   ├── formality-fixer.ts
│   │   │   │   └── number-fixer.ts
│   │   │   ├── data/
│   │   │   │   ├── indic-fonts.ts
│   │   │   │   ├── india-population.ts
│   │   │   │   ├── formality-patterns.ts
│   │   │   │   └── width-multipliers.ts
│   │   │   ├── parsers/
│   │   │   │   ├── i18n-config.ts
│   │   │   │   ├── json-bucket.ts
│   │   │   │   └── css-parser.ts
│   │   │   └── types.ts
│   │   ├── package.json              # @lingo-bharat/core
│   │   └── tsconfig.json
│   │
│   ├── cli/
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── check.ts
│   │   │   │   ├── fix.ts
│   │   │   │   ├── report.ts
│   │   │   │   └── serve.ts
│   │   │   ├── renderers/
│   │   │   │   ├── terminal.ts
│   │   │   │   └── json.ts
│   │   │   └── index.ts              # bin entry point
│   │   ├── package.json              # lingo-bharat (publishable)
│   │   └── tsconfig.json
│   │
│   └── dashboard/
│       ├── src/app/
│       │   ├── page.tsx
│       │   ├── layout.tsx
│       │   └── api/report/route.ts
│       ├── src/components/
│       │   ├── BharatScoreCard.tsx
│       │   ├── CheckBreakdown.tsx
│       │   ├── CoverageBar.tsx
│       │   └── ViolationList.tsx
│       └── package.json              # @lingo-bharat/dashboard
│
├── apps/
│   └── demo/                         # PayBharat demo app
│       ├── locales/
│       │   ├── en.json
│       │   ├── hi.json               # Seeded violations
│       │   └── ta.json               # Seeded overflow
│       ├── src/
│       │   └── app/page.tsx          # Simple fintech UI
│       └── package.json
│
└── .github/
    └── workflows/
        └── bharat-check.yml
```

---

## 16. Tech Stack

| Layer | Technology | Version | Reason |
|-------|-----------|---------|--------|
| **Runtime** | Node.js | 20 LTS | LTS stability |
| **Language** | TypeScript | 5.x | Type safety across packages |
| **Monorepo** | pnpm + Turborepo | latest | Same as Lingo.dev itself uses |
| **CLI framework** | Commander.js | 12.x | Mature, well-typed |
| **Terminal UI** | chalk + cli-table3 | latest | Colors + tables |
| **File globbing** | glob | 11.x | Fast, well-maintained |
| **CSS parsing** | css-tree | 3.x | Proper CSS AST parsing |
| **Dashboard** | Next.js | 15 (App Router) | Standard, deploys to Vercel easily |
| **Dashboard UI** | Tailwind CSS + shadcn/ui | latest | Fast beautiful UI |
| **Charts** | Recharts | 2.x | Simple, React-native |
| **Lingo.dev** | lingo.dev SDK | latest | Core integration |
| **Testing** | Vitest | 2.x | Fast, ESM-native |
| **Linting** | ESLint + Prettier | latest | Code quality |

---

## 17. Environment & Config

### 17.1 `.env` (for users of the tool)

```bash
# Required for formality auto-fix (Lingo.dev SDK calls)
LINGODOTDEV_API_KEY=your_key_here

# Optional: override minimum score for CI mode (default: 70)
LINGO_BHARAT_MIN_SCORE=70

# Optional: dashboard port (default: 4321)
LINGO_BHARAT_PORT=4321
```

### 17.2 `lingo-bharat.config.json` (optional, for advanced users)

```json
{
  "lingoConfig": "./i18n.json",
  "projectRoot": ".",
  "checks": {
    "number-format": { "enabled": true },
    "font-stack": {
      "enabled": true,
      "cssGlobs": ["src/**/*.css", "src/**/*.tsx"]
    },
    "formality-register": {
      "enabled": true,
      "productCategory": "fintech",
      "requiredRegister": "aap"
    },
    "string-overflow": {
      "enabled": true,
      "overflowThreshold": 1.2
    },
    "coverage": {
      "enabled": true,
      "targetCoverage": 70
    }
  },
  "ci": {
    "minScore": 70,
    "failOnCritical": true
  }
}
```

---

## 18. Test Strategy

### 18.1 Unit Tests

```typescript
// packages/core/src/checks/__tests__/number-format.test.ts
import { describe, it, expect } from 'vitest';
import { checkNumberFormat } from '../number-format';

describe('NumberFormatChecker', () => {
  it('detects US-style number formatting in Hindi JSON', async () => {
    const result = await checkNumberFormat({
      files: ['fixtures/hi-broken.json'],
      locale: 'hi'
    });
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].severity).toBe('critical');
  });

  it('passes when en-IN locale is correctly used', async () => {
    const result = await checkNumberFormat({
      files: ['fixtures/hi-correct.json'],
      locale: 'hi'
    });
    expect(result.violations.length).toBe(0);
  });
});

// packages/core/src/checks/__tests__/formality-register.test.ts
describe('FormalityChecker', () => {
  it('detects tu-register pronoun तू', async () => {
    const result = await checkFormalityRegister({
      files: ['fixtures/hi-tu-register.json'],
      locale: 'hi'
    });
    expect(result.violations.some(v => v.found?.includes('तू'))).toBe(true);
  });

  it('passes aap-register Hindi translations', async () => {
    const result = await checkFormalityRegister({
      files: ['fixtures/hi-aap-register.json'],
      locale: 'hi'
    });
    expect(result.violations.length).toBe(0);
  });
});
```

### 18.2 Integration Tests

```typescript
// Test full pipeline on demo app
describe('Full pipeline on PayBharat demo app', () => {
  it('generates BRS < 50 for broken demo app', async () => {
    const report = await runFullCheck('apps/demo', 'apps/demo/i18n.json');
    expect(report.bharatReadinessScore).toBeLessThan(50);
  });

  it('generates BRS > 80 after applying fixes', async () => {
    await runAutoFix('apps/demo');
    const report = await runFullCheck('apps/demo', 'apps/demo/i18n.json');
    expect(report.bharatReadinessScore).toBeGreaterThan(80);
  });
});
```

---

## 19. Deployment

### 19.1 npm Package

```json
// packages/cli/package.json
{
  "name": "lingo-bharat",
  "version": "1.0.0",
  "description": "Indic localization readiness checker for Lingo.dev projects",
  "bin": {
    "lingo-bharat": "./dist/index.js"
  },
  "keywords": ["i18n", "l10n", "india", "indic", "localization", "lingo.dev", "hindi", "tamil"],
  "peerDependencies": {
    "lingo.dev": ">=0.130.0"
  }
}
```

```bash
# One-command usage (no install required)
npx lingo-bharat@latest check
```

### 19.2 Dashboard on Vercel

- `packages/dashboard` is a standalone Next.js app
- Deploy to `lingo-bharat.vercel.app` as a live demo
- The demo instance runs against the `apps/demo` (PayBharat) fixture data
- Judges can see the dashboard live without installing anything

### 19.3 GitHub Action on Marketplace

- Publish as a composite GitHub Action
- `uses: [username]/lingo-bharat@main`
- Listed in GitHub Marketplace under "Code Quality" category

---

## 20. Pitch Narrative

### The Hook (10 seconds)

> "India has 900 million internet users. Most apps are 'translated' to Indian languages but still fail them. Lingo.dev solves translation. Lingo Bharat solves what comes after."

### The Problem (30 seconds)

> "When an Indian developer translates their fintech app to Hindi using Lingo.dev, three things go wrong that no tool catches: numbers show ₹1,234,567 instead of ₹12,34,567 — the lakh/crore system Indians use. The AI-translated Hindi uses 'tu' — an intimate pronoun that's rude in a banking context. And without Noto Sans Devanagari in the font stack, the whole app renders as boxes on 300 million Android devices."

### The Solution (30 seconds)

> "Lingo Bharat is a CLI tool that runs after Lingo.dev translates your files. It checks 5 India-specific failure categories, gives your app a Bharat Readiness Score out of 100, and auto-fixes 80% of violations in one command. It integrates as a GitHub Action so these failures never reach production."

### The Demo (60 seconds)

> Live: 24/100 → `lingo-bharat fix` → 85/100. Open dashboard. Show the PR comment.

### The Differentiation

> "Lingo Guardian checks if your text overflows in German. Lingo Bharat checks if your text is offensive to 350 million Hindi speakers."

---

*Document version 1.0 — Lingo.dev Hackathon March 2026*  
*Built with Lingo.dev CLI + SDK + CI/CD*
