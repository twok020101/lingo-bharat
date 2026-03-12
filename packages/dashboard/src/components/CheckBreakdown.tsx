import type { CheckResult } from '../types';

interface CheckBreakdownProps {
  checks: CheckResult[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-yellow-500',
  medium: 'bg-orange-500',
  info: 'bg-blue-500',
  passed: 'bg-emerald-500',
};

const CHECK_ICONS: Record<string, string> = {
  'number-format': '🔢',
  'font-stack': '🔤',
  'formality-register': '🗣️',
  'string-overflow': '📏',
  'coverage': '🌍',
};

function getHighestSeverity(check: CheckResult): string {
  if (check.passed) return 'passed';
  const order = ['critical', 'high', 'medium', 'info'];
  for (const severity of order) {
    if (check.violations.some(v => v.severity === severity)) {
      return severity;
    }
  }
  return 'info';
}

export function CheckBreakdown({ checks }: CheckBreakdownProps) {
  return (
    <div className="glass-card p-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
      <h3 className="text-lg font-semibold text-white mb-4">Check Breakdown</h3>
      <div className="space-y-3">
        {checks.map((check) => {
          const severity = getHighestSeverity(check);
          const barWidth = Math.max(5, check.score);
          const icon = CHECK_ICONS[check.checkId] ?? '📋';

          return (
            <div key={check.checkId} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm font-medium text-slate-200">{check.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full severity-${severity}`}>
                    {check.passed ? 'PASS' : severity.toUpperCase()}
                  </span>
                  <span className="text-sm font-mono text-slate-400">
                    {check.score}/100
                  </span>
                </div>
              </div>

              {/* Score bar */}
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${SEVERITY_COLORS[severity]}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Violation summary on hover */}
              {check.violations.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {check.violations.length} violation{check.violations.length !== 1 ? 's' : ''}
                  {check.autoFixableCount > 0 && (
                    <span className="text-emerald-500 ml-1">
                      ({check.autoFixableCount} auto-fixable)
                    </span>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
