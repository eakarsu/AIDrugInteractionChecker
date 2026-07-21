BEGIN;
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS clinical_workspaces (
  id UUID PRIMARY KEY, name TEXT NOT NULL, created_by BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS clinical_memberships (
  workspace_id UUID NOT NULL REFERENCES clinical_workspaces(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL, role TEXT NOT NULL CHECK(role IN ('clinical_lead','pharmacist','clinician','data_steward','viewer')),
  PRIMARY KEY(workspace_id,user_id)
);
CREATE TABLE IF NOT EXISTS curated_interaction_evidence (
  id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES clinical_workspaces(id) ON DELETE CASCADE,
  compound_a TEXT NOT NULL, compound_b TEXT NOT NULL, severity TEXT NOT NULL CHECK(severity IN ('informational','minor','moderate','major','contraindicated')),
  summary TEXT NOT NULL, management_boundary TEXT NOT NULL, subgroup_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  citation TEXT NOT NULL, source_url TEXT NOT NULL, source_publisher TEXT NOT NULL, source_retrieved_at TIMESTAMPTZ NOT NULL,
  effective_from DATE NOT NULL, effective_until DATE, evidence_version TEXT NOT NULL, content_hash CHAR(64) NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','published','retired')), entered_by BIGINT NOT NULL, reviewed_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK(compound_a < compound_b),
  UNIQUE(workspace_id,compound_a,compound_b,evidence_version)
);
CREATE TABLE IF NOT EXISTS medication_review_cases (
  id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES clinical_workspaces(id) ON DELETE CASCADE,
  patient_ref_hash CHAR(64) NOT NULL, consent_basis TEXT NOT NULL, consent_recorded_at TIMESTAMPTZ NOT NULL,
  medication_codes TEXT[] NOT NULL, patient_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','evaluated','reviewed','rejected','cancelled')),
  idempotency_key TEXT NOT NULL, created_by BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS medication_review_findings (
  id UUID PRIMARY KEY, case_id UUID NOT NULL REFERENCES medication_review_cases(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES clinical_workspaces(id) ON DELETE CASCADE,
  evidence_id UUID REFERENCES curated_interaction_evidence(id), compound_a TEXT NOT NULL, compound_b TEXT NOT NULL,
  severity TEXT, summary TEXT, citation TEXT, source_url TEXT, evidence_version TEXT,
  finding_type TEXT NOT NULL CHECK(finding_type IN ('matched_evidence','evidence_gap')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS clinical_review_decisions (
  id UUID PRIMARY KEY, case_id UUID NOT NULL UNIQUE REFERENCES medication_review_cases(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES clinical_workspaces(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK(decision IN ('reviewed','rejected')), rationale TEXT NOT NULL,
  reviewer_user_id BIGINT NOT NULL, reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS clinical_sync_runs (
  id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES clinical_workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, idempotency_key TEXT NOT NULL, operation TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','succeeded','failed','cancelled')), failure_code TEXT, failure_detail TEXT,
  records_received INTEGER NOT NULL DEFAULT 0, created_by BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id,provider,idempotency_key)
);
CREATE TABLE IF NOT EXISTS clinical_audit_events (
  id BIGSERIAL PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES clinical_workspaces(id) ON DELETE CASCADE,
  actor_user_id BIGINT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  reason TEXT, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_curated_evidence_pair ON curated_interaction_evidence(workspace_id,compound_a,compound_b,status);
CREATE INDEX IF NOT EXISTS idx_med_review_workspace ON medication_review_cases(workspace_id,status,created_at DESC);
COMMIT;
