import { useState } from 'react';
import type { CheckResult, Violation } from '../types';

interface ViolationListProps {
  checks: CheckResult[];
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'severity-critical',
  high: 'severity-high',
  medium: 'severity-medium',
  info: 'severity-info',
};

type FilterSeverity = 'all' | 'critical' | 'high' | 'medium' | 'info';

export function ViolationList({ checks }: ViolationListProps) {
  const [filter, setFilter] = useState<FilterSeverity>('all');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const allViolations: (Violation & { checkName: string })[] = checks.flatMap(check =>
    check.violations.map(v => ({ ...v, checkName: check.name }))
  );

  const filtered = filter === 'all'
    ? allViolations
    : allViolations.filter(v => v.severity === filter);

  const severityCounts = {
    all: allViolations.length,
    critical: allViolations.filter(v => v.severity === 'critical').length,
    high: allViolations.filter(v => v.severity === 'high').length,
    medium: allViolations.filter(v => v.severity === 'medium').length,
    info: allViolations.filter(v => v.severity === 'info').length,
  };

  const filterButtons: { label: string; value: FilterSeverity; color: string }[] = [
    { label: 'All', value: 'all', color: 'text-slate-300 bg-slate-700/50' },
    { label: 'Critical', value: 'critical', color: 'text-red-400 bg-red-500/10' },
    { label: 'High', value: 'high', color: 'text-yellow-400 bg-yellow-500/10' },
    { label: 'Medium', value: 'medium', color: 'text-orange-400 bg-orange-500/10' },
    { label: 'Info', value: 'info', color: 'text-blue-400 bg-blue-500/10' },
  ];

  return (
    <div className="glass-card p-6 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Violations</h3>
        <span className="text-sm text-slate-400">{filtered.length} items</span>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filterButtons.map(btn => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === btn.value
                ? `${btn.color} ring-1 ring-white/20`
                : 'text-slate-500 bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            {btn.label} ({severityCounts[btn.value]})
          </button>
        ))}
      </div>

      {/* Violations list */}
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-4xl mb-2">✨</p>
            <p className="text-sm">No violations found!</p>
          </div>
        ) : (
          filtered.map((violation, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-800/40 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_STYLES[violation.severity]}`}>
                      {violation.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">{violation.checkName}</span>
                  </div>
                  <p className="text-sm text-slate-200 truncate">{violation.message}</p>
                  {violation.key && (
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{violation.key}</p>
                  )}
                </div>
                {violation.autoFix && (
                  <span className="text-xs text-emerald-400 whitespace-nowrap mt-1">🔧 fixable</span>
                )}
              </div>

              {/* Expanded details */}
              {expandedIdx === idx && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                  {violation.file && (
                    <div className="text-xs">
                      <span className="text-slate-500">File: </span>
                      <span className="text-slate-300 font-mono">
                        {violation.file.split('/').slice(-2).join('/')}
                        {violation.line ? `:${violation.line}` : ''}
                      </span>
                    </div>
                  )}
                  {violation.found && (
                    <div className="text-xs">
                      <span className="text-slate-500">Found: </span>
                      <span className="text-red-400 font-mono">"{violation.found}"</span>
                    </div>
                  )}
                  {violation.expected && (
                    <div className="text-xs">
                      <span className="text-slate-500">Expected: </span>
                      <span className="text-emerald-400">{violation.expected}</span>
                    </div>
                  )}
                  {violation.autoFix && (
                    <div className="text-xs bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                      <span className="text-emerald-400">💡 {violation.autoFix.description}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
