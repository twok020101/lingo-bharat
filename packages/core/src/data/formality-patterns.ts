// packages/core/src/data/formality-patterns.ts

/**
 * Unicode-aware "word boundary" for Devanagari text.
 * JavaScript's \b doesn't work with Unicode chars, so we use
 * lookahead/lookbehind for non-Devanagari or string boundaries.
 *
 * Devanagari range: \u0900-\u097F
 */
const B_START = '(?<![\\u0900-\\u097F])'; // Not preceded by Devanagari
const B_END = '(?![\\u0900-\\u097F])';   // Not followed by Devanagari

function devaPattern(word: string): RegExp {
  return new RegExp(`${B_START}${word}${B_END}`, 'gu');
}

// Tu-register patterns — inappropriate for app UIs
export const TU_REGISTER_PATTERNS = {
  // Direct pronouns (tu-form)
  pronouns: [
    devaPattern('तू'),           // tu
    devaPattern('तुझे'),         // tujhe (to you - tu form)
    devaPattern('तेरा'),         // tera (your - tu form, masculine)
    devaPattern('तेरी'),         // teri (your - tu form, feminine)
    devaPattern('तेरे'),         // tere (your - tu form, plural/oblique)
    devaPattern('तुझसे'),        // tujhse (from you - tu form)
    devaPattern('तुझमें'),       // tujhmein (in you - tu form)
  ],

  // Tu-conjugated verb forms (common in UI buttons/instructions)
  // These are simpler patterns — checking for isolated verb roots
  verbForms: [
    // "कर" alone (tu imperative) vs "करें" (aap form) — only flag the bare form
    /(?<![\\u0900-\\u097F])कर(?![\\u0900-\\u097Fें ो िए])/gu,
  ],
};

// Suggested aap-register replacements (pronoun fixes)
export const FORMALITY_REPLACEMENTS: Record<string, string> = {
  'तू': 'आप',
  'तुझे': 'आपको',
  'तेरा': 'आपका',
  'तेरी': 'आपकी',
  'तेरे': 'आपके',
  'तुझसे': 'आपसे',
  'तुझमें': 'आपमें',
};

/**
 * Apply direct pattern-based formality fix to a Hindi string.
 * Falls back to this when Lingo.dev SDK re-translation still uses tu-register.
 */
export function applyFormalityPatternFix(input: string): string {
  let result = input;
  for (const [tuForm, aapForm] of Object.entries(FORMALITY_REPLACEMENTS)) {
    result = result.replace(devaPattern(tuForm), aapForm);
  }
  return result;
}
