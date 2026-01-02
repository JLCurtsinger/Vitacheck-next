# API Orchestration — VitaCheck (ShadCN Rebuild)

## Purpose
VitaCheck is an informational interaction checker that aggregates multiple sources (drug, supplement, adverse event, and exposure data) to present transparent, cross-validated interaction signals. It must inform without prescribing. Outputs must be explainable, source-backed, and resilient to partial data and API failures.

This document defines the end-to-end flow from user input → normalized entities → API calls → evidence aggregation → scoring → UI-ready results.

## Non-Negotiables
- Inform, don't prescribe. No "do not take" language.
- Every claim shown to users must trace to a source record.
- Missing/partial data is normal. The system must degrade gracefully.
- Avoid "severity inflation" caused by incident-only sources (FAERS, interaction listings). Use exposure denominators where available.
- No UI/UX changes unless explicitly requested (Cursor rule).
- No mock data in production rendering. Mock data may exist only behind dev flags.

---

## High-Level Architecture

### Layers
1. **Input Layer (Client)**
   - Collect substances (drugs + supplements) in a structured list.
   - Prefer selection from autocomplete rather than free text when possible.

2. **Normalization Layer (Client or Server)**
   - Convert user strings to canonical entities:
     - Drugs → RxNorm concepts (RxCUI + name + type)
     - Supplements → normalized supplement IDs/names (SUPP.AI or internal canonical dictionary)
   - Output: `CanonicalEntity[]`

3. **Orchestration Layer (Server)**
   - Given canonical entities, calls downstream sources.
   - Performs batching, caching, retries, rate limiting.
   - Produces a single unified response shape for the UI.

4. **Evidence & Scoring Layer (Server)**
   - Converts raw responses into "evidence items"
   - Computes confidence and risk levels using transparent rules
   - Produces UI-ready "interaction cards" + "substance safety summaries"

5. **Presentation Layer (Client)**
   - Renders results
   - Provides collapsible detail sections for transparency
   - Never "decides" medically; it displays evidence and computed risk heuristics with disclaimers.

---

## Infrastructure Assumptions (Current)
- Database: Neon Postgres (primary)
- DB is used for caching + analytics tables + optional user-generated content (experiences).
- DB access is server-side only via a single DB client module.
- External APIs must not be called directly from the client if they need secrets, rate limiting, or stable caching behavior.

---

## Canonical Data Contracts

### CanonicalEntity
Represents a normalized user input.

```ts
type EntityKind = "drug" | "supplement";

type CanonicalEntity = {
  kind: EntityKind;

  // Original user input
  input: {
    raw: string;
    source: "typed" | "selected";
  };

  // Normalized identity
  normalized: {
    id: string;            // drug: RxCUI, supplement: canonical supplement id
    label: string;         // display name
    system: "rxnorm" | "suppai" | "internal";
    type?: string;         // e.g., ingredient, brand, clinicalDrug (RxNorm)
  };

  // Matching quality
  match: {
    status: "exact" | "fuzzy" | "unknown";
    confidence: number; // 0..1
    notes?: string;
  };
};
```

### InteractionResultCard (UI-ready)

```ts
type RiskLevel = "low" | "moderate" | "high" | "unknown";

type InteractionResultCard = {
  id: string; // stable hash: entities + source + interaction id
  entities: {
    a: CanonicalEntity["normalized"];
    b: CanonicalEntity["normalized"];
  };

  risk: {
    level: RiskLevel;
    rationale: string; // short, neutral
    confidence: number; // 0..1
  };

  evidence: EvidenceItem[]; // collapsible details
  exposure?: ExposureSummary; // optional denominator context
  notes?: string[]; // disclaimers, limitations
};
```

### EvidenceItem

Atomic, source-cited evidence.

```ts
type EvidenceSource =
  | "rxnav_interaction"
  | "fda_label"
  | "openfda_faers"
  | "suppai_interaction"
  | "cms_partd_exposure"
  | "user_reports";

type EvidenceItem = {
  source: EvidenceSource;
  title: string;
  summary: string;
  severity?: "minor" | "moderate" | "major" | "unknown";
  link?: string; // if available
  raw?: any; // stored for clinician-mode / debugging (not always shown)
  quality: {
    recency?: string;
    confidence: number; // 0..1 for this evidence item
  };
};
```

