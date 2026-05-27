import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  scenario: string;
  pi_list: { pi_number: number; description: string }[];
  student_response: string;
  conversation_history: ConversationTurn[];
}

interface PiScore {
  pi_number: number;
  score: number;
  feedback: string;
}

interface JudgeResponse {
  pi_scores: PiScore[];
  follow_up_question: string;
  overall_feedback: string;
}

function buildSystemPrompt(
  scenario: string,
  piList: { pi_number: number; description: string }[]
): string {
  const piLines = piList
    .map((pi) => `  PI ${pi.pi_number}: ${pi.description}`)
    .join('\n');

  return `You are a DECA judge evaluating a student competing in the Principles of Business Management event. Your role is to assess the student's roleplay response fairly and constructively.

Scenario presented to the student:
${scenario}

Performance Indicators (PIs) being evaluated:
${piLines}

After each student response, you must:
1. Score each PI from 1 to 5:
   - 5: Exceeds expectations — thorough, insightful, uses business terminology correctly
   - 4: Meets expectations — addresses the PI clearly with solid reasoning
   - 3: Partially meets expectations — touches on the PI but lacks depth or precision
   - 2: Below expectations — minimal or vague connection to the PI
   - 1: Does not address the PI
2. Provide exactly one sentence of feedback per PI explaining the score.
3. Give a brief overall_feedback (2–3 sentences) on the response as a whole.
4. Ask exactly one follow-up question that probes a gap or pushes the student deeper on a PI they addressed.

CRITICAL OUTPUT RULES — you must follow all of these exactly:
- Output ONLY raw JSON. Nothing before it, nothing after it.
- Do NOT wrap the JSON in markdown code fences (no \`\`\`json, no \`\`\`).
- Do NOT include any explanation, greeting, or prose of any kind.
- The very first character of your response must be { and the very last must be }.

Use this exact JSON structure:
{
  "pi_scores": [
    { "pi_number": <number>, "score": <1-5>, "feedback": "<one sentence>" }
  ],
  "follow_up_question": "<one question>",
  "overall_feedback": "<2-3 sentences>"
}`;
}

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { scenario, pi_list, student_response, conversation_history } = body;

  if (!scenario || !pi_list?.length || !student_response) {
    return Response.json(
      { error: 'Missing required fields: scenario, pi_list, student_response' },
      { status: 400 }
    );
  }

  const messages: Anthropic.MessageParam[] = [
    ...conversation_history.map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    { role: 'user', content: student_response },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: buildSystemPrompt(scenario, pi_list),
    messages,
  });

  const rawText =
    response.content[0].type === 'text' ? response.content[0].text : '';

  let judgeResponse: JudgeResponse;
  try {
    judgeResponse = JSON.parse(rawText);
  } catch (err) {
    console.error('[judge] JSON parse failed:', err);
    console.error('[judge] Raw Claude response:\n', rawText);
    return Response.json(
      { error: 'Failed to parse judge response', raw: rawText },
      { status: 502 }
    );
  }

  return Response.json(judgeResponse);
}
