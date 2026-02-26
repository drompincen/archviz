Collab Animator — Icons, Node Styles, and JSON Schema
=====================================================

Overview
- This document describes the node icons, visual styles, and the JSON schema used by collab-animation.html.
- Files can be authored inline (the built-in demo) or as external JSON files in the json/ folder. You can load a file by selecting it in the dropdown or via URL: collab-animation.html?collab=FILENAME.json

Icons (by node type)
- user: Person silhouette
- service: Stacked service/box glyph
- database: Database cylinder
- agent: Agent/bot glyph
- default: Solid square (fallback when type is unknown)

Node Styles (spatial view)
- type- classes affect shape details
  - .type-database: squared top with rounded bottom (cylinder feel), thicker top border
- tag- classes color-code the node and border. Colors adapt to theme (dark/light) via CSS variables:
  - .tag-legacy → bg: var(--tag-legacy-bg), border: var(--tag-legacy-border), text: var(--tag-legacy-text)
  - .tag-new → bg: var(--tag-new-bg), border: var(--tag-new-border), text: var(--tag-new-text)
  - .tag-core → bg: var(--tag-core-bg), border: var(--tag-core-border), text: var(--tag-core-text)
  - .tag-agent → bg: var(--tag-agent-bg), border: var(--tag-agent-border), text: var(--tag-agent-text)
  - .tag-external → bg: var(--tag-external-bg), border: var(--tag-external-border), text: var(--tag-external-text), dashed border
- Status badges on nodes (optional)
  - status: "ready" → green checkmark (✔)
  - status: "wip" → orange hourglass (⏳)
- Connectors (spatial view)
  - Lines are drawn between nodes listed in connections
  - Bidirectional pairs (A→B and B→A) are deduplicated and rendered as a single connector
  - Parallel connectors auto-offset to avoid overlaps

Sequence View styling
- Each lifeline header inherits the node’s tag- color variables
- Optional node status appears as a small colored badge in the header
- Nodes with skipSequence: true are hidden to reduce clutter (e.g., databases)

Logs & Notebook
- Notebook displays the top-level notes field with word wrapping (newlines supported)
- Export to PDF includes notebook and log pane

JSON Schema (informal)
Top-level object fields:
- title: string (optional)
- notes: string (optional)
  - Supports literal \n escapes and also tolerates IDE-wrapped multiline strings inside quotes (they are normalized to \n)
- nodes: Node[] (required for diagrams)
- connections: Connection[] (optional; used for spatial connectors and particle animation)
- sequence: SequenceStep[] (optional; used for sequence view and dual-view animation)
- zones: Zone[] (optional; infrastructure boundary boxes behind nodes)
- phases: Phase[] (optional; progressive reveal layers — adds a slider to the header)
- flows: Flow[] (optional; named animation sequences — adds a dropdown to the header)
- story: Story (optional; narrative layer for stakeholder presentations — see below)

Node
{
  id: string,                 // unique identifier (referenced by connections/sequence)
  type?: "user" | "service" | "database" | "agent" | string,  // unknown types use default icon
  tag?: "legacy" | "new" | "core" | "agent" | "external" | string,
  label?: string,             // supports "\n" to line-break
  x: number, y: number,       // position on canvas (px)
  w?: number, h?: number,     // optional size (px)
  status?: "ready" | "wip",  // optional status badge
  skipSequence?: boolean      // hide this lifeline in sequence view
}

Connection
{
  from: string,   // node id
  to: string      // node id
}
- Note: If both {from:A,to:B} and {from:B,to:A} exist, only one connector is drawn in spatial view.

SequenceStep
{
  from: string,                 // node id (sender)
  to: string,                   // node id (receiver)
  text?: string,                // label above the arrow
  status?: "ready" | "wip"     // optional status (affects arrow badge/coloring)
}

Zone
{
  id: string,                 // unique identifier
  type?: "cloud" | "on-prem" | "vpc" | "subnet" | "edge" | "dmz" | "region" | "az" | "k8s-cluster" | "namespace",
  label?: string,             // displayed at top-left of the zone
  x: number, y: number,       // position on canvas (px)
  w: number, h: number,       // size (px)
  parent?: string,            // id of parent zone (for render ordering)
  phase?: string              // phase ID — zone only appears at that phase
}