### ExposureSummary (Denominator)

```ts
type ExposureSummary = {
  system: "cms_partd";
  period: string; // e.g., "2023Q4" or "2022"
  metric: "beneficiaries" | "claims" | "spending_proxy";
  value: number;
  match: {
    status: "exact" | "fuzzy" | "none";
    confidence: number;
    matchedName?: string;
  };
  caveats: string[]; // e.g., Part D only, Medicare population, etc.
};
```

---

## Data Sources & Intended Use

### RxNorm / RxNav
- **Purpose:**
  - Normalize drug names to RxCUI
  - Fetch drug-drug interaction data
- **Output:**
  - Interaction groupings and severity labels
- **Known limitations:**
  - Severity granularity varies
  - Not a true incidence rate

### CMS Medicare Part D Exposure (Denominator)
- **Purpose:**
  - Estimate how widely a drug is used (beneficiaries/claims)
  - Reduce severity inflation by providing exposure context
- **Use:**
  - Not used to "downplay" real high-risk interactions.
  - Used to compute "reports per exposure" or to qualify uncertainty.
- **Caveats:**
  - Medicare Part D population only
  - Data recency and drug naming mismatches
  - Not applicable to supplements

### openFDA (FAERS)
- **Purpose:**
  - Adverse event signal detection (numerator)
- **Use:**
  - Should be presented as "reported events," not proven causality.
  - Used as one evidence stream, never sole arbiter.

### SUPP.AI (Supplements)
- **Purpose:**
  - Supplement interactions and supplement metadata
- **Caveats:**
  - Matching is harder; normalization must be explicit and conservative.

### User Reports (Future / Optional)
- **Purpose:**
  - Anecdotal experiences
- **Must be labeled clearly as anecdotal and non-clinical.**

---

## Orchestration Flow (End-to-End)

### 0) Input collection (Client)
- User adds substances via autocomplete when possible.
- Store list of `CanonicalEntity` candidates.

### 1) Canonicalization (Normalization)

**Drugs**
- If selected from RxTerms/RxNorm autocomplete: store RxCUI + type immediately.
- If typed:
  - attempt lookup → choose best match
  - mark match as fuzzy/unknown when ambiguous

**Supplements**
- Attempt SUPP.AI or internal canonical dictionary match
- If ambiguous: require user disambiguation or mark unknown

### 2) Build query plan (Server)

Given N entities:
- Generate all pairwise combos:
  - drug-drug
  - drug-supplement
  - supplement-supplement
- Determine which APIs apply per combo:
  - drug-drug → RxNav (required)
  - any with supplement → SUPP.AI (when available)
- Determine per-entity lookups:
  - drug exposure → CMS Part D
  - drug label → FDA label (optional / later)
  - FAERS → openFDA (optional / later)

### 3) Execute calls with resilience
- Use caching keys (also stored in Neon):
  - `rxnav:interaction:{sortedRxCuisHash}`
  - `cms:exposure:{normalizedDrugKey}:{period}`
- Apply:
  - timeouts
  - retries (bounded)
  - circuit breakers for unstable APIs
- Collect failures as evidence items with source and error metadata (not shown by default to users)

### 4) Evidence extraction

Convert each API response into `EvidenceItem[]`.
Rules:
- Never drop raw source references.
- If source is low-confidence (fuzzy match, missing metadata), reflect that in `quality.confidence`.

### 5) Scoring & risk synthesis (Server)

Goal: produce a neutral "risk level" plus a confidence score, without pretending this is a clinical decision.

**Principle: Separate "severity" from "prevalence"**
- Incident-only sources (interactions lists, FAERS) naturally skew severe.
- CMS exposure is used to contextualize how common the drug is, not to negate a serious mechanistic interaction.

**Minimal v1 scoring (recommended)**
- Risk starts as:
  - RxNav severity → baseline risk (low/moderate/high)
  - SUPP.AI severity → baseline risk (if applicable)
- Confidence increases when:
  - multiple sources agree on interaction
  - exact identity matches
  - consistent mechanism description exists
- Confidence decreases when:
  - fuzzy entity match
  - single source only
  - missing severity or vague text
