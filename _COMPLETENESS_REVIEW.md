# Completeness Review: AIDrugInteractionChecker

- **Review date:** 2026-07-18
- **Assessment basis:** Static source and configuration inspection only. Dependencies were not installed, and no build, database migration, external integration, or runtime workflow was executed.

## Classification

**Prototype-demo**

## Verdict

The repository presents a broad clinical evidence support surface (72 source files and 26 route modules), but static evidence is characteristic of a generated prototype. Pages and endpoints demonstrate concepts; they do not establish a verified execution path to ground patient/compound criteria in curated evidence, produce explainable matches or interaction checks, and route them to professional review.

## Why it is not complete

- 1 file is explicitly named as gap/gap-feature implementations; route/page count therefore overstates completed product capability.
- The route/page inventory includes `custom views`, `adverse reactions`, `agentic pharmacist`, `ai expanded`; these surfaces show breadth but not durable execution against authoritative systems.
- 23 files reference model-provider or chat-completion behavior; generic LLM calls are not a substitute for deterministic domain execution, grounding, or evaluation.
- 20 files contain mock, sample, placeholder, or random-data signals, leaving important outcomes disconnected from authoritative systems.
- No recognizable application test files were found in the inspected tree.
- No CI workflow was found to continuously verify builds, tests, migrations, or security checks.
- No environment example/template was found, so required configuration and secret boundaries are undocumented.

## Needed features

- 1. Implement a workflow to ground patient/compound criteria in curated evidence, produce explainable matches or interaction checks, and route them to professional review.
- 2. Connect FHIR/EHR or research systems, trial registries, terminology/drug knowledge services, and consented identity; replace seed/demo records with durable synchronized data and explicit failure handling.
- 3. Evaluate retrieval, eligibility/rule accuracy, uncertainty, contraindications, and subgroup performance on expert-reviewed cases.
- 4. Enforce consent, minimum-necessary access, provenance, clinical-use boundaries, and mandatory professional review.
- 5. Add contract, integration, authorization, migration, and end-to-end tests in CI, plus a documented non-destructive deployment/run path.

## Risks or launch blockers

- Credential/secret fallback or demo-password patterns occur in 3 files and must be removed or made development-only.
- The root launcher can terminate unrelated processes occupying configured ports.
- The root launcher seeds, creates, migrates, or otherwise mutates database state during startup.
- The root launcher installs dependencies at run time, reducing reproducibility and expanding supply-chain risk.
- Ungrounded or malformed model output can become a domain action unless schemas, evidence, evaluations, and approval gates are added.

## Evidence inspected

- `backend/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `frontend/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `backend/src/server.js` — service composition, middleware, and registered routes.
- `frontend/src/index.js` — service composition, middleware, and registered routes.
- `backend/routes/customViews.js` — implemented API surface and domain/AI request handling.
- `backend/src/routes/adverse_reactions.js` — implemented API surface and domain/AI request handling.

## Recommended next action

Treat this as a prototype: use custom views and adverse reactions to select one narrow clinical evidence support outcome, quarantine generated gap routes, and implement that outcome end to end with real data, deterministic rules, and tests before adding features.

## Implementation progress

- **Implemented locally for needed feature 1:** `backend/src/routes/evidenceReview.js`, `backend/src/services/evidenceEngine.js`, and `backend/migrations/001_governed_evidence_review.sql` add workspace-isolated medication-review cases, terminology-code normalization, canonical pair evaluation, versioned/cited curated evidence, explicit evidence gaps, consent records, pseudonymous patient references, deterministic subgroup matching, immutable findings, and pharmacist/clinician review decisions with rationale.
- **Implemented boundary for needed feature 2:** durable sync-run records support idempotent FHIR/EHR, terminology, drug-knowledge, registry, and identity adapter work with failure/quarantine states. Providers remain disabled in `.env.example`; no seed drug data or LLM response is presented as curated evidence or provider success.
- **Implemented locally for needed features 3–4:** only current, published, cited evidence can generate a finding; missing evidence is surfaced rather than inferred; public registration grants viewer only; workspace roles split clinical leads, pharmacists, clinicians, data stewards, and viewers; external patient identifiers are HMAC-pseudonymized; explicit consent is mandatory; professional review is always required. Generated clinical CRUD/model endpoints are quarantined by default and forbidden in production.
- **Implemented locally for needed feature 5 and launcher/auth risks:** default JWT/database credentials were removed, runtime checks require dedicated secrets, and bootstrap/migration/guarded-seed/CI/operations paths replace destructive startup and demo credentials. The launcher starts only installed child processes and does not install, create, seed, migrate, start PostgreSQL, or kill ports.
- **Validation performed:** 4 policy tests passed for terminology normalization, evidence currency/provenance, evidence gaps, and pseudonymization; changed JavaScript passed `node --check`; shell scripts passed `bash -n`. No database, EHR/FHIR, knowledge provider, patient, pharmacy, model, or clinical workflow was executed.
- **Remaining launch blockers:** licensed/certified evidence ingestion, terminology and FHIR conformance, consented identity mapping, expert-reviewed reference cases, contraindication/subgroup/adverse-event performance evaluation, clinical safety and human-factors review, regulated validation, audit/security/accessibility tests, disaster recovery, and production data migration. No diagnostic, prescribing, dosing, or clinical correctness claim is made.

## Runtime verification (2026-07-20)

- The launcher now uses the validator's real source root only under explicit `NODE_ENV=test`, preventing React/Babel failures caused by symlinked source files while leaving normal launches rooted in their own checkout.
- Its clinical-identifier HMAC remains mandatory outside the test runtime; the launcher supplies a deterministic disposable value only for that bounded test. Assigned CORS and frontend API values follow the caller's backend and UI ports.
- On disposable PostgreSQL `55557`, API `5934`, and UI `5935`, startup completed without errors, a seeded user logged in through `/api/auth/login`, and `/api/auth/me` accepted the returned bearer token. The ports were released afterward.
- The four maintained policy tests and the optimized React production build passed after runtime verification.
