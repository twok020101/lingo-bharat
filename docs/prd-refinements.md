# Lingo Bharat — PRD Refinements & Corrections (Final)

> Applied on top of [lingo-bharat-prd.md](./lingo-bharat-prd.md)  
> Date: March 10, 2026 — Approved by user

---

## 1. String Overflow Formula Fix (§6.3)

**Bug:** Double-applies the multiplier. **Fix:** Use ratio-based comparison.

```diff
- const translatedWidth = translatedValue.length * multiplier;
+ const widthRatio = translatedValue.length / sourceValue.length;
+ const expectedMaxRatio = SCRIPT_WIDTH_MULTIPLIERS[locale] * OVERFLOW_THRESHOLD;
+ if (widthRatio > expectedMaxRatio) { ... }
```

## 2. Number Format — Dual-Format Validation (§6.1)

Numbers valid in both Indian (`12,34,567`) and international (`10,000`) formats → NOT a violation.

## 3. Font Stack — Expanded Scope (§6.2)

Added: `tailwind.config.*`, `next.config.*`, `*.html` (`<link>` tags to Google Fonts).

## 4. LingoConfig Type — Real Schema (§8.3)

Updated from real `i18n.json` (v1.12): added `$schema`, `lockedKeys`/`ignoredKeys`/`preservedKeys` per bucket, optional `provider.prompt`.

## 5. Dashboard → Vite + React (§10.1)

Changed from Next.js 15 to Vite + React. Rationale: local-only, no SEO, simpler setup.

## 6. Demo App — Minimal Scope (§13)

Single-page PayBharat with `next-intl`. One page, language switcher, seeded violations.

## 7. Timeline → 7 Days (§14)

Extended to March 11–17 (Monday evening deadline).

## 8. SDK API — Verified ✅

All methods confirmed: `localizeObject`, `localizeText`, `recognizeLocale`, `batchLocalizeText` from `lingo.dev/sdk`.