- Exposure influence (v1):
  - Exposure does NOT directly reduce risk level.
  - Exposure is shown as context:
    - "This drug is commonly prescribed (Part D). Report-based signals may be influenced by usage volume."
  - Later (v2): compute rate proxies when numerator is available:
    - `reported_events / exposure_value` displayed as a derived metric with caveats.

**Severe outcomes rule (existing policy)**
If a severe outcome is from a single-substance label and not specific to the combination:
- Do not label the combo "severe" because of that outcome.
- Put severe outcome in the individual substance safety summary.
- Combo risk may be moderate with cautionary note.

### 6) Response assembly

Return:
- `cards: InteractionResultCard[]`
- `substanceSummaries: SubstanceSummary[]`
- `metadata: { generatedAt, sourcesUsed, warnings }`

---

## UI Requirements (Data-Driven, Not Design-Specific)
- Results must render even if:
  - Some APIs fail
  - Exposure is missing
- Must include collapsible "Evidence" per card:
  - show sources and confidence
  - show exposure context
- Must include "Unknown/Insufficient data" state

No UI styling decisions belong in this file. This file only defines what UI must be able to represent.

---

## Matching Strategy (Critical)

### Drug name keying

**Preferred:**
- RxCUI-based joins for drug-drug logic
- For CMS exposure, map via a normalized display name derived from RxNorm ingredient name.

**Minimum normalization for CMS lookup:**
- uppercase
- strip punctuation
- remove dosage/route tokens if present
- treat brand vs generic carefully:
  - prefer ingredient/generic for exposure lookup
- Store match results:
  - exact / fuzzy / none
  - confidence score
  - matched CMS row drug name

---

## Caching & Storage

### Cache tiers
1. In-request memoization (avoid duplicate calls during a run)
2. Short-term server cache (minutes-hours)
3. Persistent cache (Neon Postgres) for:
   - CMS exposure per drug per period
   - RxNav interaction results per RxCUI set hash
   - (later) FAERS aggregates

### Database notes
- Primary database: Neon Postgres
- Access pattern: server-side only (no direct client DB access)
- All external API responses that are cached must include:
  - cache_key (stable hash)
  - source (rxnav/cms/openfda/etc.)
  - fetched_at timestamp
  - normalized payload used by the app
  - raw payload optional (only if needed for audit/clinician mode)

### Persistence rules
- Store raw API responses only if needed for reproducibility/audit (clinician mode).
- Do not store user-entered personal data.
- If user accounts exist, store only minimal operational data.
- Authentication provider is intentionally decoupled from the Neon cache schema (so DB choice doesn't force auth choice).

---

## Testing Plan (Minimum)
- Unit tests:
  - canonicalization
  - pair generation
  - response adapters (RxNav → cards, CMS → exposure)
- Contract tests:
  - snapshot minimal expected keys from upstream APIs
- Integration tests:
  - "N drugs" flow returns deterministic structure
  - partial failures still render results

---

## Implementation Milestones (Suggested)

### Milestone A — End-to-end with real data
- RxNorm autocomplete → RxCUI set
- RxNav interaction call → cards (real)
- CMS exposure lookup per drug → exposure summary shown
- Error/empty states handled

### Milestone B — Numerator support
- Add openFDA FAERS signals (carefully labeled)
- Begin derived rate proxy with explicit caveats

### Milestone C — Supplements
- SUPP.AI normalization + interaction evidence
- Conservative scoring (unknown when unclear)

---

## Open Questions (Track Here)
- Which CMS dataset period should be default? (latest year/quarter vs selectable)
- How to handle multi-ingredient drugs for exposure?
- How to display exposure context without implying safety?
- When to compute derived "reports per exposure" metrics and what thresholds are reasonable?

---

## Glossary
- **Numerator:** count of reported events/interactions
- **Denominator:** estimated exposure (people prescribed)
- **Severity:** mechanistic/clinical seriousness
- **Prevalence:** how often something occurs
- **Confidence:** internal estimate of evidence strength and match quality

---

### What to do next
1) Add this file to the repo as `api-orchestration.md` (or `/docs/api-orchestration.md`).
2) Then we'll create **one small companion file** (later) that's purely technical contracts (TypeScript types + endpoint list). That keeps this one readable and "product/clinical intent" focused.

