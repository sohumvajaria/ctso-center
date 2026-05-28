'use client';

import { useState, useEffect } from 'react';
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

const SCORE_LABELS: Record<number, string> = {
  1: 'Does not address',
  2: 'Below expectations',
  3: 'Partial',
  4: 'Meets expectations',
  5: 'Exceeds expectations',
};

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
      }

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

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">DECA Practice — Principles of Business Management</h1>
        <button
          onClick={handleNewScenario}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
        >
          New Scenario
        </button>
      </div>

      {/* Scenario card */}
      <div className="border border-gray-300 rounded p-4 bg-gray-50">
        <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Scenario</p>
        <p className="font-medium mb-2">{scenario.title}</p>
        <p className="text-sm text-gray-700 leading-relaxed">{scenario.body}</p>
      </div>

      {/* PI list */}
      <div className="border border-gray-200 rounded p-4">
        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Performance Indicators</p>
        <ol className="list-decimal list-inside space-y-1">
          {scenario.pi_list.map((pi) => (
            <li key={pi.pi_number} className="text-sm text-gray-700">
              {pi.description}
            </li>
          ))}
        </ol>
      </div>

      {/* Follow-up from previous round */}
      {result?.follow_up_question && (
        <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 py-3 pr-3 rounded-r">
          <p className="text-xs font-semibold uppercase text-blue-600 mb-1">
            Judge follow-up (Round {round - 1})
          </p>
          <p className="text-sm text-gray-800">{result.follow_up_question}</p>
        </div>
      )}

      {/* Response form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {round === 1 ? 'Your response' : `Your follow-up response (Round ${round})`}
        </label>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={6}
          className="w-full border border-gray-300 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your response here..."
          disabled={loading}
        />
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !response.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded disabled:opacity-50 hover:bg-blue-700"
          >
            {loading ? 'Evaluating...' : 'Submit'}
          </button>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50"
            >
              Start over
            </button>
          )}
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-600 border border-red-200 rounded p-3 bg-red-50">{error}</p>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Evaluation — Round {round - 1}</h2>

          {/* PI scores */}
          <div className="space-y-2">
            {result.pi_scores.map((pi) => (
              <div key={pi.pi_number} className="border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">PI {pi.pi_number}</span>
                  <span className="text-sm font-bold">
                    {pi.score}/5{' '}
                    <span className="text-xs font-normal text-gray-500">
                      {SCORE_LABELS[pi.score]}
                    </span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded h-1.5 mb-2">
                  <div
                    className="h-1.5 rounded bg-blue-500"
                    style={{ width: `${(pi.score / 5) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600">{pi.feedback}</p>
              </div>
            ))}
          </div>

          {/* Overall feedback */}
          <div className="border border-gray-200 rounded p-3">
            <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Overall feedback</p>
            <p className="text-sm text-gray-700">{result.overall_feedback}</p>
          </div>
        </div>
      )}
    </div>
  );
}
