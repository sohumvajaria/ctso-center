'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { type Scenario, SCENARIOS, getRandomScenario } from '@/lib/scenarios';
import { EXEMPLARS } from '@/lib/exemplars';

declare global {
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

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

interface WeaknessData {
  pi_description: string;
  avg_score: number;
  recommended_scenarios: { id: string; title: string; category: string }[];
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
  return { text: 'text-indigo-300', ring: '#a5b4fc' };
}

function scoreBadgeClass(score: number): string {
  if (score >= 4) return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25';
  if (score === 3) return 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/25';
  return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/25';
}

function scoreBarClass(score: number): string {
  if (score >= 4) return 'bg-emerald-500';
  if (score === 3) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreTextClass(score: number): string {
  if (score >= 4) return 'text-emerald-400';
  if (score === 3) return 'text-amber-400';
  return 'text-red-400';
}

function scoreGlow(score: number): string {
  if (score >= 4) return '0 0 12px rgba(52,211,153,0.35)';
  if (score === 3) return '0 0 12px rgba(251,191,36,0.35)';
  return '0 0 12px rgba(248,113,113,0.35)';
}

interface TimerProps {
  label: string;
  secondsLeft: number;
  total: number;
  started: boolean;
  done: boolean;
}

function CompetitionTimer({ label, secondsLeft, total, started, done }: TimerProps) {
  const SIZE = 88;
  const STROKE = 2;
  const R = (SIZE - STROKE * 2) / 2;
  const C = 2 * Math.PI * R;
  const dashOffset = done ? C : C * (1 - secondsLeft / total);
  const { text, ring } = timerColors(secondsLeft, done);
  const dim = !started && !done;

  return (
    <div className={`flex flex-col items-center gap-2 transition-all duration-700 ${dim ? 'opacity-20' : 'opacity-100'}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">{label}</p>
      <div className="relative">
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke={ring}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s ease', filter: `drop-shadow(0 0 4px ${ring}60)` }}
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

export default function PracticePage() {
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scenarioId = params.get('scenario');
    if (scenarioId) {
      const found = SCENARIOS.find((s) => s.id === scenarioId);
      setScenario(found ?? getRandomScenario());
    } else {
      setScenario(getRandomScenario());
    }
  }, []);

  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [round, setRound] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [weakness, setWeakness] = useState<WeaknessData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Voice input
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTextRef = useRef('');
  const finalsSoFarRef = useRef('');

  async function fetchHistory() {
    const res = await fetch('/api/session');
    if (res.ok) {
      const data = await res.json();
      setSessionHistory(data.sessions ?? []);
      setWeakness(data.weakness ?? null);
    }
    setHistoryLoading(false);
  }

  useEffect(() => { fetchHistory(); }, []);

  useEffect(() => {
    setSpeechSupported(!!(window.SpeechRecognition ?? window.webkitSpeechRecognition));
    return () => { recognitionRef.current?.stop(); };
  }, []);

  // Timers
  const [prepLeft, setPrepLeft] = useState(PREP_DURATION);
  const [prepDone, setPrepDone] = useState(false);
  const [presentLeft, setPresentLeft] = useState(PRESENT_DURATION);
  const [presentStarted, setPresentStarted] = useState(false);
  const [presentDone, setPresentDone] = useState(false);
  const prepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presentRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    prepRef.current = setInterval(() => {
      setPrepLeft((t) => {
        if (t <= 1) { clearInterval(prepRef.current!); setPrepDone(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (prepRef.current) clearInterval(prepRef.current); };
  }, []);

  function startPresentationTimer() {
    if (presentStarted) return;
    setPresentStarted(true);
    presentRef.current = setInterval(() => {
      setPresentLeft((t) => {
        if (t <= 1) { clearInterval(presentRef.current!); setPresentDone(true); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  function startRecording() {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    baseTextRef.current = response.trimEnd();
    finalsSoFarRef.current = '';

    recognition.onresult = (event) => {
      let newFinals = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinals += text;
        } else {
          interim += text;
        }
      }

      if (newFinals) finalsSoFarRef.current += ' ' + newFinals;

      const prefix = baseTextRef.current ? baseTextRef.current + ' ' : '';
      setResponse((prefix + finalsSoFarRef.current + (interim ? ' ' + interim : '')).trim());
    };

    recognition.onerror = () => { setIsRecording(false); };
    recognition.onend = () => { setIsRecording(false); };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }

  function toggleRecording() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!response.trim()) return;
    if (isRecording) stopRecording();
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
    setResult(null); setHistory([]); setResponse('');
    setError(''); setRound(1); setSessionId(null);
  }

  function handleReset() {
    setResult(null); setHistory([]); setResponse('');
    setError(''); setRound(1); setSessionId(null);
  }

  const avgScore = result
    ? Math.round((result.pi_scores.reduce((s, p) => s + p.score, 0) / result.pi_scores.length) * 10) / 10
    : null;

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'radial-gradient(ellipse 80% 35% at 50% 0%, rgba(99,102,241,0.13) 0%, transparent 65%), #09090b' }}
    >
      {/* ── Sticky header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-20 backdrop-blur-xl" style={{ background: 'rgba(9,9,11,0.88)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Nav row */}
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)' }}>
              <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
                <polygon points="7,1 13,4 13,10 7,13 1,10 1,4" fill="rgba(165,180,252,0.9)" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white/90">CTSO Center</span>
          </Link>

          {/* Nav + actions */}
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1">
              <Link
                href="/scenarios"
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-white/40 hover:text-white transition-colors"
              >
                Scenarios
              </Link>
              <span className="text-xs font-medium px-3 py-1.5 rounded-lg text-indigo-400" style={{ background: 'rgba(99,102,241,0.1)' }}>
                Practice
              </span>
            </nav>
            <div className="w-px h-4 bg-white/[0.08]" />
            {round > 1 && (
              <span className="text-xs text-white/25 tabular-nums">Round {round - 1}</span>
            )}
            <button
              onClick={handleNewScenario}
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-white/45 transition-all hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              New Scenario
            </button>
          </div>
        </div>

        {/* Timer row */}
        <div className="flex items-center justify-center gap-20 py-5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <CompetitionTimer label="Prep Time" secondsLeft={prepLeft} total={PREP_DURATION} started={true} done={prepDone} />
          <div className="h-16 w-px" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)' }} />
          <CompetitionTimer label="Presentation" secondsLeft={presentLeft} total={PRESENT_DURATION} started={presentStarted} done={presentDone} />
        </div>
      </header>

      {/* ── Alert banners ───────────────────────────────────────── */}
      {prepDone && !presentStarted && (
        <div className="px-6 py-3.5 text-center" style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.18)' }}>
          <p className="text-sm font-medium text-amber-300/90 tracking-wide">
            Prep time is up — begin your presentation.
          </p>
        </div>
      )}
      {presentDone && (
        <div className="px-6 py-3.5 text-center" style={{ background: 'rgba(239,68,68,0.07)', borderBottom: '1px solid rgba(239,68,68,0.18)' }}>
          <p className="text-sm font-medium text-red-300/90 tracking-wide">
            Presentation time is up.
          </p>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-4">

        {/* Scenario card */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(to right, rgba(99,102,241,0.07), transparent)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ color: 'rgba(165,180,252,0.8)', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              DECA
            </span>
            <span className="text-[10px] text-white/25">·</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">
              Principles of Business Management
            </span>
          </div>
          <div className="px-6 py-6" style={{ background: 'rgba(255,255,255,0.015)' }}>
            <h2 className="text-xl font-semibold text-white mb-3 leading-snug">{scenario.title}</h2>
            <p className="text-sm text-white/55 leading-7">{scenario.body}</p>
          </div>
        </div>

        {/* PI list */}
        <div className="rounded-2xl px-6 py-6" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.018)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25 mb-5">
            Performance Indicators
          </p>
          <div className="space-y-3.5">
            {scenario.pi_list.map((pi) => (
              <div key={pi.pi_number} className="flex items-start gap-4">
                <div className="shrink-0 w-6 h-6 rounded-md text-[11px] font-bold text-white/35 flex items-center justify-center mt-0.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {pi.pi_number}
                </div>
                <p className="text-sm text-white/60 leading-6">{pi.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Judge follow-up */}
        {result?.follow_up_question && (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.05)' }}>
            <div className="px-6 py-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.28)' }}>
                  <svg viewBox="0 0 10 10" width="9" height="9" fill="none">
                    <circle cx="5" cy="3.5" r="1.5" fill="rgba(165,180,252,0.8)" />
                    <path d="M2 8c0-1.657 1.343-3 3-3s3 1.343 3 3" stroke="rgba(165,180,252,0.8)" strokeWidth="1" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/60">
                  Judge's Follow-up · Round {round - 1}
                </span>
              </div>
              <p className="text-sm text-white/80 leading-7">{result.follow_up_question}</p>
            </div>
          </div>
        )}

        {/* Response form */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">
              {round === 1 ? 'Your Response' : `Follow-up Response · Round ${round}`}
            </p>
          </div>
          <div className="p-5" style={{ background: 'rgba(255,255,255,0.015)' }}>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Textarea with mic button overlay */}
              <div className="relative">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={6}
                  className="w-full bg-transparent px-1 py-1 text-sm text-white/90 placeholder-white/18 focus:outline-none resize-none leading-7"
                  style={{
                    caretColor: 'rgba(165,180,252,0.9)',
                    paddingRight: speechSupported ? '2.5rem' : undefined,
                  }}
                  placeholder={speechSupported ? 'Type or tap the mic to speak…' : 'Type your response here…'}
                  disabled={loading}
                />

                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={loading}
                    aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
                    className="absolute bottom-2 right-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                    style={
                      isRecording
                        ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }
                    }
                  >
                    {isRecording ? (
                      /* Stop square */
                      <svg viewBox="0 0 14 14" width="11" height="11" fill="currentColor">
                        <rect x="2" y="2" width="10" height="10" rx="2" />
                      </svg>
                    ) : (
                      /* Microphone */
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                        <rect x="5.5" y="1.5" width="5" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M3 8a5 5 0 0010 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <line x1="8" y1="13" x2="8" y2="15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <line x1="5.5" y1="15.5" x2="10.5" y2="15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {/* Recording indicator */}
              {isRecording && (
                <div className="flex items-center gap-2.5">
                  <span className="relative flex w-2 h-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex rounded-full w-2 h-2 bg-red-500" />
                  </span>
                  <span className="text-[11px] font-medium text-red-400/70">Listening — speak clearly</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex gap-2.5">
                  <button
                    type="submit"
                    disabled={loading || !response.trim()}
                    className="px-5 py-2 text-sm font-semibold rounded-xl text-white transition-all disabled:opacity-30"
                    style={{ background: loading || !response.trim() ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,1)', boxShadow: !loading && response.trim() ? '0 0 20px rgba(99,102,241,0.35)' : 'none' }}
                  >
                    {loading ? 'Evaluating…' : 'Submit Response'}
                  </button>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 text-sm text-white/35 rounded-xl transition-all hover:text-white/70"
                      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      Start over
                    </button>
                  )}
                </div>
                <div className="text-right">
                  {response.trim() && !isRecording && (
                    <span className="text-[11px] text-white/20 tabular-nums">
                      {response.trim().split(/\s+/).length} words
                    </span>
                  )}
                  {speechSupported === false && (
                    <span className="text-[11px] text-white/20">
                      Voice unavailable — use Chrome or Edge
                    </span>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl px-5 py-4" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)' }}>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* ── Evaluation results ──────────────────────────────────── */}
        {result && (
          <div className="space-y-3 pt-2">
            {/* Summary card */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white/80">Judge's Evaluation</span>
                  <span className="text-xs text-white/25">Round {round - 1}</span>
                </div>
                {avgScore !== null && (
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold tabular-nums leading-none ${scoreTextClass(avgScore)}`}>
                      {avgScore}
                    </span>
                    <span className="text-sm text-white/25 font-medium">/5</span>
                  </div>
                )}
              </div>
              <div className="px-6 py-5" style={{ background: 'rgba(255,255,255,0.012)' }}>
                <p className="text-sm text-white/55 leading-7">{result.overall_feedback}</p>
              </div>
            </div>

            {/* PI score cards */}
            <div className="grid gap-3">
              {result.pi_scores.map((pi) => {
                const piDesc = scenario.pi_list.find((p) => p.pi_number === pi.pi_number)?.description;
                const exemplar = piDesc ? EXEMPLARS[piDesc] : undefined;
                return (
                  <div key={pi.pi_number} className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.018)' }}>
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="shrink-0 w-6 h-6 rounded-md text-[11px] font-bold text-white/35 flex items-center justify-center mt-0.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {pi.pi_number}
                        </div>
                        <p className="text-sm font-medium text-white/70 leading-6 pt-0.5">{piDesc}</p>
                      </div>
                      <div className="shrink-0 flex items-baseline gap-0.5 pl-2">
                        <span
                          className={`text-4xl font-bold tabular-nums leading-none ${scoreTextClass(pi.score)}`}
                          style={{ textShadow: scoreGlow(pi.score) }}
                        >
                          {pi.score}
                        </span>
                        <span className="text-base text-white/20 font-medium ml-0.5">/5</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="px-5 pb-3">
                      <div className="w-full rounded-full h-[3px]" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div
                          className={`h-[3px] rounded-full transition-all duration-700 ${scoreBarClass(pi.score)}`}
                          style={{
                            width: `${(pi.score / 5) * 100}%`,
                            boxShadow: scoreGlow(pi.score),
                          }}
                        />
                      </div>
                    </div>

                    {/* Feedback row */}
                    <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-2">
                      <p className="text-xs text-white/40 leading-6">{pi.feedback}</p>
                      <span className={`shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap ${scoreBadgeClass(pi.score)}`}>
                        {SCORE_LABELS[pi.score]}
                      </span>
                    </div>

                    {/* Exemplar */}
                    {exemplar && (
                      <div className="mx-5 mb-5 rounded-xl px-4 py-3.5" style={{ background: 'rgba(99,102,241,0.05)', borderLeft: '2px solid rgba(99,102,241,0.35)' }}>
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-400/50 mb-2">
                          Strong Response Example
                        </p>
                        <p className="text-xs text-white/45 leading-[1.75]">{exemplar}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Practice history ────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-20 pt-6">
        <div className="pt-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/22 mb-6">
            Practice History
          </p>

          {/* Weakness tracker */}
          {!historyLoading && weakness && (
            <div
              className="rounded-2xl overflow-hidden mb-6"
              style={{ border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)' }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid rgba(251,191,36,0.1)' }}
              >
                <div className="flex items-center gap-2.5">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                    <path d="M8 2L9.8 6H14L10.6 8.6L11.8 13L8 10.4L4.2 13L5.4 8.6L2 6H6.2L8 2Z" fill="rgba(251,191,36,0.7)" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/70">
                    Focus Area
                  </span>
                </div>
                <span className="text-xs font-semibold text-amber-400/60 tabular-nums">
                  avg {weakness.avg_score}/5
                </span>
              </div>

              <div className="px-5 py-4">
                <p className="text-sm text-white/70 leading-6 mb-1">
                  You consistently score lowest on:
                </p>
                <p className="text-sm font-semibold text-white/90 mb-4">
                  &ldquo;{weakness.pi_description}&rdquo;
                </p>

                {weakness.recommended_scenarios.length > 0 && (
                  <>
                    <p className="text-[11px] text-white/35 mb-3">
                      {weakness.recommended_scenarios.length === 1
                        ? 'Try this scenario to strengthen this skill:'
                        : 'Here are two scenarios to strengthen this skill:'}
                    </p>
                    <div className="space-y-2">
                      {weakness.recommended_scenarios.map((s) => (
                        <Link
                          key={s.id}
                          href={`/practice?scenario=${s.id}`}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl group transition-colors"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <span className="text-xs font-medium text-white/65 group-hover:text-white transition-colors truncate">
                            {s.title}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-white/25">{s.category}</span>
                            <svg
                              className="w-3 h-3 text-white/25 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all"
                              viewBox="0 0 12 12" fill="none"
                            >
                              <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {historyLoading ? (
            <div className="space-y-2.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-[60px] rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : sessionHistory.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-white/25">
                No practice sessions yet. Complete a round to see your history.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessionHistory.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.06)', background: i === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.015)' }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {i === 0 && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ color: 'rgba(165,180,252,0.7)', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)' }}>
                        Latest
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/75 truncate">{s.scenario_title}</p>
                      <p className="text-xs text-white/25 mt-0.5">
                        {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {s.avg_score !== null ? (
                    <div className="shrink-0 flex items-baseline gap-0.5">
                      <span className={`text-xl font-bold tabular-nums ${scoreTextClass(s.avg_score)}`}>{s.avg_score}</span>
                      <span className="text-xs text-white/20">/5</span>
                    </div>
                  ) : (
                    <span className="text-sm text-white/20">—</span>
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
