import Link from 'next/link';
import { SCENARIOS } from '@/lib/scenarios';

const CATEGORY_ORDER = [
  'Marketing',
  'Finance',
  'Retail',
  'Operations',
  'Hospitality',
  'Human Resources',
  'Strategy',
  'Ethics',
];

const CATEGORY_META: Record<string, { textClass: string; bg: string; border: string; dot: string }> = {
  Marketing:        { textClass: 'text-rose-400',    bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)',    dot: '#fb7185' },
  Finance:          { textClass: 'text-emerald-400', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',   dot: '#34d399' },
  Retail:           { textClass: 'text-orange-400',  bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)',   dot: '#fb923c' },
  Operations:       { textClass: 'text-sky-400',     bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.2)',   dot: '#38bdf8' },
  Hospitality:      { textClass: 'text-teal-400',    bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.2)',   dot: '#2dd4bf' },
  'Human Resources':{ textClass: 'text-violet-400',  bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)',   dot: '#a78bfa' },
  Strategy:         { textClass: 'text-indigo-400',  bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)',   dot: '#818cf8' },
  Ethics:           { textClass: 'text-slate-400',   bg: 'rgba(100,116,139,0.08)',border: 'rgba(100,116,139,0.2)', dot: '#94a3b8' },
};

const grouped = CATEGORY_ORDER.reduce<Record<string, typeof SCENARIOS>>((acc, cat) => {
  const matches = SCENARIOS.filter((s) => s.category === cat);
  if (matches.length) acc[cat] = matches;
  return acc;
}, {});

export default function ScenariosPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'radial-gradient(ellipse 80% 35% at 50% 0%, rgba(99,102,241,0.13) 0%, transparent 65%), #09090b' }}
    >
      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 backdrop-blur-xl"
        style={{ background: 'rgba(9,9,11,0.88)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)' }}
            >
              <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
                <polygon points="7,1 13,4 13,10 7,13 1,10 1,4" fill="rgba(165,180,252,0.9)" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white/90">CTSO Center</span>
          </Link>

          <nav className="flex items-center gap-1">
            <span
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-indigo-400"
              style={{ background: 'rgba(99,102,241,0.1)' }}
            >
              Scenarios
            </span>
            <Link
              href="/practice"
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-white/40 hover:text-white transition-colors"
            >
              Practice
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-400/60 mb-3">
          DECA · Principles of Business Management
        </p>
        <h1 className="text-3xl font-bold text-white mb-3">Scenario Library</h1>
        <p className="text-sm text-white/40 leading-7">
          {SCENARIOS.length} roleplay scenarios across {CATEGORY_ORDER.filter((c) => grouped[c]).length} business categories.
          Click any card to start a timed practice session.
        </p>
      </div>

      {/* ── Scenario sections ───────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-6 pb-20 space-y-12">
        {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((category) => {
          const meta = CATEGORY_META[category];
          const scenarios = grouped[category];

          return (
            <section key={category}>
              {/* Category header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: meta.dot, boxShadow: `0 0 6px ${meta.dot}` }}
                  />
                  <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${meta.textClass}`}>
                    {category}
                  </span>
                </div>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                <span className="text-[11px] text-white/20 tabular-nums">
                  {scenarios.length} {scenarios.length === 1 ? 'scenario' : 'scenarios'}
                </span>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scenarios.map((scenario) => (
                  <Link
                    key={scenario.id}
                    href={`/practice?scenario=${scenario.id}`}
                    className="group block rounded-2xl p-5 transition-all duration-200 hover:bg-white/[0.04]"
                    style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                  >
                    {/* Category badge */}
                    <div className="mb-4">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${meta.textClass}`}
                        style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
                      >
                        {category}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-white/90 leading-snug mb-4 group-hover:text-white transition-colors">
                      {scenario.title}
                    </h3>

                    {/* PI list */}
                    <div className="space-y-2 mb-5">
                      {scenario.pi_list.map((pi) => (
                        <div key={pi.pi_number} className="flex items-start gap-2.5">
                          <span
                            className="shrink-0 w-4 h-4 rounded text-[9px] font-bold text-white/30 flex items-center justify-center mt-0.5"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            {pi.pi_number}
                          </span>
                          <p className="text-[11px] text-white/40 leading-5">{pi.description}</p>
                        </div>
                      ))}
                    </div>

                    {/* Footer CTA */}
                    <div
                      className="flex items-center justify-between pt-3.5"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <span className={`text-[11px] font-medium text-white/25 group-hover:${meta.textClass} transition-colors`}>
                        Start practicing
                      </span>
                      <svg
                        className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
