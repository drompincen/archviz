# ArchViz Story Layer — Design Specification

**Version**: 0.3.0-draft
**Date**: 2026-02-23
**Status**: Proposal — awaiting engineering review

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Canonical JSON Schema](#2-canonical-json-schema)
3. [API Surface](#3-api-surface)
4. [UI Primitives and Behaviors](#4-ui-primitives-and-behaviors)
5. [UX Flows](#5-ux-flows)
6. [Algorithms and Heuristics](#6-algorithms-and-heuristics)
7. [Traceability and Audit Model](#7-traceability-and-audit-model)
8. [Narrative → Collab Diagram Transition](#8-narrative--collab-diagram-transition)
9. [Acceptance Tests and Success Metrics](#9-acceptance-tests-and-success-metrics)
10. [Rollout Plan](#10-rollout-plan)

---

## 1. Design Principles

### 1.1 Extend, don't replace

The story layer is a **new top-level `story` key** inside the existing diagram JSON
blob (the `flow` field stored in `Diagram.java`). All existing primitives — `nodes`,
`connections`, `zones`, `phases`, `flows`, `sequence` — remain untouched. A diagram
without a `story` key behaves exactly as it does today.

### 1.2 Shared phases

Story phases **reference the same `phases` array** already in the diagram root.
`story.phases` contains phase IDs plus narrative metadata (owner, timebox, status,
hypotheses). This guarantees that transitioning from narrative view to collab diagram
preserves the phase slider position — the user sees the exact same architecture state
they were discussing in the story.

### 1.3 Binding, not embedding

Idea cards and benefits bind to architecture elements via `linkedNodes`, `linkedFlows`,
and `boundNodes` arrays containing IDs that reference `nodes[].id` and `flows[].id`.
The story never duplicates architecture data.

### 1.4 Progressive disclosure

The narrative follows a fixed reading order:
**Problem → Vision → Roadmap → Phase Comparison → Execution Details**.
Each level adds specificity. Stakeholders can stop at any level and get a coherent
picture.

---

## 2. Canonical JSON Schema

### 2.1 Root structure (extended)

The existing diagram root gains one optional key:

```
{
  "title": "...",
  "notes": "...",
  "phases": [ ... ],          // existing — unchanged
  "zones": [ ... ],           // existing — unchanged
  "nodes": [ ... ],           // existing — unchanged
  "connections": [ ... ],     // existing — unchanged
  "sequence": [ ... ],        // existing — unchanged
  "flows": [ ... ],           // existing — unchanged
  "story": { ... }            // NEW — narrative layer
}
```

**Backward compatibility**: diagrams without `story` render exactly as before.
When `story` is present, the UI enables Story Mode controls.

### 2.2 The `story` object

```json
{
  "story": {
    "storyId": "svc-migration-2026",
    "version": 1,
    "createdAt": "2026-02-20T10:00:00Z",
    "updatedAt": "2026-02-23T14:30:00Z",
    "createdBy": "pm@acme.com",

    "problem": { ... },
    "vision": { ... },
    "phases": [ ... ],
    "ideaCards": [ ... ],
    "benefits": [ ... ],
    "kpis": [ ... ],
    "bindings": [ ... ],
    "auditLog": [ ... ],

    "uiHints": {
      "initialView": "narrative",
      "initialPhase": "phase0",
      "autoTransitionToCollab": true
    }
  }
}
```

### 2.3 `story.problem`

```json
{
  "headline": "High incident triage time",
  "description": "On-call engineers spend 48+ hours on average triaging production incidents due to manual correlation of logs, metrics, and traces across 12 services.",
  "impactMetric": {
    "kpiId": "mttr_hours",
    "value": 48,
    "unit": "hours"
  },
  "evidence": [
    {
      "label": "Incident Report Nov 2025",
      "url": "incident-report-2025-11.pdf",
      "addedAt": "2026-01-15T09:00:00Z",
      "addedBy": "sre@acme.com"
    }
  ],
  "scope": ["payments-service", "checkout-api"],
  "risks": [
    "SLA breach on payment latency if MTTR exceeds 72h",
    "Team burnout from on-call rotation"
  ]
}
```

**Validation rules**:
- `headline`: required, string, max 120 chars
- `impactMetric.kpiId`: must match an entry in `story.kpis[].id`
- `scope[]`: each entry should match a `nodes[].id` (warning if not, not error)
- `evidence[].url`: required string; stored as immutable reference (see audit model)

### 2.4 `story.vision`

```json
{
  "summary": "Automated triage reduces MTTR to under 1 hour",
  "description": "An AI-assisted triage agent correlates signals across all services, suggests root cause, and auto-routes to the right team within minutes.",
  "kpiTargets": [
    {
      "kpiId": "mttr_hours",
      "min": 0.5,
      "max": 1.0,
      "confidence": "medium",
      "horizon": "6 months"
    }
  ],
  "acceptanceCriteria": [
    "MTTR p95 < 1 hour for 30 consecutive days",
    "False positive rate < 5% on auto-routing",
    "Zero increase in incident volume"
  ]
}
```

**Validation rules**:
- `summary`: required, string, max 200 chars
- `kpiTargets[].kpiId`: must match `story.kpis[].id`
- `kpiTargets[].min` < `kpiTargets[].max`
- `confidence`: enum `"low" | "medium" | "high"`

### 2.5 `story.kpis`

Global KPI definitions referenced everywhere else by `kpiId`.

```json
[
  {
    "id": "mttr_hours",
    "label": "Mean Time to Resolution",
    "unit": "hours",
    "direction": "lower_is_better",
    "baseline": 48,
    "current": 48,
    "format": "0.1f"
  },
  {
    "id": "requests_per_sec",
    "label": "Throughput",
    "unit": "req/s",
    "direction": "higher_is_better",
    "baseline": 1200,
    "current": 1200,
    "format": "0,0"
  },
  {
    "id": "latency_ms",
    "label": "P95 Latency",
    "unit": "ms",
    "direction": "lower_is_better",
    "baseline": 300,
    "current": 300,
    "format": "0"
  }
]
```

**Validation rules**:
- `id`: required, unique within `story.kpis`
- `direction`: enum `"lower_is_better" | "higher_is_better"`
- `baseline`: required number, represents the starting-state measurement
- `current`: number, updated as ideas are validated; starts equal to `baseline`

### 2.6 `story.phases`

Each entry references a phase from the root `phases[]` array and adds narrative metadata.

```json
[
  {
    "phaseRef": "skeleton",
    "label": "Legacy Baseline",
    "owner": "sre-team@acme.com",
    "timebox": "2026-Q1",
    "status": "completed",
    "description": "Current state with manual incident triage and siloed monitoring.",
    "order": 0
  },
  {
    "phaseRef": "processing",
    "label": "Agent Integration",
    "owner": "platform-team@acme.com",
    "timebox": "2026-Q2",
    "status": "active",
    "description": "Integrate AI triage agent with existing observability stack.",
    "order": 1
  },
  {
    "phaseRef": "observability",
    "label": "Full Automation",
    "owner": "platform-team@acme.com",
    "timebox": "2026-Q3",
    "status": "planned",
    "description": "Auto-routing, self-healing, and executive dashboards.",
    "order": 2
  }
]
```

**Key**: `phaseRef` must match an `id` in the root `phases[]` array. This is the
link that lets the narrative phase stepper drive the same phase slider that controls
node/zone/connection visibility in the collab diagram.

**Validation rules**:
- `phaseRef`: required, must match root `phases[].id`
- `status`: enum `"planned" | "active" | "completed"`
- `order`: required integer, monotonically increasing, matches root `phases[]` array order

### 2.7 `story.ideaCards`

```json
[
  {
    "id": "idea-routing",
    "title": "Smart Routing",
    "owner": "product@acme.com",
    "hypothesis": "Routing 20% of requests to cached path reduces API Gateway load by 30% and P95 latency by 50%",
    "linkedNodes": ["api-gateway", "cache"],
    "linkedFlows": ["cache-hit"],
    "phases": ["processing"],
    "status": "proposed",
    "confidence": "medium",
    "expectedKpiImpacts": [
      {
        "kpiId": "requests_per_sec",
        "delta": 200,
        "confidence": "medium"
      },
      {
        "kpiId": "latency_ms",
        "delta": -150,
        "confidence": "low"
      }
    ],
    "comments": [
      {
        "author": "eng@acme.com",
        "text": "Need to validate cache TTL assumptions first",
        "timestamp": "2026-02-21T11:00:00Z"
      }
    ],
    "evidenceLinks": []
  }
]
```

**Status lifecycle**: `proposed → accepted → in_progress → validated → rejected`

```
proposed ──→ accepted ──→ in_progress ──→ validated
    │            │              │
    └──→ rejected└──→ rejected  └──→ rejected
```

**Validation rules**:
- `id`: required, unique within `story.ideaCards`
- `linkedNodes[]`: each must match a `nodes[].id` (warning if not)
- `linkedFlows[]`: each must match a `flows[].id` or `"__default__"` (warning if not)
- `phases[]`: each must match a `story.phases[].phaseRef` — idea is visible/active in these phases
- `status`: enum as listed above
- `confidence`: enum `"low" | "medium" | "high"`
- `expectedKpiImpacts[].kpiId`: must match `story.kpis[].id`
- `expectedKpiImpacts[].delta`: number — positive means increase, negative means decrease (sign relative to raw value, not to "better/worse"; alignment with direction computed at render time)

### 2.8 `story.benefits`

```json
[
  {
    "id": "benefit-routing-latency",
    "phaseId": "processing",
    "title": "Routing latency reduced by 50%",
    "kpiId": "latency_ms",
    "baseline": 300,
    "targetRange": { "min": 120, "max": 180 },
    "realized": false,
    "realizedValue": null,
    "realizedAt": null,
    "boundNodes": ["api-gateway", "cache"],
    "boundFlows": ["cache-hit"]
  }
]
```

**Validation rules**:
- `kpiId`: must match `story.kpis[].id`
- `phaseId`: must match `story.phases[].phaseRef`
- `targetRange.min` < `targetRange.max`
- `boundNodes[]`: each must match `nodes[].id`
- When `realized` is `true`, `realizedValue` and `realizedAt` must be populated

### 2.9 `story.bindings`

Explicit traceability links between ideas, architecture elements, and benefits.

```json
[
  {
    "ideaId": "idea-routing",
    "nodeId": "api-gateway",
    "benefitId": "benefit-routing-latency"
  },
  {
    "ideaId": "idea-routing",
    "nodeId": "cache",
    "benefitId": "benefit-routing-latency"
  }
]
```

**Validation rules**:
- `ideaId`: must match `story.ideaCards[].id`
- `nodeId`: must match `nodes[].id` (optional — can be null for flow-only bindings)
- `benefitId`: must match `story.benefits[].id` (optional — idea may not yet have a benefit)

**Derivation**: bindings can also be computed from `ideaCards[].linkedNodes` ∩ `benefits[].boundNodes`,
but explicit bindings allow authors to curate the lineage and add precision.

### 2.10 `story.auditLog`

```json
[
  {
    "timestamp": "2026-02-21T14:30:00Z",
    "actor": "product@acme.com",
    "action": "idea.status_change",
    "targetId": "idea-routing",
    "from": "proposed",
    "to": "accepted",
    "evidenceUrl": null,
    "note": "Approved in sprint planning"
  }
]
```

See [Section 7](#7-traceability-and-audit-model) for full audit model.

### 2.11 `story.uiHints`

```json
{
  "initialView": "narrative",
  "initialPhase": "skeleton",
  "autoTransitionToCollab": true,
  "narrativeLayout": "vertical",
  "ideaOverlayDefault": false,
  "benefitLanesDefault": false
}
```

- `initialView`: `"narrative" | "collab"` — which view opens first
- `initialPhase`: phase ID to start at (references root `phases[]`)
- `autoTransitionToCollab`: if `true`, clicking "Execute" or stepping past the last narrative phase automatically transitions to the collab diagram at the matching phase

### 2.12 Complete example

```json
{
  "title": "Service Migration — Phased Architecture",
  "notes": "Migrating from manual incident triage to AI-assisted automation.",
  "phases": [
    { "id": "phase0", "label": "0 — Legacy" },
    { "id": "phase1", "label": "1 — Agent Integration" },
    { "id": "phase2", "label": "2 — Full Automation" }
  ],
  "zones": [
    { "id": "cloud", "type": "cloud", "label": "AWS", "x": 10, "y": 10, "w": 900, "h": 500 }
  ],
  "nodes": [
    { "id": "api-gateway", "type": "gateway", "tag": "aws", "label": "API\nGateway", "x": 100, "y": 100, "w": 130, "h": 85 },
    { "id": "payments-service", "type": "fargate", "tag": "core", "label": "Payments\nService", "x": 300, "y": 100, "w": 130, "h": 85 },
    { "id": "checkout-api", "type": "fargate", "tag": "core", "label": "Checkout\nAPI", "x": 300, "y": 250, "w": 130, "h": 85 },
    { "id": "cache", "type": "cache", "tag": "data", "label": "Redis\nCache", "x": 550, "y": 100, "w": 130, "h": 75, "phase": "phase1" },
    { "id": "triage-agent", "type": "agent", "tag": "agent", "label": "Triage\nAgent", "x": 550, "y": 250, "w": 130, "h": 85, "phase": "phase1" },
    { "id": "dashboard", "type": "dashboard", "tag": "observability", "label": "Ops\nDashboard", "x": 550, "y": 400, "w": 130, "h": 85, "phase": "phase2" }
  ],
  "connections": [
    { "from": "api-gateway", "to": "payments-service" },
    { "from": "api-gateway", "to": "checkout-api" },
    { "from": "api-gateway", "to": "cache", "phase": "phase1" },
    { "from": "payments-service", "to": "triage-agent", "phase": "phase1" },
    { "from": "triage-agent", "to": "dashboard", "phase": "phase2" }
  ],
  "sequence": [
    { "from": "api-gateway", "to": "payments-service", "text": "POST /pay", "status": "ready" },
    { "from": "payments-service", "to": "api-gateway", "text": "200 OK", "status": "ready" }
  ],
  "flows": [
    {
      "id": "triage-flow",
      "name": "AI Triage — Incident Auto-Route",
      "sequence": [
        { "from": "payments-service", "to": "triage-agent", "text": "Alert: latency spike", "status": "ready", "phase": "phase1" },
        { "from": "triage-agent", "to": "dashboard", "text": "Root cause: cache miss storm", "status": "ready", "phase": "phase2" }
      ]
    }
  ],
  "story": {
    "storyId": "svc-migration-2026",
    "version": 1,
    "createdAt": "2026-02-20T10:00:00Z",
    "updatedAt": "2026-02-23T14:30:00Z",
    "createdBy": "pm@acme.com",

    "problem": {
      "headline": "High incident triage time",
      "description": "On-call engineers spend 48+ hours on average triaging production incidents.",
      "impactMetric": { "kpiId": "mttr_hours", "value": 48, "unit": "hours" },
      "evidence": [
        { "label": "Incident Report Nov 2025", "url": "incident-report-2025-11.pdf", "addedAt": "2026-01-15T09:00:00Z", "addedBy": "sre@acme.com" }
      ],
      "scope": ["payments-service", "checkout-api"],
      "risks": ["SLA breach if MTTR > 72h"]
    },

    "vision": {
      "summary": "Automated triage reduces MTTR to under 1 hour",
      "description": "AI triage agent correlates signals and auto-routes to the right team.",
      "kpiTargets": [
        { "kpiId": "mttr_hours", "min": 0.5, "max": 1.0, "confidence": "medium", "horizon": "6 months" }
      ],
      "acceptanceCriteria": [
        "MTTR p95 < 1 hour for 30 days",
        "False positive rate < 5%"
      ]
    },

    "kpis": [
      { "id": "mttr_hours", "label": "Mean Time to Resolution", "unit": "hours", "direction": "lower_is_better", "baseline": 48, "current": 48, "format": "0.1f" },
      { "id": "requests_per_sec", "label": "Throughput", "unit": "req/s", "direction": "higher_is_better", "baseline": 1200, "current": 1200, "format": "0,0" },
      { "id": "latency_ms", "label": "P95 Latency", "unit": "ms", "direction": "lower_is_better", "baseline": 300, "current": 300, "format": "0" }
    ],

    "phases": [
      { "phaseRef": "phase0", "label": "Legacy Baseline", "owner": "sre-team@acme.com", "timebox": "2026-Q1", "status": "completed", "description": "Current state with manual triage.", "order": 0 },
      { "phaseRef": "phase1", "label": "Agent Integration", "owner": "platform@acme.com", "timebox": "2026-Q2", "status": "active", "description": "Integrate AI triage agent.", "order": 1 },
      { "phaseRef": "phase2", "label": "Full Automation", "owner": "platform@acme.com", "timebox": "2026-Q3", "status": "planned", "description": "Auto-routing and dashboards.", "order": 2 }
    ],

    "ideaCards": [
      {
        "id": "idea-routing",
        "title": "Smart Routing",
        "owner": "product@acme.com",
        "hypothesis": "Route 20% of requests to cached path to reduce load",
        "linkedNodes": ["api-gateway", "cache"],
        "linkedFlows": ["triage-flow"],
        "phases": ["phase1"],
        "status": "proposed",
        "confidence": "medium",
        "expectedKpiImpacts": [
          { "kpiId": "requests_per_sec", "delta": 200, "confidence": "medium" },
          { "kpiId": "latency_ms", "delta": -150, "confidence": "low" }
        ],
        "comments": [],
        "evidenceLinks": []
      }
    ],

    "benefits": [
      {
        "id": "benefit-routing-latency",
        "phaseId": "phase1",
        "title": "Routing latency reduced",
        "kpiId": "latency_ms",
        "baseline": 300,
        "targetRange": { "min": 120, "max": 180 },
        "realized": false,
        "realizedValue": null,
        "realizedAt": null,
        "boundNodes": ["api-gateway", "cache"],
        "boundFlows": ["triage-flow"]
      }
    ],

    "bindings": [
      { "ideaId": "idea-routing", "nodeId": "api-gateway", "benefitId": "benefit-routing-latency" },
      { "ideaId": "idea-routing", "nodeId": "cache", "benefitId": "benefit-routing-latency" }
    ],

    "auditLog": [
      {
        "timestamp": "2026-02-20T10:00:00Z",
        "actor": "pm@acme.com",
        "action": "story.created",
        "targetId": "svc-migration-2026",
        "from": null,
        "to": null,
        "evidenceUrl": null,
        "note": "Initial story draft"
      }
    ],

    "uiHints": {
      "initialView": "narrative",
      "initialPhase": "phase0",
      "autoTransitionToCollab": true,
      "narrativeLayout": "vertical",
      "ideaOverlayDefault": false,
      "benefitLanesDefault": false
    }
  }
}
```

---

## 3. API Surface

The story is embedded in the diagram's `flow` JSON blob. No separate persistence
table is needed — stories are saved and loaded via the existing
`PUT /api/diagrams/{id}` endpoint. The new endpoints provide convenience operations
that read/modify specific sections of the `flow.story` object.

### 3.1 Story CRUD

All story endpoints nest under the diagram:

#### Read story

```
GET /api/diagrams/{diagramId}/story
```

**Response 200**:
```json
{
  "storyId": "svc-migration-2026",
  "problem": { ... },
  "vision": { ... },
  "phases": [ ... ],
  "ideaCards": [ ... ],
  "benefits": [ ... ],
  "kpis": [ ... ],
  "bindings": [ ... ]
}
```

**Response 404**: diagram not found or diagram has no `story` key.

#### Create / replace story

```
PUT /api/diagrams/{diagramId}/story
Content-Type: application/json

{ "storyId": "...", "problem": { ... }, ... }
```

**Behavior**: sets `flow.story` on the diagram, increments diagram version, returns
the full story object.

**Response 200**: updated story.
**Response 400**: validation errors (array of `{ "path": "$.problem.headline", "message": "required" }`).
**Response 404**: diagram not found.

#### Delete story

```
DELETE /api/diagrams/{diagramId}/story
```

**Response 204**: story removed from diagram.
**Response 404**: diagram not found.

### 3.2 Idea card operations

#### List ideas

```
GET /api/diagrams/{diagramId}/story/ideas?phase={phaseRef}&status={status}
```

**Response 200**: filtered array of idea cards.

#### Create idea

```
POST /api/diagrams/{diagramId}/story/ideas
Content-Type: application/json

{
  "title": "Smart Routing",
  "owner": "product@acme.com",
  "hypothesis": "...",
  "linkedNodes": ["api-gateway", "cache"],
  "phases": ["phase1"],
  "confidence": "medium",
  "expectedKpiImpacts": [...]
}
```

**Response 201**: created idea with generated `id`.
**Side effect**: appends `idea.created` to `story.auditLog`.

#### Update idea status

```
PATCH /api/diagrams/{diagramId}/story/ideas/{ideaId}
Content-Type: application/json

{
  "status": "validated",
  "evidenceUrl": "https://grafana.acme.com/d/abc123",
  "note": "Confirmed 45% latency reduction in canary"
}
```

**Response 200**: updated idea card.
**Side effect**: appends `idea.status_change` to `story.auditLog`. If new status
is `validated`, triggers benefit realization check (see Section 6.4).

**Error 403**: caller does not have `editor` role.
**Error 409**: invalid status transition (e.g., `validated → proposed`).

### 3.3 Benefit operations

#### Create benefit

```
POST /api/diagrams/{diagramId}/story/benefits
Content-Type: application/json

{
  "phaseId": "phase1",
  "title": "Latency reduced",
  "kpiId": "latency_ms",
  "baseline": 300,
  "targetRange": { "min": 120, "max": 180 },
  "boundNodes": ["api-gateway", "cache"]
}
```

**Response 201**: created benefit.
**Side effect**: appends `benefit.created` to `story.auditLog`.

#### Mark benefit realized

```
PATCH /api/diagrams/{diagramId}/story/benefits/{benefitId}
Content-Type: application/json

{
  "realized": true,
  "realizedValue": 155
}
```

**Response 200**: updated benefit.
**Side effect**: updates `story.kpis[].current` for the matching KPI. Appends
`benefit.realized` to `story.auditLog`.

### 3.4 KPI snapshot

```
GET /api/diagrams/{diagramId}/story/kpis?phase={phaseRef}
```

**Response 200**:
```json
[
  {
    "id": "latency_ms",
    "label": "P95 Latency",
    "unit": "ms",
    "baseline": 300,
    "current": 300,
    "projected": 155,
    "projectedConfidence": "medium",
    "targetMin": 120,
    "targetMax": 180,
    "phase": "phase1"
  }
]
```

The `projected` field comes from the simulation engine (Section 6).

### 3.5 Simulation

```
POST /api/diagrams/{diagramId}/story/simulate
Content-Type: application/json

{
  "phaseRef": "phase1",
  "ideaIds": ["idea-routing", "idea-caching"],
  "model": "additive"
}
```

**Response 200**:
```json
{
  "phaseRef": "phase1",
  "model": "additive",
  "results": [
    {
      "kpiId": "latency_ms",
      "baseline": 300,
      "estimatedValue": 155,
      "delta": -145,
      "confidenceInterval": { "low": 130, "high": 190 },
      "aggregatedConfidence": "medium",
      "contributingIdeas": [
        { "ideaId": "idea-routing", "delta": -150, "confidence": "low" },
        { "ideaId": "idea-caching", "delta": 5, "confidence": "high" }
      ]
    }
  ],
  "warnings": [
    "idea-routing has low confidence for latency_ms; consider gathering more evidence"
  ]
}
```

**Error 400**: unknown ideaId or phaseRef.

### 3.6 Export

```
GET /api/diagrams/{diagramId}/story/export?format={json|html}
```

**Response 200** (`format=json`): machine-readable export with full story, current
KPI state, and audit log.

**Response 200** (`format=html`): human-readable narrative document with embedded
diagrams (phase snapshots as SVG), KPI tables, idea cards, and benefit summary.

### 3.7 Error format

All error responses follow:
```json
{
  "status": 400,
  "error": "Validation Failed",
  "details": [
    { "path": "$.ideaCards[0].linkedNodes[1]", "message": "node 'nonexistent' not found in diagram" }
  ]
}
```

---

## 4. UI Primitives and Behaviors

Components are listed in priority order (P0 = MVP, P1 = second release, P2 = third).

### 4.1 Story Mode Toggle (P0)

A toggle in the header bar that switches between Narrative View and Collab Diagram View.

| Property | Value |
|----------|-------|
| Position | Header bar, after flow selector |
| States | `narrative` (book icon), `collab` (grid icon) |
| Default | `story.uiHints.initialView` |
| Behavior | Switching to `collab` sets the phase slider to the current narrative phase. Switching to `narrative` reads the current phase slider position. |
| Keyboard | `Ctrl+Shift+S` toggles |
| Aria | `role="switch"`, `aria-label="Toggle story mode"` |

### 4.2 Problem Card (P0)

Displayed as the first panel in narrative view.

| Property | Type | Description |
|----------|------|-------------|
| `headline` | string | Large bold text |
| `description` | string | Body text, 2-3 lines |
| `impactMetric` | object | Rendered as a large KPI badge: value + unit |
| `scope` | string[] | Rendered as clickable chips; clicking highlights the node in the collab diagram |
| `risks` | string[] | Rendered as amber warning chips |
| `evidence` | object[] | Rendered as linked document icons |

**Events**: `onScopeNodeClick(nodeId)` — transitions to collab view and highlights node.
**Style**: Red/amber gradient background to convey urgency.
**Accessibility**: `role="region"`, `aria-labelledby="problem-headline"`.

### 4.3 Vision Panel (P0)

Displayed below/after the Problem Card.

| Property | Type | Description |
|----------|------|-------------|
| `summary` | string | Large text, single line |
| `description` | string | Explanatory paragraph |
| `kpiTargets` | object[] | Rendered as target range bars (min-max with confidence color) |
| `acceptanceCriteria` | string[] | Rendered as a checklist |

**Events**: `onKpiTargetClick(kpiId)` — scrolls/opens KPI HUD for that metric.
**Style**: Green/teal gradient to convey aspiration.
**Accessibility**: `role="region"`, `aria-labelledby="vision-summary"`.

### 4.4 Phase Stepper (P0)

A horizontal stepper that replaces/supplements the existing phase slider when in narrative view.

| Property | Type | Description |
|----------|------|-------------|
| `phases` | StoryPhase[] | From `story.phases` |
| `currentPhase` | string | Active phase ref |
| `onPhaseChange` | event | Fires when user clicks a phase step |

**Behavior**:
- Each step shows: label, owner, timebox, status badge (planned/active/completed)
- Completed phases have a green checkmark
- Active phase pulses subtly
- Clicking a phase updates the root phase slider position (shared state)
- Phase transition animates KPI HUD values (see Section 6.4)

**Confidence color coding**:
- Completed: solid green border
- Active: blue border with pulse
- Planned with high confidence: solid gray border
- Planned with medium confidence: dashed gray border
- Planned with low confidence: dotted gray border

**Accessibility**: `role="tablist"`, each phase is `role="tab"`.

### 4.5 KPI HUD (P0)

Heads-up display showing current KPI values, positioned in the top-right.

| Property | Type | Description |
|----------|------|-------------|
| `kpis` | StoryKpi[] | From `story.kpis` |
| `phase` | string | Current phase ref — determines which projected values to show |
| `showProjected` | boolean | Whether to show simulation projections |

**Rendering per KPI**:
- Label and current value (large number)
- Baseline value (small, struck through if improved)
- Target range bar (green zone = target, current position = marker)
- Confidence band (shaded area around projected value)
- Delta indicator (up/down arrow, green if moving in `direction`, red if not)

**Animation**: when phase changes, KPI values tween from old to new over 400ms using
ease-out interpolation.

**Accessibility**: `role="status"`, `aria-live="polite"` for value changes.

### 4.6 Idea Card (P1)

Floating card that can be pinned near its linked nodes on the collab diagram, or
displayed in a list in narrative view.

| Property | Type | Description |
|----------|------|-------------|
| `idea` | IdeaCard | Full idea object |
| `position` | {x, y} | Computed from linked nodes' centroid, or manual |
| `expanded` | boolean | Collapsed = title + status badge; expanded = full details |

**Collapsed view**: title, confidence dot (green/yellow/red), status badge.
**Expanded view**: hypothesis, owner, linked nodes (clickable), expected KPI impacts (mini-bars), comments, evidence links.

**Events**:
- `onNodeLink(nodeId)` — highlights node in collab diagram
- `onStatusChange(newStatus)` — triggers status change flow (with audit)
- `onSimulate()` — runs simulation with this idea included

**Accessibility**: `role="article"`, `aria-expanded` for collapse state.

### 4.7 Benefit Lane (P1)

Horizontal lane below the collab diagram canvas showing benefits for the current phase.

| Property | Type | Description |
|----------|------|-------------|
| `benefits` | Benefit[] | Filtered by current phase |
| `onBenefitClick` | event | Highlights bound nodes/flows and opens originating idea card |

**Rendering per benefit**:
- Title, KPI badge (baseline → target), realized indicator (check/pending)
- Click highlights `boundNodes` and `boundFlows` on the collab diagram
- Realized benefits glow green; unrealized are dimmed

**Accessibility**: `role="list"`, each benefit is `role="listitem"`.

### 4.8 Alignment Indicator (P1)

Visual glow on nodes/connections that are well-aligned with an idea's direction.

| Property | Type | Description |
|----------|------|-------------|
| `threshold` | number | Alignment score above which glow activates (default: 0.7) |
| `color` | string | Glow color (default: `rgba(0, 200, 100, 0.4)`) |

**Behavior**: when the Idea Overlay is active, each bound node gets a CSS glow
whose intensity is proportional to the alignment score (see Section 6.1). Nodes
above threshold get a pulsing border.

### 4.9 Execution Drilldown (P2)

When viewing a flow in collab diagram mode with story enabled, each sequence step
can show annotations for bound ideas and acceptance checks.

| Property | Type | Description |
|----------|------|-------------|
| `step` | SequenceStep | The flow step |
| `boundIdeas` | IdeaCard[] | Ideas whose `linkedNodes` include `step.from` or `step.to` |
| `acceptanceChecks` | string[] | From the benefit's acceptance criteria |

**Behavior**: in the sequence diagram view, steps bound to ideas show a small idea
icon. Hovering reveals the idea title, hypothesis, and acceptance status.

### 4.10 Phase Comparison Panel (P2)

Side-by-side or before/after view showing architecture at two different phases with
KPI deltas.

| Property | Type | Description |
|----------|------|-------------|
| `leftPhase` | string | Phase ref for "before" |
| `rightPhase` | string | Phase ref for "after" |
| `kpiDeltas` | object[] | Computed differences |

**Rendering**: two mini-canvases showing the architecture at each phase with a KPI
delta summary bar in between. Nodes added in the right phase are highlighted green;
nodes removed are struck through red.

---

## 5. UX Flows

### 5.1 Authoring a story

```
Step  Action                                           Outcome
─────────────────────────────────────────────────────────────────────
1     Open diagram in editor                           JSON editor visible on left
2     In JSON, add "story": {} to root                 Story Mode toggle appears in header
3     Click Story Mode → narrative                     Blank narrative canvas with prompts
4     Fill in Problem: headline, impact metric         Problem Card renders
5     Fill in Vision: summary, KPI targets             Vision Panel renders below Problem
6     Define KPIs array                                KPI HUD appears in top-right
7     story.phases already bound to root phases        Phase Stepper renders with labels
8     Add first idea card                              Idea Card appears in phase step
9     Set linkedNodes on idea                          Idea Card pins near those nodes
10    Add benefit with boundNodes                      Benefit Lane shows for that phase
11    Add binding connecting idea → node → benefit     Lineage chain complete
12    Save diagram                                     PUT /api/diagrams/{id} persists all
```

**Acceptance criteria**:
- [ ] Steps 3-8 complete in under 90 seconds for experienced user
- [ ] Validation errors shown inline as user types
- [ ] Story Mode toggle is visible when `story` key exists in JSON

### 5.2 Presenting a story

```
Step  Action                                           Outcome
─────────────────────────────────────────────────────────────────────
1     Open diagram with story                          Loads in narrative view (per uiHints)
2     Problem Card and Vision Panel shown              High-level framing for stakeholders
3     Click phase 1 on Phase Stepper                   Roadmap highlights phase 1
4     KPI HUD animates from baseline to projected      Shows expected impact
5     Idea cards for phase 1 expand                    Hypotheses visible
6     Click "View Architecture" or toggle to collab    Transitions to collab diagram at phase 1
7     Nodes bound to ideas glow                        Architecture-narrative link visible
8     Play flow animation                              Sequence runs, idea annotations visible
9     Step to phase 2 on Phase Stepper                 New nodes/zones appear, KPIs update
10    Toggle Benefit Lane                              Benefits for phase 2 shown below canvas
```

**Acceptance criteria**:
- [ ] Phase transition animates KPI values within 600ms
- [ ] Transition from narrative to collab preserves phase position
- [ ] Back-and-forth toggling does not lose scroll position or state

### 5.3 Validating an idea

```
Step  Action                                           Outcome
─────────────────────────────────────────────────────────────────────
1     Idea is in "in_progress" status                  Card shows amber indicator
2     Gather evidence (external)                       User obtains URL/document
3     PATCH idea status → "validated" with evidence    Audit log entry created
4     Linked benefits check target range               If KPI current in target → realized=true
5     KPI HUD updates current value                    Animated transition
6     Benefit Lane shows green checkmark               Visible confirmation
7     Export story                                     Audit trail includes validation record
```

**Acceptance criteria**:
- [ ] Status change rejected without editor role
- [ ] Audit log entry contains actor, timestamp, evidence URL
- [ ] KPI current value updates only after benefit realization

### 5.4 Exporting a story

```
Step  Action                                           Outcome
─────────────────────────────────────────────────────────────────────
1     Click Export in options menu                      Format selector: JSON or HTML
2     Select JSON                                      Downloads machine-readable payload
3     Select HTML                                      Downloads human-readable document
4     HTML includes: problem, vision, phase table,     Complete narrative
      idea cards, KPI summary, benefit status,
      architecture snapshots per phase (SVG),
      and audit log summary
5     JSON includes: full story object + diagram       Machine-parseable for audit tools
      metadata (title, version, timestamps)
```

**Acceptance criteria**:
- [ ] JSON export validates against the canonical schema
- [ ] HTML export renders correctly in a browser without external dependencies
- [ ] Audit log is included in both formats

---

## 6. Algorithms and Heuristics

### 6.1 Alignment detector

Computes how well an idea's "direction" aligns with the global improvement direction.

**Concept**: each idea implies a directional change on each KPI it affects. The global
direction is defined by the vision's KPI targets. Alignment measures whether the idea
pushes KPIs toward or away from the target.

```
FUNCTION computeAlignmentScore(idea, kpis, visionTargets):
    scores = []
    FOR EACH impact IN idea.expectedKpiImpacts:
        kpi = FIND kpis WHERE id = impact.kpiId
        target = FIND visionTargets WHERE kpiId = impact.kpiId

        IF kpi IS NULL OR target IS NULL:
            CONTINUE

        // Direction: does the delta move the KPI toward the target midpoint?
        targetMid = (target.min + target.max) / 2
        currentDistance = ABS(kpi.current - targetMid)
        projectedDistance = ABS((kpi.current + impact.delta) - targetMid)

        IF currentDistance == 0:
            directionScore = 1.0
        ELSE:
            directionScore = (currentDistance - projectedDistance) / currentDistance
            directionScore = CLAMP(directionScore, -1.0, 1.0)

        // Weight by confidence
        confidenceWeight = CASE impact.confidence:
            "high"   → 1.0
            "medium" → 0.7
            "low"    → 0.4

        scores.APPEND(directionScore * confidenceWeight)

    IF scores IS EMPTY:
        RETURN 0.0

    RETURN AVERAGE(scores)
```

**Output**: score in [-1.0, 1.0].
- ≥ 0.7: strong alignment (green glow)
- 0.3 – 0.7: moderate alignment (subtle glow)
- < 0.3: weak or misaligned (no glow, optional amber warning)

**Complexity**: O(I * K) where I = number of impacts per idea, K = number of KPIs.
Typically I < 5, K < 20, so effectively O(1) per idea.

**Example**:
```
Input:
  idea.expectedKpiImpacts = [{ kpiId: "latency_ms", delta: -150, confidence: "medium" }]
  kpis = [{ id: "latency_ms", current: 300 }]
  visionTargets = [{ kpiId: "latency_ms", min: 120, max: 180 }]

  targetMid = 150
  currentDistance = |300 - 150| = 150
  projectedDistance = |150 - 150| = 0
  directionScore = (150 - 0) / 150 = 1.0
  confidenceWeight = 0.7
  score = 1.0 * 0.7 = 0.7  → strong alignment (green glow)
```

### 6.2 KPI simulation engine

Accepts a set of idea cards and computes estimated KPI deltas with confidence intervals.

```
FUNCTION simulate(ideaIds, phaseRef, kpis, allIdeas, model="additive"):
    selectedIdeas = FILTER allIdeas WHERE id IN ideaIds AND phaseRef IN phases
    results = {}

    FOR EACH kpi IN kpis:
        impacts = []
        FOR EACH idea IN selectedIdeas:
            FOR EACH impact IN idea.expectedKpiImpacts:
                IF impact.kpiId == kpi.id:
                    impacts.APPEND(impact)

        IF impacts IS EMPTY:
            CONTINUE

        estimated = kpi.baseline
        confidenceIntervalLow = kpi.baseline
        confidenceIntervalHigh = kpi.baseline
        contributingIdeas = []

        IF model == "additive":
            FOR EACH impact IN impacts:
                estimated += impact.delta
                // Confidence band: widen interval based on confidence
                spread = CASE impact.confidence:
                    "high"   → ABS(impact.delta) * 0.1
                    "medium" → ABS(impact.delta) * 0.3
                    "low"    → ABS(impact.delta) * 0.6
                confidenceIntervalLow += impact.delta - spread
                confidenceIntervalHigh += impact.delta + spread
                contributingIdeas.APPEND({ ideaId: impact.ideaId, delta: impact.delta })

        ELSE IF model == "multiplicative":
            multiplier = 1.0
            spreadLow = 1.0
            spreadHigh = 1.0
            FOR EACH impact IN impacts:
                factor = 1 + (impact.delta / kpi.baseline)
                multiplier *= factor
                spread = CASE impact.confidence:
                    "high"   → 0.05
                    "medium" → 0.15
                    "low"    → 0.30
                spreadLow *= (factor - spread)
                spreadHigh *= (factor + spread)
                contributingIdeas.APPEND({ ideaId: impact.ideaId, delta: impact.delta })
            estimated = kpi.baseline * multiplier
            confidenceIntervalLow = kpi.baseline * spreadLow
            confidenceIntervalHigh = kpi.baseline * spreadHigh

        // Aggregate confidence = lowest contributing confidence
        aggregatedConfidence = MIN(impacts.map(i → i.confidence),
                                   ordered: high > medium > low)

        results[kpi.id] = {
            baseline: kpi.baseline,
            estimatedValue: ROUND(estimated),
            delta: ROUND(estimated - kpi.baseline),
            confidenceInterval: {
                low: ROUND(confidenceIntervalLow),
                high: ROUND(confidenceIntervalHigh)
            },
            aggregatedConfidence,
            contributingIdeas
        }

    // Generate warnings
    warnings = []
    FOR EACH kpi IN results:
        FOR EACH idea IN kpi.contributingIdeas:
            IF idea.confidence == "low":
                warnings.APPEND(
                    idea.ideaId + " has low confidence for " + kpi.id
                )

    RETURN { phaseRef, model, results, warnings }
```

**Conflict resolution**: when multiple ideas affect the same KPI:
- **Additive model** (default): deltas are summed. Use when impacts are independent.
- **Multiplicative model**: deltas are treated as percentage changes that compound. Use when impacts interact (e.g., two caching layers).

**Complexity**: O(I * K) where I = total idea count, K = KPI count. For 50 ideas and 20 KPIs, this is ~1000 operations — trivial.

**Example (additive)**:
```
Input:
  ideas = [
    { id: "idea-routing", expectedKpiImpacts: [{ kpiId: "latency_ms", delta: -150, confidence: "low" }] },
    { id: "idea-caching", expectedKpiImpacts: [{ kpiId: "latency_ms", delta: 5, confidence: "high" }] }
  ]
  kpis = [{ id: "latency_ms", baseline: 300 }]

Output:
  latency_ms:
    estimated = 300 + (-150) + 5 = 155
    confidenceIntervalLow = 300 + (-150 - 90) + (5 - 0.5) = 64.5
    confidenceIntervalHigh = 300 + (-150 + 90) + (5 + 0.5) = 245.5
    aggregatedConfidence = "low"
    warnings = ["idea-routing has low confidence for latency_ms"]
```

### 6.3 Confidence-weighted expected value

Used by the KPI HUD to show a single "best estimate" value accounting for confidence.

```
FUNCTION confidenceWeightedValue(kpi, simulationResult):
    baseline = kpi.baseline
    estimated = simulationResult.estimatedValue
    ci = simulationResult.confidenceInterval

    // Weight: how much do we trust the estimate vs the baseline?
    weight = CASE simulationResult.aggregatedConfidence:
        "high"   → 0.9
        "medium" → 0.6
        "low"    → 0.3

    expectedValue = baseline + (estimated - baseline) * weight

    // Confidence band for display
    bandLow = baseline + (ci.low - baseline) * weight
    bandHigh = baseline + (ci.high - baseline) * weight

    RETURN { expectedValue, bandLow, bandHigh, weight }
```

**Example**:
```
  baseline = 300, estimated = 155, confidence = "low", weight = 0.3
  expectedValue = 300 + (155 - 300) * 0.3 = 300 - 43.5 = 256.5
  (Conservatively shows less improvement when confidence is low)
```

### 6.4 KPI transition animation

When the phase stepper advances, KPI values tween smoothly.

```
FUNCTION animateKpiTransition(kpiElement, fromValue, toValue, durationMs=400):
    startTime = NOW()
    easingFn = easeOutCubic  // t → 1 - (1-t)^3

    FUNCTION frame():
        elapsed = NOW() - startTime
        progress = CLAMP(elapsed / durationMs, 0, 1)
        easedProgress = easingFn(progress)

        currentValue = fromValue + (toValue - fromValue) * easedProgress
        kpiElement.setText(FORMAT(currentValue, kpi.format))

        // Update color: green if moving toward target, red if away
        IF isMovingTowardTarget(kpi, fromValue, currentValue):
            kpiElement.setColor(INTERPOLATE_COLOR(neutral, green, easedProgress))
        ELSE:
            kpiElement.setColor(INTERPOLATE_COLOR(neutral, red, easedProgress))

        IF progress < 1:
            requestAnimationFrame(frame)

    requestAnimationFrame(frame)
```

**Performance**: single `requestAnimationFrame` loop per KPI. For 20 KPIs, this is
20 DOM updates per frame — well within 60fps budget on modern hardware.

### 6.5 Benefit realization check

Triggered when an idea is validated.

```
FUNCTION checkBenefitRealization(validatedIdea, benefits, kpis):
    FOR EACH binding IN story.bindings WHERE ideaId == validatedIdea.id:
        benefit = FIND benefits WHERE id == binding.benefitId
        IF benefit IS NULL OR benefit.realized:
            CONTINUE

        kpi = FIND kpis WHERE id == benefit.kpiId

        // Check if all ideas bound to this benefit are validated
        boundIdeaIds = story.bindings
            .FILTER(b → b.benefitId == benefit.id)
            .MAP(b → b.ideaId)
            .UNIQUE()

        allValidated = ALL(
            boundIdeaIds.MAP(id → FIND ideaCards WHERE id).MAP(i → i.status == "validated")
        )

        IF allValidated:
            // Check if KPI current is within target range
            IF kpi.current >= benefit.targetRange.min AND kpi.current <= benefit.targetRange.max:
                benefit.realized = true
                benefit.realizedValue = kpi.current
                benefit.realizedAt = NOW()
                APPEND auditLog: benefit.realized event
            ELSE:
                // All ideas validated but KPI not in target — partial success
                APPEND warning: "All ideas validated but KPI " + kpi.id +
                    " (" + kpi.current + ") not in target range [" +
                    benefit.targetRange.min + ", " + benefit.targetRange.max + "]"
```

---

## 7. Traceability and Audit Model

### 7.1 Audit log entries

Every mutation to idea status, benefit realization, and KPI values is recorded.

| Action | Fields recorded |
|--------|-----------------|
| `story.created` | actor, timestamp |
| `story.updated` | actor, timestamp, changed fields |
| `idea.created` | actor, timestamp, ideaId, initial status |
| `idea.status_change` | actor, timestamp, ideaId, from, to, evidenceUrl, note |
| `idea.updated` | actor, timestamp, ideaId, changed fields |
| `benefit.created` | actor, timestamp, benefitId |
| `benefit.realized` | actor, timestamp, benefitId, realizedValue |
| `kpi.updated` | actor, timestamp, kpiId, from, to, reason |
| `simulation.run` | actor, timestamp, phaseRef, ideaIds, model, results summary |
| `story.exported` | actor, timestamp, format |

### 7.2 Evidence storage

Evidence URLs are **immutable references**. Once an evidence entry is added (to
`problem.evidence`, `ideaCard.evidenceLinks`, or an audit log entry), it cannot be
modified — only new evidence can be appended.

```json
{
  "label": "Grafana dashboard showing 45% improvement",
  "url": "https://grafana.acme.com/d/abc123?from=1708300800&to=1708387200",
  "addedAt": "2026-02-21T14:30:00Z",
  "addedBy": "eng@acme.com",
  "sha256": "a1b2c3..."
}
```

The optional `sha256` field allows verification that the linked document hasn't changed.

### 7.3 Role-based access

| Role | Permissions |
|------|-------------|
| `viewer` | Read story, view narrative/collab, export |
| `editor` | All viewer + create/edit ideas, change status, add evidence, add benefits |
| `admin` | All editor + delete story, modify audit log retention, manage roles |

**Enforcement**: the API checks `X-User-Role` header (or session-based auth).
`idea.status_change` requires `editor` or `admin`.

### 7.4 Export format

The JSON export includes:

```json
{
  "exportedAt": "2026-02-23T15:00:00Z",
  "exportedBy": "pm@acme.com",
  "diagram": {
    "id": "...",
    "title": "...",
    "version": 3
  },
  "story": { "...full story object..." },
  "kpiSnapshot": [
    { "kpiId": "mttr_hours", "baseline": 48, "current": 2.1, "target": "0.5-1.0" }
  ],
  "auditLog": [ "...full audit log..." ],
  "ideaSummary": {
    "total": 5,
    "proposed": 1,
    "accepted": 1,
    "inProgress": 1,
    "validated": 2,
    "rejected": 0
  },
  "benefitSummary": {
    "total": 3,
    "realized": 1,
    "pending": 2
  }
}
```

---

## 8. Narrative → Collab Diagram Transition

This is the critical UX requirement: the story's first phase of narrative must
**smoothly transition into the collab diagram** using the same phase system.

### 8.1 Shared state model

```
                          ┌─────────────────────┐
                          │   Shared Phase State │
                          │  (selectedPhaseIndex)│
                          └──────────┬──────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                                  │
              ┌─────▼──────┐                    ┌──────▼─────┐
              │  Narrative  │                    │   Collab   │
              │    View     │                    │  Diagram   │
              │             │                    │            │
              │ Phase       │  ←── same index ──→│ Phase      │
              │ Stepper     │                    │ Slider     │
              │             │                    │            │
              │ KPI HUD     │  ←── same data ──→│ KPI HUD    │
              │             │                    │            │
              │ Idea Cards  │  ←── same list ──→│ Idea       │
              │ (list)      │                    │ Overlay    │
              └─────────────┘                    └────────────┘
```

The phase index is a single variable. Both views read from and write to it.
When the user steps to "Phase 1 — Agent Integration" in the narrative view and then
clicks "View Architecture", the collab diagram renders with the phase slider at
position 1 — showing exactly the nodes, zones, connections, and flows that belong
to phases ≤ 1.

### 8.2 Transition sequence

```
1. User is in Narrative View at phase N
2. User clicks "View Architecture" (or Story Mode toggle → collab)
3. Transition animation:
   a. Narrative panels fade out (200ms, ease-in)
   b. Collab diagram canvas fades in (200ms, ease-out)
   c. Phase slider snaps to index N (no animation — already in sync)
   d. Nodes bound to active ideas get a 500ms glow pulse
   e. KPI HUD remains visible (no re-render, just repositions)
4. User is now in Collab Diagram View at phase N
5. User can:
   - Play flow animations (filtered by phase N)
   - Toggle Idea Overlay to see idea cards pinned on nodes
   - Toggle Benefit Lanes to see benefits for phase N
   - Step phases via the slider (updates narrative phase too)
6. User clicks Story Mode toggle → narrative
7. Transition reverses:
   a. Collab diagram fades out
   b. Narrative panels fade in at phase N
   c. Phase Stepper highlights phase N
```

**Total transition time**: 400ms (200ms out + 200ms in).

### 8.3 Implementation in existing codebase

The existing `collab-animation.html` already has:
- `selectedPhase` variable (line ~928)
- `isVisibleInPhase()` function
- Phase slider input element (`#phase-slider`)

The narrative view will be a new `<div id="narrative-view">` that is shown/hidden
alongside the existing `<div id="stage">`. The shared state:

```javascript
// Existing
var selectedPhase = 0;

// New: story mode state
var storyMode = 'collab'; // 'narrative' | 'collab'
var storyData = null;     // parsed from graph.story

function toggleStoryMode() {
    if (storyMode === 'narrative') {
        storyMode = 'collab';
        fadeOut('narrative-view', 200, function() {
            fadeIn('stage', 200);
            pulseIdeaBoundNodes(selectedPhase);
        });
    } else {
        storyMode = 'narrative';
        fadeOut('stage', 200, function() {
            fadeIn('narrative-view', 200);
            renderNarrativeAtPhase(selectedPhase);
        });
    }
}

// Phase change — drives both views
function onPhaseChange(newIndex) {
    var oldKpiValues = snapshotKpiValues(selectedPhase);
    selectedPhase = newIndex;
    document.getElementById('phase-slider').value = newIndex;

    // Existing behavior: re-render visible nodes/zones/connections
    renderSpatial();
    resolveActiveSequence();

    // New: update narrative + animate KPIs
    if (storyData) {
        var newKpiValues = computeKpiValuesAtPhase(selectedPhase);
        animateKpiHud(oldKpiValues, newKpiValues, 400);
        renderNarrativeAtPhase(selectedPhase);
    }
}
```

### 8.4 Phase mapping guarantee

`story.phases[i].phaseRef === root.phases[i].id` for all i.

This is enforced by validation. If the arrays are out of sync, the UI shows a
warning and falls back to root phases only. The `order` field in `story.phases`
must match the array index of the corresponding root phase.

---

## 9. Acceptance Tests and Success Metrics

### 9.1 Functional acceptance tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| F1 | Story JSON loads all panels | Load diagram with `story` key | Problem Card, Vision Panel, Phase Stepper, KPI HUD all render |
| F2 | Phase stepper drives collab diagram | Click phase 1 in narrative → toggle to collab | Collab diagram shows phase ≤ 1 nodes/zones/connections |
| F3 | Idea overlay highlights nodes | Enable Idea Overlay on phase 1 | Idea cards appear near `linkedNodes`, nodes get alignment glow |
| F4 | Benefit click traces lineage | Click benefit in Benefit Lane | Bound nodes highlight, originating idea card expands |
| F5 | Phase transition animates KPIs | Step from phase 0 to phase 1 | KPI HUD values tween from baseline to projected within 600ms |
| F6 | Idea validation updates benefits | PATCH idea → validated | `benefit.realized` toggles, KPI HUD updates `current` |
| F7 | Simulation returns deltas | POST /simulate with 2 ideas | Returns per-KPI estimated values with confidence intervals |
| F8 | Export includes full audit | GET /export?format=json | Response contains story, kpiSnapshot, auditLog, summaries |
| F9 | Missing story key → no change | Load diagram without `story` | Behaves exactly as current v0.2.0 |
| F10 | Invalid story → validation errors | PUT /story with missing `problem.headline` | 400 response with path and message |

### 9.2 Performance targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Phase transition render | < 50ms | Time from `onPhaseChange` to last DOM mutation, 200 nodes + 50 ideas |
| KPI animation | 60fps | No dropped frames during 400ms tween, Chrome DevTools Performance |
| Narrative → collab transition | < 400ms | Time from click to interactive collab diagram |
| Simulation computation | < 10ms | Time for `simulate()` with 50 ideas, 20 KPIs |
| Story JSON parse + validate | < 20ms | Time for JSON.parse + schema validation on 500KB payload |
| Export (JSON) | < 100ms | Server response time for JSON export |
| Export (HTML) | < 2s | Server response time for HTML export with SVG snapshots |

### 9.3 Usability targets

| Metric | Target |
|--------|--------|
| Author a phase + idea with baseline | < 90 seconds (experienced user) |
| Present problem-to-execution walkthrough | < 5 minutes for a 3-phase story |
| Find the idea behind a highlighted node | 1 click (click node → idea card opens) |
| Export audit-ready artifact | 2 clicks (Export → format) |

### 9.4 Security and governance tests

| # | Test | Expected |
|---|------|----------|
| S1 | Viewer tries to change idea status | 403 Forbidden |
| S2 | Editor changes idea status | 200 OK, audit log entry created |
| S3 | Evidence URL added | Immutable — cannot be modified, only appended |
| S4 | Audit log is append-only | No API allows deletion of audit log entries |
| S5 | Export contains all audit entries | No filtering or redaction of audit log |

---

## 10. Rollout Plan

### Phase R0: Foundation (MVP — 2-3 weeks)

**Goal**: render a story in narrative view and transition to collab diagram.

- [ ] Extend JSON schema: add `story` key to spec, update `json_spec.txt`
- [ ] Add JSON validation for `story` object on the server side
- [ ] Build Problem Card and Vision Panel components in `collab-animation.html`
- [ ] Build Phase Stepper that drives the existing phase slider
- [ ] Build KPI HUD with static values (no animation yet)
- [ ] Implement Story Mode toggle (narrative ↔ collab transition)
- [ ] Ensure backward compatibility: no `story` → no change
- [ ] Create one example JSON: `svc-migration-story.json`
- [ ] Write functional tests F1, F2, F9

**Acceptance**: a user can load a story JSON, see Problem/Vision/Roadmap, step through
phases, and toggle to collab diagram at the correct phase.

### Phase R1: Interaction (3-4 weeks)

**Goal**: idea cards, benefits, simulation, and bindings.

- [ ] Build Idea Card component (collapsed/expanded)
- [ ] Build Idea Overlay mode on collab diagram
- [ ] Build Benefit Lane component
- [ ] Implement binding highlight (click benefit → highlight nodes/flows)
- [ ] Implement alignment detector (Section 6.1)
- [ ] Implement KPI simulation engine (Section 6.2)
- [ ] Add KPI transition animation (Section 6.4)
- [ ] Add story sub-routes to API (Section 3.2-3.5)
- [ ] Write functional tests F3, F4, F5, F6, F7

**Acceptance**: users can create ideas, simulate KPI impacts, step through phases with
animated KPIs, and see lineage from benefit → idea → node.

### Phase R2: Governance and Export (2-3 weeks)

**Goal**: audit trail, export, and role-based access.

- [ ] Implement audit log recording for all mutations
- [ ] Implement role-based access checks on status change API
- [ ] Build JSON export endpoint
- [ ] Build HTML export with SVG phase snapshots
- [ ] Build Phase Comparison Panel (before/after)
- [ ] Build Execution Drilldown annotations on sequence steps
- [ ] Write functional tests F8, F10 and security tests S1-S5

**Acceptance**: exported artifacts contain complete audit trail, only editors can
change idea status, and the HTML export renders a complete narrative document.

### Phase R3: Polish and Scale (2 weeks)

**Goal**: performance, edge cases, and documentation.

- [ ] Performance testing at 200 nodes + 50 ideas
- [ ] Optimize rendering (batch DOM updates, virtual scrolling for idea lists)
- [ ] Edge cases: empty story, phases out of sync, orphaned bindings
- [ ] Update README.md and json_spec.txt with story layer documentation
- [ ] User guide: "How to author a story"
- [ ] Pilot with 2-3 internal teams

**Pilot criteria**:
- [ ] 3 teams can author stories independently
- [ ] Exported artifacts pass audit review
- [ ] No P0 bugs after 1 week of pilot use
- [ ] Feedback incorporated into backlog

---

## Appendix A: Validation Rules Summary

| Path | Rule |
|------|------|
| `story.storyId` | Required, string, max 100 chars |
| `story.problem.headline` | Required, string, max 120 chars |
| `story.problem.impactMetric.kpiId` | Must match `story.kpis[].id` |
| `story.problem.scope[]` | Should match `nodes[].id` (warning) |
| `story.vision.summary` | Required, string, max 200 chars |
| `story.vision.kpiTargets[].kpiId` | Must match `story.kpis[].id` |
| `story.vision.kpiTargets[]` | `.min` < `.max` |
| `story.kpis[].id` | Required, unique |
| `story.kpis[].direction` | Enum: `lower_is_better`, `higher_is_better` |
| `story.phases[].phaseRef` | Must match root `phases[].id` |
| `story.phases[].order` | Monotonically increasing, matches root phases index |
| `story.ideaCards[].id` | Required, unique |
| `story.ideaCards[].linkedNodes[]` | Should match `nodes[].id` (warning) |
| `story.ideaCards[].linkedFlows[]` | Should match `flows[].id` (warning) |
| `story.ideaCards[].phases[]` | Must match `story.phases[].phaseRef` |
| `story.ideaCards[].status` | Enum: `proposed`, `accepted`, `in_progress`, `validated`, `rejected` |
| `story.ideaCards[].confidence` | Enum: `low`, `medium`, `high` |
| `story.benefits[].kpiId` | Must match `story.kpis[].id` |
| `story.benefits[].phaseId` | Must match `story.phases[].phaseRef` |
| `story.benefits[].targetRange` | `.min` < `.max` |
| `story.bindings[].ideaId` | Must match `story.ideaCards[].id` |
| `story.bindings[].nodeId` | Must match `nodes[].id` (nullable) |
| `story.bindings[].benefitId` | Must match `story.benefits[].id` (nullable) |

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Story** | A narrative overlay on an architecture diagram that frames problem, vision, hypotheses, and benefits |
| **Idea Card** | A hypothesis about an architecture change, bound to specific nodes and flows |
| **Benefit** | A measurable outcome tied to a KPI, expected from one or more validated ideas |
| **Binding** | An explicit traceability link: idea → node → benefit |
| **Phase (root)** | An existing ArchViz progressive reveal layer controlling node/zone/connection visibility |
| **Phase (story)** | Narrative metadata (owner, timebox, status) layered onto a root phase via `phaseRef` |
| **KPI** | A key performance indicator with baseline, current, and target values |
| **Alignment Score** | A [-1, 1] metric measuring how well an idea moves KPIs toward vision targets |
| **Simulation** | Computation of estimated KPI deltas from a set of idea cards |
| **Confidence Band** | A range around an estimated value reflecting uncertainty |
| **Audit Log** | Append-only record of all mutations to story elements |
