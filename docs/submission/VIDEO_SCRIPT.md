# Lingo Bharat - Video Explanation Script

> Target duration: 3-5 minutes
> Format: Screen recording with voiceover
> Tool: QuickTime/OBS + terminal + browser

---

## SCENE 1: Hook (0:00 - 0:30)

**[Screen: Show a Hindi website with broken formatting]**

**Script:**
> "You just translated your app to Hindi using Lingo.dev. You think you're done. But you're not."
>
> "Your numbers say 1,234,567 instead of 12,34,567. Your Hindi says 'tu' instead of 'aap' - which is like calling your users 'hey dude' in a banking app. Your fonts show empty boxes instead of Devanagari. And your 'Hindi only' strategy reaches just 39% of India's internet users."
>
> "Translation is not localization. Meet Lingo Bharat."

---

## SCENE 2: What is Lingo Bharat? (0:30 - 1:15)

**[Screen: Show the README / architecture diagram]**

**Script:**
> "Lingo Bharat is an ESLint for Indic localization. It's built on top of the Lingo.dev ecosystem - reading the same i18n.json config, using the SDK for language detection and re-translation, and integrating into CI/CD as a quality gate after Lingo.dev translate."
>
> "It runs 5 checks:"
> 1. "Number Format - catches international comma grouping instead of Indian Lakh/Crore"
> 2. "Font Stack - ensures CSS has Indic script font fallbacks"
> 3. "Formality Register - detects inappropriate 'tu' pronouns in Hindi"
> 4. "String Overflow - flags Indic translations that will break fixed-width UI"
> 5. "Coverage Reach - calculates what percentage of India's internet users you actually reach"
>
> "It produces a Bharat Readiness Score from 0 to 100, graded A through F."

---

## SCENE 3: Live Demo - The Problem (1:15 - 2:15)

**[Screen: Terminal in apps/demo directory]**

**Action: Reset the demo and run the check**

```bash
cd apps/demo
pnpm reset
```

**Script:**
> "Let's see it in action. Here's PayBharat, a fictional fintech app. I'll reset it to its broken state."

**Action: Run the CLI**

```bash
npx lingo-bharat check --config ./i18n.json --verbose
```

**Script:**
> "Watch the output. Lingo Bharat finds 12 violations across all 5 checks. The Bharat Readiness Score is 24 out of 100 - Grade F."
>
> "It shows me the locale validation - powered by Lingo.dev's recognizeLocale API - confirming the Hindi file actually contains Hindi."
>
> "Look at these violations:
> - Number format: ₹1,234,567 should be ₹12,34,567
> - Font stack: No Noto Sans Devanagari in CSS
> - Formality: 'tu yaahan aa' - extremely rude for a banking app
> - Coverage: Hindi only means 39% reach"

---

## SCENE 4: Live Demo - The Fix (2:15 - 3:00)

**[Screen: Terminal]**

**Action: Run the fixer**

```bash
npx lingo-bharat fix --config ./i18n.json
```

**Script:**
> "Now watch Lingo Bharat fix everything automatically."
>
> "It appends Noto Sans Devanagari to the CSS. It converts numbers to Indian format. And here's the key part - it uses Lingo.dev's localizeObject API to batch re-translate all the formality violations in a single API call. Not one-by-one, but all at once."
>
> "Let's verify:"

**Action: Re-run check**

```bash
npx lingo-bharat check --config ./i18n.json
```

**Script:**
> "BRS jumped from 24 to 85. Grade B. The number format, font stack, and formality checks all pass now."

---

## SCENE 5: Live Demo - JSON Report & Dashboard (3:00 - 3:30)

**Action: Generate report and open dashboard**

```bash
npx lingo-bharat check --config ./i18n.json --report-path ./bharat-report.json
npx lingo-bharat serve --config ./i18n.json --open
```

**Script:**
> "You can export a JSON report for CI pipelines, and open the visual dashboard for a shareable web view of the results."

**[Screen: Show dashboard in browser briefly]**

---

## SCENE 6: Lingo.dev Integration Deep Dive (3:30 - 4:15)

**[Screen: Show code / architecture]**

**Script:**
> "Let me show you how deeply this integrates with Lingo.dev."
>
> "First - it reads the same i18n.json config. Zero extra configuration."
>
> "Second - recognizeLocale. During analysis, it samples translation values and uses the SDK to verify the file actually contains the declared language."

**[Screen: Show formality-fixer.ts briefly]**

> "Third - localizeObject. The FormalityFixer class batches all violations into a single localizeObject call. This is the proper way to use the SDK for bulk re-translation."
>
> "Fourth - the GitHub Action runs Lingo.dev translate first, then Lingo Bharat as a quality gate. It posts a BRS score table as a PR comment and uploads the report as an artifact."

**[Screen: Show the GitHub Action YAML]**

---

## SCENE 7: CI/CD Pipeline (4:15 - 4:30)

**[Screen: Show the workflow YAML]**

**Script:**
> "In CI, the workflow is: Lingo.dev translates your files, then Lingo Bharat checks the quality. If BRS drops below 70, the pipeline fails. Every PR gets a score table comment. This is how you prevent localization regressions."

---

## SCENE 8: Closing (4:30 - 5:00)

**[Screen: README with badges]**

**Script:**
> "Lingo Bharat has 32 tests across 7 test files, covers all 5 checks, and uses 3 different Lingo.dev SDK methods."
>
> "India has 900 million internet users speaking 22 languages. Translation is the first step. Localization is the destination. Lingo Bharat bridges that gap."
>
> "Thank you."

---

## Recording Checklist

- [ ] Terminal font size: 16pt+ (readable on video)
- [ ] Set `LINGODOTDEV_API_KEY` in environment before recording
- [ ] Run `pnpm reset` in demo app before recording
- [ ] Clear terminal before each command
- [ ] Have dashboard pre-built (`pnpm build`)
- [ ] Test full flow once before recording
- [ ] Keep a steady pace - don't rush commands, let output appear

## Key Points to Emphasize for Judges

1. **Lingo.dev SDK depth**: 3 methods used (recognizeLocale, localizeObject, localizeText)
2. **Complementary relationship**: Lingo.dev translates, Lingo Bharat validates quality
3. **Real problem**: India-specific localization gaps that no other tool catches
4. **Full pipeline**: CLI + CI/CD + Dashboard + Auto-fix
5. **Config compatibility**: Reads same i18n.json - zero friction for existing Lingo.dev users
