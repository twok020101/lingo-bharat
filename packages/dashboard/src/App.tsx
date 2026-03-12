import { useState, useEffect } from 'react';
import { BharatScoreCard } from './components/BharatScoreCard';
import { CheckBreakdown } from './components/CheckBreakdown';
import { CoverageBar } from './components/CoverageBar';
import { ViolationList } from './components/ViolationList';
import type { BharatReport } from './types';

// Try to load report from window (injected by serve command) or from URL param
function loadReport(): BharatReport | null {
  // Option 1: Injected by serve command via <script>
  const injected = (window as unknown as Record<string, unknown>).__BHARAT_REPORT__;
  if (injected) return injected as BharatReport;

  return null;
}

// Demo report for development / showcase
const DEMO_REPORT: BharatReport = {
  generatedAt: new Date().toISOString(),
  projectRoot: '/demo/paybharat',
  i18nConfigPath: '/demo/paybharat/i18n.json',
  sourceLocale: 'en',
  targetLocales: ['hi', 'ta', 'es'],
  indicLocales: ['hi', 'ta'],
  bharatReadinessScore: 62,
  grade: 'C',
  checks: [
    {
      checkId: 'number-format',
      name: 'Number Format',
      description: 'Detects international number formatting instead of Indian Lakh/Crore system',
      score: 75,
      maxScore: 25,
      violations: [
        {
          locale: 'hi',
          key: 'portfolio.total_value',
          message: 'International number format used instead of Indian Lakh/Crore system',
          severity: 'critical',
          found: '₹1,234,567',
          expected: '₹12,34,567 (use en-IN locale)',
          file: 'locales/hi.json',
          autoFix: {
            type: 'json-patch',
            patch: 'Replace ₹1,234,567 with ₹12,34,567',
            description: "Use Intl.NumberFormat('en-IN') for Indian number formatting",
          },
        },
      ],
      autoFixableCount: 1,
      passed: false,
    },
    {
      checkId: 'font-stack',
      name: 'Font Stack',
      description: 'Checks for Indic script font fallbacks in CSS',
      score: 50,
      maxScore: 20,
      violations: [
        {
          locale: 'hi',
          message: "No Devanagari font found in font stack for locale 'hi'",
          severity: 'critical',
          expected: 'Add one of: Noto Sans Devanagari, Hind, Poppins, Mukta',
          autoFix: {
            type: 'css-append',
            patch: '@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari")',
            description: 'Append Devanagari font imports to globals.css',
          },
        },
        {
          locale: 'ta',
          message: "No Tamil font found in font stack for locale 'ta'",
          severity: 'critical',
          expected: 'Add one of: Noto Sans Tamil, Latha, Tamil Sangam MN',
          autoFix: {
            type: 'css-append',
            patch: '@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil")',
            description: 'Append Tamil font imports to globals.css',
          },
        },
      ],
      autoFixableCount: 2,
      passed: false,
    },
    {
      checkId: 'formality-register',
      name: 'Formality Register',
      description: 'Scans Hindi translations for inappropriate tu-register pronouns',
      score: 40,
      maxScore: 20,
      violations: [
        {
          locale: 'hi',
          key: 'welcome.message',
          message: 'Tu-register pronoun "तू" detected — inappropriate for app UI',
          severity: 'high',
          found: 'तू',
          expected: 'Use aap-register: "आप"',
          file: 'locales/hi.json',
          autoFix: { type: 'lingo-sdk-retranslate', patch: {}, description: 'Re-translate with formal register via Lingo.dev SDK' },
        },
        {
          locale: 'hi',
          key: 'welcome.subtext',
          message: 'Tu-register pronoun "तेरा" detected — inappropriate for app UI',
          severity: 'high',
          found: 'तेरा',
          expected: 'Use aap-register: "आपका"',
          file: 'locales/hi.json',
          autoFix: { type: 'lingo-sdk-retranslate', patch: {}, description: 'Re-translate with formal register via Lingo.dev SDK' },
        },
        {
          locale: 'hi',
          key: 'transfer.confirm',
          message: 'Tu-register pronoun "तुझे" detected — inappropriate for app UI',
          severity: 'high',
          found: 'तुझे',
          expected: 'Use aap-register: "आपको"',
          file: 'locales/hi.json',
          autoFix: { type: 'lingo-sdk-retranslate', patch: {}, description: 'Re-translate with formal register via Lingo.dev SDK' },
        },
      ],
      autoFixableCount: 3,
      passed: false,
    },
    {
      checkId: 'string-overflow',
      name: 'String Overflow',
      description: 'Identifies translated strings that may overflow fixed-width UI containers',
      score: 95,
      maxScore: 15,
      violations: [
        {
          locale: 'ta',
          key: 'nav.settings',
          message: 'String is 363% wider than English (expected max: 188%)',
          severity: 'medium',
          found: '"அமைப்புகள் மற்றும் விருப்பத்தேர்வுகள்" (37 chars, ratio: 4.6x)',
          expected: 'Max ratio for ta: 2.9x (2.4x multiplier × 1.2 threshold)',
          file: 'locales/ta.json',
        },
      ],
      autoFixableCount: 0,
      passed: false,
    },
    {
      checkId: 'coverage',
      name: 'Coverage',
      description: 'Measures percentage of Indian internet users reached by supported locales',
      score: 54,
      maxScore: 20,
      violations: [
        {
          locale: 'all',
          message: 'Current coverage: 44.9% of Indian internet users (Hindi, Tamil)',
          severity: 'medium',
          found: '2 Indic locale(s): 44.9% coverage',
          expected: 'Add Bengali, Telugu, Marathi',
          autoFix: { type: 'i18n-config-patch', patch: {}, description: 'Add bn, te, mr to i18n.json targets' },
        },
      ],
      autoFixableCount: 1,
      passed: false,
    },
  ],
  coverageSummary: {
    currentCoveragePercent: 44.9,
    coveredLocales: ['hi', 'ta'],
    topRecommendations: [
      { locale: 'bn', language: 'Bengali', percentageGain: 8, newTotalAfterAdding: 52.9, effortLevel: 'MEDIUM' },
      { locale: 'te', language: 'Telugu', percentageGain: 7, newTotalAfterAdding: 51.9, effortLevel: 'MEDIUM' },
      { locale: 'mr', language: 'Marathi', percentageGain: 7, newTotalAfterAdding: 51.9, effortLevel: 'LOW' },
    ],
  },
  totalViolations: 12,
  autoFixableViolations: 11,
};

