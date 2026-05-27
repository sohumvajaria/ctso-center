@AGENTS.md

# CTSO Center

AI-powered DECA roleplay practice platform.

## Tech Stack

- **Framework:** Next.js with TypeScript (App Router)
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase
- **AI:** Claude API (judge persona)

## MVP Scope

Targets one event: **DECA Principles of Business Management**

Core feature: voice or text roleplay practice session where the AI plays a DECA judge, scores the student response against each Performance Indicator (PI), and asks one follow-up question.

## Data Model

**sessions**
- `user_id`
- `scenario_id`
- `created_at`

**pi_scores**
- `session_id`
- `pi_number`
- `score`
- `feedback`

## Folder Structure

Follows Next.js App Router conventions:
- `src/app/` — routes and pages
- `src/components/` — UI components
