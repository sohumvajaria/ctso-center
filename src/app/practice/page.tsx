'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { type Scenario, SCENARIOS, getRandomScenario } from '@/lib/scenarios';

interface PiScore {
  pi_number: number;
  score: number;
  feedback: string;
}

interface JudgeResult {
  pi_scores: PiScore[];
  follow_up_question: string;
  overall_feedback: string;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionHistoryItem {
  id: string;
  scenario_title: string;
  created_at: string;
  avg_score: number | null;
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Does not address',
  2: 'Below expectations',
  3: 'Partial',
  4: 'Meets expectations',
  5: 'Exceeds expectations',
};

const PREP_DURATION = 600;
const PRESENT_DURATION = 600;

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function timerColors(secondsLeft: number, done: boolean) {
  if (done || secondsLeft <= 60) return { text: 'text-red-400', ring: '#f87171' };
  if (secondsLeft <= 120) return { text: 'text-amber-400', ring: '#fbbf24' };
  return { text: 'text-white', ring: 'rgba(255,255,255,0.85)' };
}

interface TimerProps {
  label: string;
  secondsLeft: number;
  total: number;
  started: boolean;
  done: boolean;
}

function CompetitionTimer({ label, secondsLeft, total, started, done }: TimerProps) {
  const SIZE = 84;
  const STROKE = 2.5;
  const R = (SIZE - STROKE * 2) / 2;
  const C = 2 * Math.PI * R;
  const dashOffset = done ? C : C * (1 - secondsLeft / total);
  const { text, ring } = timerColors(secondsLeft, done);
  const dim = !started && !done;

  return (
    <div className={`flex flex-col items-center gap-2 transition-opacity duration-500 ${dim ? 'opacity-20' : 'opacity-100'}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">{label}</p>
      <div className="relative">
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={STROKE}
          />
          {/* Progress arc */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke={ring}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {started || done ? (
            <span className={`font-mono text-[15px] font-bold tabular-nums leading-none ${text}`}>
              {formatTime(secondsLeft)}
            </span>
          ) : (
            <span className="font-mono text-[15px] font-bold tabular-nums leading-none text-white/20">
              --:--
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function scoreBadgeClass(score: number): string {
  if (score >= 4) return 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30';
  if (score === 3) return 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30';
  return 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30';
}

function scoreBarClass(score: number): string {
  if (score >= 4) return 'bg-emerald-500';
  if (score === 3) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function PracticePage() {
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);

  useEffect(() => {
    setScenario(getRandomScenario());
  }, []);

  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [round, setRound] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  async function fetchHistory() {
    const res = await fetch('/api/session');
    if (res.ok) {
      const data = await res.json();
      setSessionHistory(data.sessions ?? []);
    }
    setHistoryLoading(false);
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  // Timers
  const [prepLeft, setPrepLeft] = useState(PREP_DURATION);
  const [prepDone, setPrepDone] = useState(false);
  const [presentLeft, setPresentLeft] = useState(PRESENT_DURATION);
  const [presentStarted, setPresentStarted] = useState(false);
  const [presentDone, setPresentDone] = useState(false);
  const prepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presentRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Prep timer: starts immediately on mount
  useEffect(() => {
    prepRef.current = setInterval(() => {
      setPrepLeft((t) => {
        if (t <= 1) {
          clearInterval(prepRef.current!);
          setPrepDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (prepRef.current) clearInterval(prepRef.current);
    };
  }, []);

  function startPresentationTimer() {
    if (presentStarted) return;
    setPresentStarted(true);
    presentRef.current = setInterval(() => {
      setPresentLeft((t) => {
        if (t <= 1) {
          clearInterval(presentRef.current!);
          setPresentDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!response.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: scenario.body,
          pi_list: scenario.pi_list,
          student_response: response,
          conversation_history: history,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }

      const data: JudgeResult = await res.json();
      setResult(data);

      setHistory((prev) => [
        ...prev,
        { role: 'user', content: response },
        { role: 'assistant', content: JSON.stringify(data) },
      ]);

      const saveRes = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: scenario.id,
          session_id: sessionId,
          round,
          pi_scores: data.pi_scores,
        }),
      });
      if (saveRes.ok) {
        const saveData = await saveRes.json();
        setSessionId(saveData.session_id);
        fetchHistory();
      }

      if (round === 1) startPresentationTimer();
      setRound((r) => r + 1);
      setResponse('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleNewScenario() {
    setScenario(getRandomScenario(scenario.id));
    setResult(null);
    setHistory([]);
    setResponse('');
    setError('');
    setRound(1);
    setSessionId(null);
  }

  function handleReset() {
    setResult(null);
    setHistory([]);
    setResponse('');
    setError('');
    setRound(1);
    setSessionId(null);
  }

  const avgScore = result
    ? Math.round((result.pi_scores.reduce((s, p) => s + p.score, 0) / result.pi_scores.length) * 10) / 10
    : null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sticky header with nav + timers */}
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6">
          {/* Nav row */}
          <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-white/50 hover:text-white transition-colors"
            >
              CTSO Center
            </Link>
            <div className="flex items-center gap-3">
              {round > 1 && (
                <span className="text-xs text-white/30">Round {round - 1} complete</span>
              )}
              <button
                onClick={handleNewScenario}
                className="px-3 py-1.5 text-xs font-medium border border-white/15 rounded-md text-white/50 hover:text-white hover:border-white/30 transition-colors"
              >
                New Scenario
              </button>
            </div>
          </div>

          {/* Timer row */}
          <div className="flex items-center justify-center gap-16 py-4">
            <CompetitionTimer
              label="Prep Time"
              secondsLeft={prepLeft}
              total={PREP_DURATION}
              started={true}
              done={prepDone}
            />
            <div className="h-14 w-px bg-white/[0.08]" />
            <CompetitionTimer
              label="Presentation"
              secondsLeft={presentLeft}
              total={PRESENT_DURATION}
              started={presentStarted}
              done={presentDone}
            />
          </div>
        </div>
      </header>

      {/* Prep time up banner */}
      {prepDone && !presentStarted && (
        <div className="border-b border-amber-500/20 bg-amber-500/[0.07] px-6 py-3">
          <p className="text-center text-sm font-medium text-amber-300 tracking-wide">
            Prep time is up — begin your presentation.
          </p>
        </div>
      )}

      {/* Presentation time up banner */}
      {presentDone && (
        <div className="border-b border-red-500/20 bg-red-500/[0.07] px-6 py-3">
          <p className="text-center text-sm font-medium text-red-300 tracking-wide">
            Presentation time is up.
          </p>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Scenario card */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-3">
            Scenario — Principles of Business Management
          </p>
          <h2 className="text-lg font-semibold text-white mb-3">{scenario.title}</h2>
          <p className="text-sm text-white/60 leading-relaxed">{scenario.body}</p>
        </div>

        {/* PI list */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-4">
            Performance Indicators
          </p>
          <ol className="space-y-2.5">
            {scenario.pi_list.map((pi) => (
              <li key={pi.pi_number} className="flex gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 text-white/40 text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {pi.pi_number}
                </span>
                <span className="text-white/60">{pi.description}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Judge follow-up */}
        {result?.follow_up_question && (
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.06] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-400/60 mb-2">
              Judge Follow-up · Round {round - 1}
            </p>
            <p className="text-sm text-white/75 leading-relaxed">{result.follow_up_question}</p>
          </div>
        )}

        {/* Response form */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <label className="block text-sm font-medium text-white/60">
            {round === 1 ? 'Your response' : `Follow-up response · Round ${round}`}
          </label>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={6}
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/25 focus:border-white/25 transition-colors resize-none disabled:opacity-40"
              placeholder="Type your response here…"
              disabled={loading}
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !response.trim()}
                className="px-5 py-2 bg-white text-black text-sm font-medium rounded-lg disabled:opacity-30 hover:bg-gray-100 transition-colors"
              >
                {loading ? 'Evaluating…' : 'Submit Response'}
              </button>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 border border-white/15 text-sm text-white/50 rounded-lg hover:text-white hover:border-white/30 transition-colors"
                >
                  Start over
                </button>
              )}
            </div>
          </form>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Evaluation results */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/70">
                Evaluation · Round {round - 1}
              </h3>
              {avgScore !== null && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreBadgeClass(avgScore)}`}>
                  Avg {avgScore} / 5
                </span>
              )}
            </div>

