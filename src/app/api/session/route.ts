import { supabase } from '@/lib/supabase';
import { SCENARIOS } from '@/lib/scenarios';

interface PiScoreInput {
  pi_number: number;
  score: number;
  feedback: string;
}

interface RequestBody {
  scenario_id: string;
  session_id?: string;
  round: number;
  pi_scores: PiScoreInput[];
}

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { scenario_id, session_id, round, pi_scores } = body;

  if (!scenario_id || !pi_scores?.length || !round) {
    return Response.json(
      { error: 'Missing required fields: scenario_id, round, pi_scores' },
      { status: 400 }
    );
  }

  let resolvedSessionId = session_id;

  if (!resolvedSessionId) {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ scenario_id })
      .select('id')
      .single();

    if (error) {
      console.error('[session] insert session failed:', error);
      return Response.json({ error: 'Failed to create session' }, { status: 502 });
    }
    resolvedSessionId = data.id;
  }

  const rows = pi_scores.map((pi) => ({
    session_id: resolvedSessionId,
    pi_number: pi.pi_number,
    score: pi.score,
    feedback: pi.feedback,
    round,
  }));

  const { error: scoresError } = await supabase.from('pi_scores').insert(rows);

  if (scoresError) {
    console.error('[session] insert pi_scores failed:', scoresError);
    return Response.json({ error: 'Failed to save scores' }, { status: 502 });
  }

  return Response.json({ session_id: resolvedSessionId });
}

export async function GET(): Promise<Response> {
  // ── Last 5 sessions for the history display ──────────────────
  const { data, error } = await supabase
    .from('sessions')
    .select('id, scenario_id, created_at, pi_scores(score)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[session] fetch history failed:', error);
    return Response.json({ error: 'Failed to fetch history' }, { status: 502 });
  }

  const sessions = (data ?? []).map((s) => {
    const scores = (s.pi_scores as { score: number }[]) ?? [];
    const avg = scores.length
      ? Math.round((scores.reduce((sum, p) => sum + p.score, 0) / scores.length) * 10) / 10
      : null;
    const scenario = SCENARIOS.find((sc) => sc.id === s.scenario_id);
    return {
      id: s.id,
      scenario_title: scenario?.title ?? s.scenario_id,
      created_at: s.created_at,
      avg_score: avg,
    };
  });

  // ── Weakness analysis (requires ≥ 3 sessions) ────────────────
  const { data: allSessions } = await supabase
    .from('sessions')
    .select('id, scenario_id');

  const sessionCount = allSessions?.length ?? 0;

  let weakness = null;

  if (sessionCount >= 3) {
    const { data: allScores } = await supabase
      .from('pi_scores')
      .select('session_id, pi_number, score');

    if (allSessions && allScores) {
      // Build session_id → scenario_id lookup
      const sessionScenarioMap = new Map(allSessions.map((s) => [s.id, s.scenario_id]));

      // Aggregate scores by PI description text
      const piAgg: Record<string, { total: number; count: number }> = {};

      for (const row of allScores) {
        const scenarioId = sessionScenarioMap.get(row.session_id);
        if (!scenarioId) continue;
        const scenario = SCENARIOS.find((s) => s.id === scenarioId);
        if (!scenario) continue;
        const pi = scenario.pi_list.find((p) => p.pi_number === row.pi_number);
        if (!pi) continue;

        if (!piAgg[pi.description]) piAgg[pi.description] = { total: 0, count: 0 };
        piAgg[pi.description].total += row.score;
        piAgg[pi.description].count += 1;
      }

      // Find the PI description with the lowest average (min 2 data points)
      let weakestDesc = '';
      let lowestAvg = Infinity;

      for (const [desc, agg] of Object.entries(piAgg)) {
        if (agg.count < 2) continue;
        const avg = agg.total / agg.count;
        if (avg < lowestAvg) {
          lowestAvg = avg;
          weakestDesc = desc;
        }
      }

      if (weakestDesc) {
        const recommended = SCENARIOS
          .filter((s) => s.pi_list.some((p) => p.description === weakestDesc))
          .slice(0, 2)
          .map((s) => ({ id: s.id, title: s.title, category: s.category }));

        weakness = {
          pi_description: weakestDesc,
          avg_score: Math.round(lowestAvg * 10) / 10,
          recommended_scenarios: recommended,
        };
      }
    }
  }

  return Response.json({ sessions, weakness, session_count: sessionCount });
}