Phase
{
  id: string,                 // unique phase identifier
  label: string               // display label next to the slider
}
- Items with a phase field are visible when their phase index <= the selected phase index.
- Items without a phase field are always visible.

Flow
{
  id: string,                 // unique flow identifier
  name: string,               // display name in the dropdown
  phases?: string[],          // optional phase IDs where this flow is relevant
  sequence: SequenceStep[]    // array of steps (same format as root sequence)
}
- When phases is present, the flow only appears in the dropdown when the selected
  phase ID is in the list. When absent, flow is shown when any step is visible.
- Selecting a flow whose phases don't include the current phase jumps the slider
  to the first phase in the list.
- Each flow's sequence is independently filtered by the current phase.
- The root "sequence" array is used when "Default Sequence" is selected.

Story Object (optional)
- When a "story" key is present, a narrative layer is enabled.
- Clicking the "Story" button (or using ?story=true) enters a slide-based walkthrough:
  Problem → Vision → Phase slides with initiative cards and KPI tracking.
{
  storyId?: string,           // unique identifier for the story
  version?: number,           // version number
  problem: {
    headline: string,         // short headline for the problem slide
    description: string,      // detailed problem description
    impactMetric?: { kpiId: string, value: number, unit: string },
    evidence?: [{ label: string, url: string }],
    scope?: string[],         // node IDs affected (clickable)
    risks?: string[]          // risk statement strings
  },
  vision: {
    summary: string,          // one-line vision summary
    description: string,      // detailed vision description
    kpiTargets?: [{ kpiId: string, min: number, max: number, confidence: string, horizon: string }],
    acceptanceCriteria?: string[]
  },
  kpis?: [{
    id: string,               // unique KPI identifier
    label: string,            // display label
    unit: string,             // e.g. "orders/hr", "%", "$"
    direction: "higher_is_better" | "lower_is_better",
    baseline: number,         // starting value
    current: number,          // current value
    format?: string           // e.g. "0", "0.1f", "$0.00", "$0,0"
  }],
  phases?: [{
    phaseRef: string,         // references a root-level phase ID
    label: string,
    order: number,            // sort order (0-based)
    owner?: string,
    timebox?: string,         // e.g. "2026 Q2 (12 weeks)"
    status?: "completed" | "active" | "planned",
    description: string
  }],
  ideaCards?: [{
    id: string,
    title: string,
    owner?: string,
    hypothesis: string,       // what we believe will happen
    linkedNodes?: string[],   // node IDs (clickable chips)
    linkedFlows?: string[],   // flow IDs
    phases?: string[],        // phase IDs where introduced
    status?: "accepted" | "rejected" | "proposed",
    confidence?: "high" | "medium" | "low",
    expectedKpiImpacts?: [{ kpiId: string, delta: number, confidence: string }]
  }],
  benefits?: [{
    id: string,
    title: string,
    phaseId: string,          // phase where benefit is realized
    kpiId?: string,
    targetRange?: { min: number, max: number },
    boundNodes?: string[],    // node IDs highlighted on click
    boundFlows?: string[]
  }],
  bindings?: [{               // connects ideas to nodes to benefits
    ideaId: string,
    nodeId: string,
    benefitId: string
  }],
  uiHints?: {
    initialView?: "narrative",  // auto-start story mode
    initialPhase?: string       // phase ID for slider at start
  }
}

Authoring Tips
- Use tag values to communicate domain/phase: legacy, core, new, agent, external
- Prefer concise labels; use "\n" to break onto multiple lines (e.g., "API\nGateway")
- Hide infrastructure-like nodes from sequence view with skipSequence: true
- Keep ids stable across edits; they are the join keys for connections and steps
- For story mode: ensure all node IDs in scope, linkedNodes, boundNodes exist in the nodes array
- For story mode: ensure all kpiId references in impacts, targets, and benefits resolve to a story.kpis entry

Loading External Examples
- Place files in json/ and use: collab-animation.html?collab=your-file.json
- The dropdown auto-discovers *.json in json/ (server must allow directory listing)

Version
- This document reflects collab-animation.html with zones, phases, flows, and story narrative layer.