            <div className="space-y-3">
              {result.pi_scores.map((pi) => (
                <div key={pi.pi_number} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 text-white/40 text-[11px] font-bold flex items-center justify-center">
                        {pi.pi_number}
                      </span>
                      <span className="text-xs text-white/45 truncate">
                        {scenario.pi_list.find((p) => p.pi_number === pi.pi_number)?.description}
                      </span>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${scoreBadgeClass(pi.score)}`}>
                      {pi.score}/5 · {SCORE_LABELS[pi.score]}
                    </span>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-1 mb-3">
                    <div
                      className={`h-1 rounded-full transition-all duration-700 ${scoreBarClass(pi.score)}`}
                      style={{ width: `${(pi.score / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/45 leading-relaxed">{pi.feedback}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2">
                Overall Feedback
              </p>
              <p className="text-sm text-white/65 leading-relaxed">{result.overall_feedback}</p>
            </div>
          </div>
        )}
      </main>

      {/* Performance history */}
      <section className="max-w-2xl mx-auto px-6 pb-16">
        <div className="border-t border-white/[0.06] pt-10">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-5">
            Practice History
          </h3>

          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : sessionHistory.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-8">
              No practice sessions yet. Complete a round to see your history.
            </p>
          ) : (
            <div className="space-y-2">
              {sessionHistory.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{s.scenario_title}</p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {new Date(s.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {s.avg_score !== null ? (
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${scoreBadgeClass(s.avg_score)}`}>
                      {s.avg_score} / 5
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-white/25">—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
