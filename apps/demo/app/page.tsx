"use client";

import { useState, type ReactNode } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Settings, Home, CreditCard } from 'lucide-react';

// Simplified translation loader for the demo
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import ta from '../locales/ta.json';

type TranslationMap = Record<string, string>;
const translations: Record<string, TranslationMap> = { en, hi, ta };

export default function DemoPage() {
  const [lang, setLang] = useState('en');
  const t: TranslationMap = translations[lang] ?? en;

  return (
    <div className="min-h-screen bg-[#0f0f23] text-[#e2e8f0]">
      {/* Navbar with potential overflow */}
      <nav className="flex gap-4 p-4 border-b border-[#1e293b] sticky top-0 bg-[#0f0f23]/80 backdrop-blur-sm z-50">
        <div className="flex items-center gap-2 mr-auto font-bold text-indigo-400">
          <Wallet size={24} />
          <span>PayBharat</span>
        </div>
        
        {/* Navigation items - fixed width to showcase Tamil overflow */}
        <div className="flex gap-2">
          <NavItem icon={<Home size={18} />} label={t['nav.home']} />
          <NavItem icon={<CreditCard size={18} />} label={t['nav.portfolio']} />
          <NavItem icon={<ArrowUpRight size={18} />} label={t['nav.transfer']} />
          <NavItem icon={<Settings size={18} />} label={t['nav.settings']} />
        </div>

        {/* Locale Switcher */}
        <select 
          className="bg-[#1e293b] text-xs px-2 py-1 rounded border border-[#334155]"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          <option value="en">English (US)</option>
          <option value="hi">हिंदी (Hindi)</option>
          <option value="ta">தமிழ் (Tamil)</option>
        </select>
      </nav>

      <main className="max-w-md mx-auto p-6 space-y-6">
        {/* Welcome Section - will show formality issues in Hindi */}
        <section className="space-y-1">
          <h1 className="text-2xl font-bold text-white">{t['welcome.message']}</h1>
          <p className="text-slate-400 text-sm">{t['welcome.subtext']}</p>
        </section>

        {/* Portfolio Card - will show number format issues in Hindi */}
        <div className="bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={80} />
          </div>
          
          <div className="relative z-10">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
              {t['portfolio.title']}
            </p>
            <h2 className="text-3xl font-bold text-white mb-2">
              {t['portfolio.total_value']}
            </h2>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <span className="bg-emerald-400/10 px-2 py-0.5 rounded">
                {t['portfolio.daily_gain']}
              </span>
              <span className="text-slate-500">•</span>
              <span>{t['portfolio.monthly_return']}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <ActionButton 
            icon={<ArrowUpRight className="text-emerald-400" />} 
            label={t['transfer.button']} 
          />
          <ActionButton 
            icon={<ArrowDownLeft className="text-indigo-400" />} 
            label="Request" 
          />
        </div>

        {/* Recent Activity */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">
            {t['transactions.title']}
          </h3>
          <div className="space-y-3">
            <TransactionItem name="Rajesh" amount="₹2,500.00" type="sent" t={t} />
            <TransactionItem name="Amrita" amount="₹50,000.00" type="received" t={t} />
            <TransactionItem name="Kshitij" amount="₹1,200.00" type="sent" t={t} />
          </div>
        </section>

        {/* Error States - showcasing more formality issues */}
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {t['error.network']}
          </p>
        </div>
      </main>

      {/* Footer Instructions */}
      <footer className="max-w-md mx-auto px-6 py-8 text-center">
        <p className="text-xs text-slate-600 italic">
          Try switching to Tamil to see the navbar items overflow, 
          or Hindi to see the informal &quot;tu&quot; register and international number system violations.
        </p>
      </footer>
    </div>
  );
}

function NavItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 group cursor-pointer w-[60px]">
      <div className="p-1.5 rounded-lg bg-slate-800/50 group-hover:bg-slate-800 transition-colors">
        {icon}
      </div>
      {/* MAX-WIDTH TO SHOWCASE OVERFLOW IN TAMIL */}
      <span className="text-[9px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
        {label}
      </span>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-3 p-4 bg-[#252542] hover:bg-[#2d2d50] rounded-2xl border border-white/5 transition-all text-left group">
      <div className="p-2 bg-[#1a1a35] rounded-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-xs font-bold text-white leading-tight max-w-[80px] line-clamp-2">
        {label}
      </span>
    </button>
  );
}

function TransactionItem({ name, amount, type, t }: { name: string; amount: string; type: 'sent' | 'received'; t: TranslationMap }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'sent' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
          {name[0]}
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {type === 'sent' ? t['transactions.sent']?.replace('{name}', name) : t['transactions.received']?.replace('{name}', name)}
          </p>
          <p className="text-[10px] text-slate-500 tracking-wide uppercase">Today, 2:45 PM</p>
        </div>
      </div>
      <p className={`text-sm font-mono font-bold ${type === 'sent' ? 'text-slate-300' : 'text-emerald-400'}`}>
        {type === 'sent' ? '-' : '+'}{amount}
      </p>
    </div>
  );
}
