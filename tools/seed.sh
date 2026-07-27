#!/usr/bin/env bash
# Seed a demo candidate, a demo company, and one attendable interview the
# candidate is already approved for. Idempotent — safe to re-run.
#
# Accounts are created via the HTTP API (so passwords are hashed by the app);
# the interview graph + approved application go in via psql, since the real
# apply flow needs a resume upload + LLM scoring we don't want in a seed.
set -euo pipefail
cd "$(dirname "$0")/.."  # repo root (for docker compose)

API_URL="${API_URL:-http://localhost:8000}"
PG_USER="${POSTGRES_USER:-interxai}"
PG_DB="${POSTGRES_DB:-interxai}"

pg() { docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 "$@"; }

echo "▶ Ensuring demo accounts via the API (duplicates 4xx and are ignored)..."
curl -s -o /dev/null -X POST "$API_URL/users/signup" \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo-candidate","password":"Candidate#2026!","email":"demo-candidate@interxai.test"}' || true
curl -s -o /dev/null -X POST "$API_URL/organizations/signup" \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo-company","password":"Company#2026!","email":"demo-company@interxai.test"}' || true

count="$(pg -tAc "SELECT count(*) FROM users WHERE username IN ('demo-candidate','demo-company')" | tr -d '[:space:]')"
if [ "${count:-0}" -lt 2 ]; then
  echo "✘ Expected both demo accounts to exist (found ${count:-0}). Is the API up at $API_URL?" >&2
  exit 1
fi

echo "▶ Seeding an attendable interview + approved application (idempotent)..."
pg <<'SQL'
-- Interview (once per org + position).
INSERT INTO custom_interviews
  (org_id, description, position, experience, submission_deadline, start_time, end_time,
   duration, dsa_score, dev_score, resume_shortlist_score, ask_questions_on_resume)
SELECT o.id,
       'Seeded interview for local testing. Answer the behavioural questions, then solve one array problem.',
       'Backend Engineer (seed)', '2+ years',
       now() + interval '7 days', now() - interval '1 hour', now() + interval '7 days',
       60, 40, 60, 5, false
FROM organizations o JOIN users u ON u.id = o.account_id
WHERE u.username = 'demo-company'
  AND NOT EXISTS (
    SELECT 1 FROM custom_interviews ci
    WHERE ci.org_id = o.id AND ci.position = 'Backend Engineer (seed)'
  );

-- Behavioural questions (once per interview).
INSERT INTO custom_questions (interview_id, question, expected_answer)
SELECT ci.id, q.question, q.expected_answer
FROM custom_interviews ci
JOIN organizations o ON o.id = ci.org_id
JOIN users u ON u.id = o.account_id
CROSS JOIN (VALUES
  ('Tell me about a challenging bug you fixed and how.',
   'A concrete debugging story with root cause and fix.'),
  ('How would you design a REST API to handle high traffic?',
   'Caching, pagination, statelessness, rate limiting, horizontal scaling.')
) AS q(question, expected_answer)
WHERE u.username = 'demo-company' AND ci.position = 'Backend Engineer (seed)'
  AND NOT EXISTS (SELECT 1 FROM custom_questions cq WHERE cq.interview_id = ci.id);

-- One DSA topic (once per interview).
INSERT INTO dsa_topics (interview_id, topic, difficulty)
SELECT ci.id, 'Arrays', 'easy'
FROM custom_interviews ci
JOIN organizations o ON o.id = ci.org_id
JOIN users u ON u.id = o.account_id
WHERE u.username = 'demo-company' AND ci.position = 'Backend Engineer (seed)'
  AND NOT EXISTS (SELECT 1 FROM dsa_topics dt WHERE dt.interview_id = ci.id);

-- Approved application so the candidate can start immediately (once).
INSERT INTO applications
  (user_id, interview_id, status, score, ai_shortlist_recommendation, shortlisting_decision)
SELECT cu.id, ci.id, 'applied', 7.5, true, true
FROM users cu
JOIN custom_interviews ci ON ci.position = 'Backend Engineer (seed)'
JOIN organizations o ON o.id = ci.org_id
JOIN users ou ON ou.id = o.account_id
WHERE cu.username = 'demo-candidate' AND ou.username = 'demo-company'
  AND NOT EXISTS (
    SELECT 1 FROM applications a WHERE a.user_id = cu.id AND a.interview_id = ci.id
  );

-- Keep it approved even if the application already existed.
UPDATE applications a SET shortlisting_decision = true
FROM users cu, custom_interviews ci, organizations o, users ou
WHERE a.user_id = cu.id AND a.interview_id = ci.id
  AND ci.org_id = o.id AND o.account_id = ou.id
  AND cu.username = 'demo-candidate' AND ou.username = 'demo-company'
  AND ci.position = 'Backend Engineer (seed)';
SQL

echo "✅ Seed complete. Log in as demo-candidate (see creds.txt)."
