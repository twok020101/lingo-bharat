import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

interface BharatScoreCardProps {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  totalViolations: number;
  autoFixableViolations: number;
}

const GRADE_COLORS: Record<string, { primary: string; trail: string; glow: string }> = {
  A: { primary: '#22c55e', trail: '#22c55e15', glow: 'glow-green' },
  B: { primary: '#84cc16', trail: '#84cc1615', glow: 'glow-lime' },
  C: { primary: '#eab308', trail: '#eab30815', glow: 'glow-yellow' },
  D: { primary: '#f97316', trail: '#f9731615', glow: 'glow-orange' },
  F: { primary: '#ef4444', trail: '#ef444415', glow: 'glow-red' },
};

const GRADE_LABELS: Record<string, string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Needs Work',
  D: 'Poor',
  F: 'Critical',
};

export function BharatScoreCard({ score, grade, totalViolations, autoFixableViolations }: BharatScoreCardProps) {
  const colors = GRADE_COLORS[grade] ?? GRADE_COLORS.C;

  return (
    <div className={`glass-card p-8 animate-fadeInUp ${colors.glow}`}>
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Circular score */}
        <div className="w-48 h-48 animate-countUp">
          <CircularProgressbar
            value={score}
            text={`${score}`}
            styles={buildStyles({
              textSize: '28px',
              textColor: colors.primary,
              pathColor: colors.primary,
              trailColor: colors.trail,
              pathTransitionDuration: 1.5,
            })}
          />
        </div>

        {/* Score details */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
            <h2 className="text-2xl font-bold text-white">Bharat Readiness Score</h2>
            <span
              className="px-3 py-1 rounded-full text-sm font-bold"
              style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
            >
              Grade {grade}
            </span>
          </div>
          <p className="text-slate-400 mb-4" style={{ color: colors.primary }}>
            {GRADE_LABELS[grade]}
          </p>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="glass-card p-4 text-center">
              <p className="text-3xl font-bold text-white">{totalViolations}</p>
              <p className="text-xs text-slate-400 mt-1">Total Violations</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-3xl font-bold text-emerald-400">{autoFixableViolations}</p>
              <p className="text-xs text-slate-400 mt-1">Auto-fixable</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
