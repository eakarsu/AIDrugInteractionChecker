# Audit Notes — AIDrugInteractionChecker

Audit source: `_AUDIT/reports/batch_03.md` § 3 (template-clone, audit reported 0 AI endpoints).

## Original audit recommendations

### Missing AI counterparts
- `/drug-interaction-check` — multi-drug interaction analysis.
- `/contraindication-screen` — patient profile vs drug.
- `/alternative-recommendation` — alternatives given contraindications.
- `/dosage-adjust` — renal/hepatic personalized dosing.
- `/pregnancy-safety` — teratogenicity risk.
- `/geriatric-risk` — fall/cognition risk from polypharmacy.
- `/food-herb-interaction` — grapefruit, St John's Wort, etc.

### Missing non-AI features
- Demographic management (age/weight/renal/hepatic function).
- Prescription workflow (order/fill/dispense).
- Audit trail.
- Off-label approval workflow.

### Custom feature suggestions
- Live FDA/WHO drug DB sync.
- Clinical-trial matching.
- Agentic pharmacist with reasoning chain.
- Population health analysis.
- Voice intake.
- Pharmacy integration APIs (Surescripts).
- Insurance formulary check.

## Current state observed

The audit's "0 AI endpoints" assessment was outdated — `routes/aiExpanded.js`
already implemented `/contraindications/ai-check`, `/pregnancy/ai-assess`,
`/dosage/ai-calculate`, `/food-interactions/ai-alert`, and
`/alternatives/ai-suggest` (5 of the 7 recommended counterparts).

## Implementations applied this pass

1. **`POST /api/interactions/ai-multi-check`** in `aiExpanded.js` — multi-drug
   interaction analysis. Joins existing `interactions` table for documented
   pairs, optionally pulls patient profile, and asks the model for
   severity-ranked findings, mechanism, management, and monitoring.
2. **`POST /api/geriatric/ai-risk`** in `aiExpanded.js` — Beers / STOPP-START
   / anticholinergic burden assessment for a patient + drug list.

Both endpoints follow the existing pattern (`queryOpenRouter` +
`parseAIJson` + `audit_log` insert) and pass `node --check`.

## Prioritized backlog

1. **MECHANICAL** — Add `/api/audit/ai-summary` endpoint to summarize
   `audit_log` entries for a clinician dashboard.
2. **NEEDS-CREDS** — Live drug DB sync (FDA/RxNorm/WHO) requires API keys
   and rate-limited ingestion.
3. **NEEDS-CREDS** — Surescripts / pharmacy integration is contract-gated.
4. **NEEDS-PRODUCT-DECISION** — Insurance formulary requires per-payer
   feed contracts and patient-plan mapping.
5. **TOO-RISKY** — Voice intake of medications without HIPAA-grade
   transcription should not be added without privacy review.
6. **MECHANICAL (later)** — Clinical-trial matching against ClinicalTrials.gov
   feed (publicly available) is feasible once an `eligibility_criteria` table
   is added.

## Apply pass 4 (mechanical backlog)

Implemented backlog item #1 (`MECHANICAL — /api/audit/ai-summary`).

- **BE:** `POST /api/audit/ai-summary` added to `backend/src/routes/audit.js`. Accepts `{ hours, action_filter, limit }`. Pulls recent rows from `audit_log`, aggregates action/user counts, asks the LLM via the existing `queryOpenRouter` helper for a clinician-facing summary. Returns `{ window_hours, action_filter, entry_count, action_counts, user_counts, ai_analysis, ai_json, entries }`. Reuses existing `aiRateLimiter` + `auth`. Placed before `DELETE /:id` (different method from `GET /:id` so no conflict).
- **FE:** `frontend/src/pages/AuditAISummaryPage.js` — form (window dropdown, action filter, max entries) using `FormSelect`/`FormInput`/`SubmitButton`/`PageHeader` from `components/FormField.js`. Posts via `services/api.js` axios client (auto-attaches JWT). Renders `AIAnalysis` markdown + structured `ai_json`. Surfaces 503 messaging.
- **Routing/Nav:** `App.js` → route `/ai-audit-summary`; `components/Layout.js` → sidebar entry "AI Audit Summary".
- **Syntax:** `node --check` PASS on `audit.js`.
- **Smoke test:** Backend on :4000, login `sarah@hospital.com / password123` returned 200; `POST /api/audit/ai-summary {hours:24,limit:50}` returned `{"entry_count":0,"ai_analysis":"No audit entries in selected window."}` on a fresh DB.

## Apply pass 3 (frontend)

- **Status:** FE already wired — no changes.
- `frontend/src/pages/MultiInteractionPage.js` calls `POST /api/interactions/ai-multi-check`.
- `frontend/src/pages/GeriatricRiskPage.js` calls `POST /api/geriatric/ai-risk`.
- Both routes registered in `frontend/src/App.js` (`/ai-multi-check`, `/ai-geriatric-risk`).
- Both pages reuse the existing `services/api.js` helper which sends `Authorization: Bearer <token>` from `localStorage`.
- Both render the AI analysis text and the structured JSON object.

## Apply pass 5 (all backlog)

Implemented backlog item #6 (`MECHANICAL — Clinical-trial matching`). Other rows remain
out of scope: NEEDS-CREDS (live FDA/RxNorm/Surescripts) and NEEDS-PRODUCT-DECISION
(insurance formulary) and TOO-RISKY (HIPAA voice intake) all require contracts /
infra not solvable in an additive code-only pass.

- **BE:** `POST /api/clinical-trials/ai-match` added to `backend/src/routes/aiExpanded.js`
  (mounted at `/api`). Creates `eligibility_criteria` table idempotently
  (CREATE TABLE IF NOT EXISTS) and seeds 4 sample trials on first request.
  PRODUCT-DECISION: local catalog only — no live ClinicalTrials.gov fetch (would need
  rate-limiting / mirror infra). Audit-log insert is wrapped in a try/catch fallback
  because some legacy DBs lack the `ai_results` JSONB column declared in `seeds/seed.js`.
  Surfaces `ai_configured: false` when `OPENROUTER_API_KEY` is the placeholder so
  callers know the response is a mock.

- **FE:** `frontend/src/pages/ClinicalTrialMatchPage.js` — patient_id / drug_id /
  condition form, posts via `services/api.js` axios client, renders candidate trials
  + AI match JSON. `frontend/src/App.js` registers `/ai-clinical-trials`,
  `frontend/src/components/Layout.js` adds nav entry "AI Clinical Trial Match".

- **Syntax:** `node --check aiExpanded.js` PASS.

- **Smoke test:** BE on alt port :4099 (4000 occupied by parallel agent).
  Login `sarah@hospital.com / password123` → 200 + JWT. POST
  `/api/clinical-trials/ai-match {condition: "Diabetes"}` → 200 with 1 candidate
  trial (NCT00000001 Statin Optimization in Diabetes) and an AI-generated match
  reply. `eligibility_criteria` table created and seeded as expected.
