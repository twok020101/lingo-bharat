import type { LocaleRecommendation } from '../types';

interface CoverageBarProps {
  currentCoveragePercent: number;
  coveredLocales: string[];
  recommendations: LocaleRecommendation[];
}

const LOCALE_FLAGS: Record<string, string> = {
  hi: '🇮🇳',
  bn: '🇮🇳',
  te: '🇮🇳',
  mr: '🇮🇳',
  ta: '🇮🇳',
  gu: '🇮🇳',
  kn: '🇮🇳',
  ml: '🇮🇳',
  pa: '🇮🇳',
  or: '🇮🇳',
};

const LOCALE_NAMES: Record<string, string> = {
  hi: 'Hindi',
  bn: 'Bengali',
  te: 'Telugu',
  mr: 'Marathi',
  ta: 'Tamil',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  or: 'Odia',
};

const EFFORT_COLORS: Record<string, string> = {
  LOW: 'text-emerald-400 bg-emerald-400/10',
  MEDIUM: 'text-yellow-400 bg-yellow-400/10',
  HIGH: 'text-red-400 bg-red-400/10',
};

export function CoverageBar({ currentCoveragePercent, coveredLocales, recommendations }: CoverageBarProps) {
  return (
    <div className="glass-card p-6 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
      <h3 className="text-lg font-semibold text-white mb-4">🌍 Indian Market Coverage</h3>

      {/* Coverage progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">
            {coveredLocales.length} language{coveredLocales.length !== 1 ? 's' : ''} supported
          </span>
          <span className="text-xl font-bold text-bharat-500">
            {currentCoveragePercent}%
          </span>
        </div>
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-bharat-600 to-bharat-400 transition-all duration-1500 ease-out"
            style={{ width: `${Math.min(100, (currentCoveragePercent / 83.9) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-500">0%</span>
          <span className="text-xs text-slate-500">83.9% max (top 10 languages)</span>
        </div>
      </div>

      {/* Covered locales */}
      <div className="flex flex-wrap gap-2 mb-6">
        {coveredLocales.map(locale => (
          <span key={locale} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20">
            {LOCALE_FLAGS[locale.split('-')[0]] ?? '🏳️'} {LOCALE_NAMES[locale.split('-')[0]] ?? locale}
          </span>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">Top Recommendations</h4>
          <div className="space-y-2">
            {recommendations.map(rec => (
              <div key={rec.locale} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{LOCALE_FLAGS[rec.locale] ?? '🏳️'}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{rec.language}</p>
                    <p className="text-xs text-slate-400">+{rec.percentageGain}% users → {rec.newTotalAfterAdding}% total</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${EFFORT_COLORS[rec.effortLevel]}`}>
                  {rec.effortLevel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
