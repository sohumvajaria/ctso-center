import Link from 'next/link';

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white"
      style={{ background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 65%), #09090b' }}
    >
      {/* Logo mark */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-8"
        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)' }}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
          <polygon points="10,2 18,6 18,14 10,18 2,14 2,6" fill="rgba(165,180,252,0.9)" />
        </svg>
      </div>

      <h1 className="text-4xl font-bold tracking-tight text-white mb-3">CTSO Center</h1>
      <p className="text-white/40 text-base mb-10">AI-powered DECA roleplay practice</p>

      <div className="flex items-center gap-3">
        <Link
          href="/practice"
          className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all"
          style={{ background: 'rgba(99,102,241,1)', boxShadow: '0 0 24px rgba(99,102,241,0.4)' }}
        >
          Start Practicing
        </Link>
        <Link
          href="/scenarios"
          className="px-6 py-2.5 text-sm font-medium text-white/50 rounded-xl transition-colors hover:text-white"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Browse Scenarios
        </Link>
      </div>

      <p className="text-[11px] text-white/20 mt-10 tracking-wide uppercase">
        Principles of Business Management · 10 Scenarios
      </p>
    </div>
  );
}