export function App() {
  const [report, setReport] = useState<BharatReport>(DEMO_REPORT);

  useEffect(() => {
    const loaded = loadReport();
    if (loaded) setReport(loaded);
  }, []);

  return (
    <div className="gradient-bg min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇮🇳</span>
            <div>
              <h1 className="text-xl font-bold text-white">Lingo Bharat</h1>
              <p className="text-xs text-slate-400">Indic Localization Readiness</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">
              {report.projectRoot.split('/').pop()}
            </span>
            <span className="text-xs text-slate-600">
              {new Date(report.generatedAt).toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Score card */}
        <BharatScoreCard
          score={report.bharatReadinessScore}
          grade={report.grade}
          totalViolations={report.totalViolations}
          autoFixableViolations={report.autoFixableViolations}
        />

        {/* Grid: Checks + Coverage */}
        <div className="grid md:grid-cols-2 gap-6">
          <CheckBreakdown checks={report.checks} />
          <CoverageBar
            currentCoveragePercent={report.coverageSummary.currentCoveragePercent}
            coveredLocales={report.coverageSummary.coveredLocales}
            recommendations={report.coverageSummary.topRecommendations}
          />
        </div>

        {/* Violations */}
        <ViolationList checks={report.checks} />

        {/* Footer */}
        <footer className="text-center py-8 text-slate-600 text-xs">
          <p>Built with ❤️ for the Lingo.dev Hackathon • Powered by Lingo.dev SDK</p>
          <p className="mt-1">Run <code className="text-bharat-500">npx lingo-bharat fix</code> to auto-remediate {report.autoFixableViolations} violations</p>
        </footer>
      </main>
    </div>
  );
}
