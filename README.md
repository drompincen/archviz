# DROM Architecture Visualizer

Animated, interactive architecture diagrams in the browser. Define nodes, connections, and sequence steps in JSON and watch the flow animate across a spatial canvas or a sequence diagram.

## Features

- **Spatial View** — drag-and-drop nodes on a canvas with animated message particles
- **Sequence View** — auto-generated sequence diagram from the same JSON
- **Story Mode** — wizard-style narrative walkthrough (Problem → Vision → Roadmap phases) with slide navigation, keyboard arrows, and dot indicators
- **Benefits Panel** — phase-grouped benefit cards that accumulate as you advance; click a card to highlight bound nodes
- **KPI HUD** — live KPI dashboard that updates per phase based on idea card impact deltas
- **Live JSON Editor** — edit the diagram definition in-browser and see changes instantly
- **Project Notebook** — freeform notes rendered beside the diagram
- **PDF Export** — export spatial view, sequence diagram, notes, and logs to PDF
- **Dark / Light Theme** — toggle with one click
- **Zones** — infrastructure boundary boxes (VPC, subnet, cloud, on-prem, edge, DMZ, etc.)
- **Phases** — progressive reveal slider; supports both single-phase strings and multi-phase arrays
- **Flows** — multiple named animation sequences over the same architecture (happy path, error path, etc.)
- **Step-through Mode** — pause and advance the animation one step at a time
- **JSON Dropdown** — auto-discovers `.json` files from the `json/` folder
- **Back-to-Story Navigation** — drill into architecture from any story slide, then return to the same slide

## Included Examples

| File | Description |
|------|-------------|
| `ai-agent-collab.json` | Multi-agent orchestration with shared memory |
| `ci-cd-pipeline.json` | Git to production CI/CD flow |
| `coffee-shop-transformation.json` | Digital transformation with full story mode (problem, vision, KPIs, 4 phases, idea cards, benefits) |
| `ecommerce-checkout.json` | Shopping cart to payment to notification |
| `event-pipeline.json` | Kafka-based real-time data pipeline |
| `iot-sensor-network.json` | Edge sensors with anomaly detection |
| `microservice-migration.json` | Legacy monolith to microservice migration |
| `oauth-auth-flow.json` | OAuth2 / OIDC authentication flow |
| `order-platform.json` | Cloud-native order platform with zones, phases, and flows |
| `rag-pipeline.json` | Retrieval-Augmented Generation AI pipeline |

## Prerequisites

- **Java 17+**

## Quick Start with jbang

[jbang](https://www.jbang.dev/) lets you run the project with a single command — no Maven, no build step.

**Install jbang** (if you don't have it):

```bash
# Linux / macOS
curl -Ls https://sh.jbang.dev | bash -s - app setup

# Windows (Scoop)
scoop install jbang

# Windows (Chocolatey)
choco install jbang
```

**Run the app:**

```bash
jbang ArchViz.java
```

Open your browser at **http://localhost:8080/collab-animation.html**

## Running with Maven

```bash
# Run directly
mvn spring-boot:run

# Or build a fat JAR and run it
mvn package
java -jar target/archviz-0.2.0.jar
```

Then open **http://localhost:8080/collab-animation.html**

## URL Parameters

Use the dropdown in the header, or pass query parameters:

```
http://localhost:8080/collab-animation.html?collab=rag-pipeline.json
http://localhost:8080/collab-animation.html?collab=coffee-shop-transformation.json&story=true
```

| Parameter | Description |
|-----------|-------------|
| `collab=<file>.json` | Load a specific diagram from the `json/` folder |
| `story=true` | Auto-activate story mode (requires a `story` key in the JSON) |

## Adding Your Own Diagrams

Create a `.json` file in `src/main/resources/static/json/` following this structure:

```json
{
    "title": "My Diagram",
    "notes": "Project: Example\nTeam: My Team\n\nDescription here.",
    "nodes": [
        { "id": "usr", "type": "user", "tag": "external", "label": "User", "x": 50, "y": 200, "w": 100, "h": 70 },
        { "id": "svc", "type": "service", "tag": "core", "label": "Service", "x": 300, "y": 200, "w": 120, "h": 80, "status": "ready" }
    ],
    "connections": [
        { "from": "usr", "to": "svc" }
    ],
    "sequence": [
        { "from": "usr", "to": "svc", "text": "Send request", "status": "ready" },
        { "from": "svc", "to": "usr", "text": "Return response", "status": "ready" }
    ]
}
```

### Node Types (icons)

| Type | Icon | Shape |
|------|------|-------|
| `user` / `human` | Person silhouette | Default rectangle |
| `service` | Stacked layers | Default rectangle |
| `database` | Cylinder | Bottom rounded |
| `agent` | Robot / AI | Default rectangle |
| `gateway` | Globe/network | Circle |
| `firewall` | Shield | Double red border |
| `lambda` | Lambda arrow | Triangle clip-path |
| `fargate` | Container hex | Default rectangle |
| `ec2` | Server rack | Default rectangle |
| `load-balancer` | Balance arrows | Default rectangle |
| `cdn` | Dashed globe | Dashed circle |
| `cache` | Dotted layers | Dotted rounded |
| `queue` | Item queue | Right pill |
| `storage` | Drive stack | Thick bottom border |
| `dashboard` | Grid panels | Top accent bar |
| `vpn` | Shield + check | Double border |

### Node Tags (colors)

| Tag | Color | Use for |
|-----|-------|---------|
| `legacy` | Red | Systems being deprecated |
| `new` | Green | New / target-state components |
| `core` | Blue | Standard infrastructure |
| `agent` | Purple | AI agents / LLMs |
| `external` | Gray (dashed) | Users or third-party systems |
| `aws` | Orange | AWS-managed services |
| `internal` | Teal | Internal / on-prem services |
| `observability` | Purple | Monitoring, logging, dashboards |
| `data` | Cyan | Databases, caches, data stores |

### Optional Node Fields

| Field | Description |
|-------|-------------|
| `status` | `"ready"` (green check) or `"wip"` (orange hourglass) |
| `skipSequence` | `true` to hide from sequence diagram (e.g. databases) |
| `phase` | String or Array. String: node visible from that phase onward. Array: node visible only in the listed phases. |

### Zones (infrastructure boundaries)

Zones draw labeled boundary boxes behind nodes to represent infrastructure groupings. Add a `"zones"` array to your JSON:

```json
"zones": [
    { "id": "cloud", "type": "cloud", "label": "AWS Cloud", "x": 200, "y": 10, "w": 800, "h": 500 },
    { "id": "vpc", "type": "vpc", "label": "VPC", "x": 220, "y": 40, "w": 760, "h": 460, "parent": "cloud" }
]
```

| Zone Type | Style | Use for |
|-----------|-------|---------|
| `cloud` | Blue dashed | Cloud provider boundary |
| `on-prem` | Gray solid | On-premises datacenter |
| `vpc` | Green dashed | Virtual private cloud |
| `subnet` | Green dotted | Subnet within a VPC |
| `edge` | Yellow dashed | Edge / CDN layer |
| `dmz` | Red solid | Demilitarized zone |
| `region` / `az` | Subtle blue | AWS region or availability zone |
| `k8s-cluster` | Blue solid | Kubernetes cluster |
| `namespace` | Blue dashed | Kubernetes namespace |

### Phases (progressive architecture reveal)

Phases let you reveal architecture in layers, like building blueprints — skeleton first, then plumbing, then facade. Add a `"phases"` array and tag items with a `"phase"` field:

```json
"phases": [
    { "id": "skeleton", "label": "1 — Skeleton" },
    { "id": "processing", "label": "2 — Processing" },
    { "id": "observability", "label": "3 — Observability" }
]
```

Then tag nodes, connections, zones, and sequence steps with `"phase": "processing"` etc. Items without a `phase` field are always visible. The slider in the header controls which phase level is shown — all items with a phase index up to the selected one are displayed.

### Flows (named animation sequences)

Flows let you define multiple named animation paths through the same architecture. Add a `"flows"` array:

```json
"flows": [
    {
        "id": "happy-path",
        "name": "Happy Path — Place Order",
        "phases": ["processing"],
        "sequence": [
            { "from": "user", "to": "gw", "text": "POST /orders", "status": "ready" },
            { "from": "gw", "to": "svc", "text": "Forward request", "status": "ready" }
        ]
    },
    {
        "id": "error-path",
        "name": "Payment Failure",
        "phases": ["processing"],
        "sequence": [...]
    }
]
```

A dropdown appears in the header when flows are present. The root `"sequence"` array is used as the default. Each flow's sequence is independently filtered by the current phase.

The optional `"phases"` array controls which phases a flow appears in. When present, the flow is only shown in the dropdown when the selected phase ID is in the list. When absent, the flow is shown whenever it has visible steps (backward compatible). Selecting a flow whose `phases` don't include the current phase automatically jumps the phase slider to the first matching phase.

## KPIs in Story Mode

KPIs connect the architecture to business outcomes. They let you show stakeholders *why* each phase matters — not just what gets built, but what improves.

### How it works

1. **Define KPIs** with a baseline value, direction, and display format in `story.kpis`:

```json
"kpis": [
    { "id": "orders_per_hour", "label": "Peak Orders / Hour", "unit": "orders/hr",
      "direction": "higher_is_better", "baseline": 30, "current": 30, "format": "0" },
    { "id": "avg_wait_min", "label": "Avg Wait Time", "unit": "min",
      "direction": "lower_is_better", "baseline": 8.0, "current": 8.0, "format": "0.1f" }
]
```

2. **Attach impact deltas to idea cards.** Each idea card declares how it expects to move specific KPIs. Deltas are signed numbers — positive for increase, negative for decrease:

```json
"ideaCards": [
    {
        "id": "pos-kiosk", "title": "Self-Service Kiosks",
        "phases": ["legacy"],
        "expectedKpiImpacts": [
            { "kpiId": "orders_per_hour", "delta": 25, "confidence": "high" },
            { "kpiId": "avg_wait_min", "delta": -4.0, "confidence": "high" }
        ]
    }
]
```

3. **The KPI HUD updates automatically** as you navigate story slides. When you land on a phase slide, the platform accumulates deltas from all non-rejected idea cards whose phases are at or before the current phase. The HUD shows the projected value for each KPI with color coding:
   - **Green** — improving (value moved in the desired direction)
   - **Red** — declining (value moved against the desired direction)
   - **Neutral** — unchanged from baseline

4. **KPIs appear across multiple story elements:**

| Where | What's shown |
|-------|-------------|
| **Problem slide** | `impactMetric` badge highlights the KPI most affected by the current problem |
| **Vision slide** | Target bars show min/max ranges with confidence intervals for each KPI |
| **Phase slides** | Idea cards show per-card delta chips (e.g. "+25 orders/hr") colored by direction |
| **KPI HUD** (top-right) | Live running totals that update as you advance through phases |
| **Benefits sidebar** | Benefit cards can reference a KPI with a target range |

### KPI fields reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier, referenced by idea cards and benefits |
| `label` | String | Display name shown in the HUD and on slides |
| `unit` | String | Unit string (e.g. `"orders/hr"`, `"%"`, `"$"`, `"min"`) |
| `direction` | String | `"higher_is_better"` or `"lower_is_better"` — controls color coding |
| `baseline` | Number | Starting value before any initiatives |
| `current` | Number | Current value (may equal baseline initially) |
| `format` | String | Display format: `"0"` (integer), `"0.1f"` (1 decimal), `"$0.00"`, `"$0,0"`, or `"qualitative"` |

### Qualitative (soft) KPIs

Not every metric has a number. For things like "Customer Satisfaction" or "Operational Complexity", use `"format": "qualitative"`. Instead of numeric values, the HUD shows directional arrows:

```json
{
    "id": "customer_satisfaction",
    "label": "Customer Satisfaction",
    "unit": "",
    "direction": "higher_is_better",
    "baseline": 0,
    "current": 0,
    "format": "qualitative"
}
```

Idea card deltas use small integers (e.g. `+2`, `-1`) that map to labels like "Improved", "Slightly Declined", etc. The accumulated value determines the display:

| Value | Display |
|-------|---------|
| >= 3 | ▲▲ Strongly Improved |
| 2 | ▲ Improved |
| 1 | ▲ Slightly Improved |
| 0 | — No Change |
| -1 | ▼ Slightly Declined |
| -2 | ▼ Declined |
| <= -3 | ▼▼ Strongly Declined |

Vision targets for qualitative KPIs use `goalLabel` instead of min/max ranges:

```json
{ "kpiId": "customer_satisfaction", "goalLabel": "▲ Strongly Improve", "horizon": "12 months" }
```

### Example: coffee shop transformation

The included `coffee-shop-transformation.json` tracks 6 KPIs across 4 phases:

| KPI | Baseline | After all phases | Direction |
|-----|----------|-----------------|-----------|
| Peak Orders / Hour | 30 | 95 | higher is better |
| Avg Wait Time | 8.0 min | 1.0 min | lower is better |
| Revenue / Customer | $4.50 | $7.20 | higher is better |
| Digital Order % | 0% | 65% | higher is better |
| Annual Revenue | $394,200 | $893,400 | higher is better |
| Cash Payment % | 62% | 12% | lower is better |
| Customer Satisfaction | — No Change | ▲▲ Strongly Improved | higher is better (qualitative) |
| Operational Complexity | — No Change | ▼ Slightly Declined | lower is better (qualitative) |

As you click through the story slides, the KPI HUD in the top-right corner animates from baseline to the accumulated values for the current phase.

## Performing an Architecture Review

ArchViz is designed to support structured architecture reviews where you walk a team through both the **static architecture** and the **dynamic flows**.

### 1. Start with the spatial view (architecture diagram)

Load your diagram and use the **Phase slider** to reveal the architecture layer by layer:

- **Phase 1** — show the core skeleton (API, database, key services)
- **Phase 2** — add async processing (queues, caches, workers)
- **Phase 3** — add observability, CDN, admin tooling

At each phase, discuss:
- What infrastructure boundaries (zones) are in play?
- Which components are `ready` vs `wip`?
- Are connections between layers clear?

### 2. Walk through flows (sequence view)

Switch to **Sequence View** and use the **Flow dropdown** to animate each request path:

- **Happy path** — does the ideal flow make sense? Are there unnecessary hops?
- **Error paths** — what happens on payment failure, timeout, or service unavailability?
- **Cache/optimization paths** — does the caching strategy cover the right scenarios?

Use **Pause/Step** mode to discuss each step individually. The log pane records every step with timestamps.

### 3. Combine both views

For each flow, toggle between spatial and sequence views:
- The **spatial view** shows *where* messages travel across infrastructure
- The **sequence view** shows *when* and *in what order* interactions happen

Both views respect the current phase, so you can review a flow at different maturity levels (e.g., "what does the happy path look like before we add caching?").

### 4. Export for offline review

Use **Export PDF** to capture the current state (respects the active phase) for sharing with stakeholders who can't attend live.

## Persistence

By default the app stores diagrams in memory (lost on restart). To use **Amazon DynamoDB** for persistent storage:

### 1. Switch the store in `application.properties`

```properties
# Change from inMemory to dynamodb
diagram.store=dynamodb
```

### 2. Configure AWS region and table name (optional)

The defaults are `us-east-1` and `archviz-diagrams`. Override in `application.properties` if needed:

```properties
aws.region=us-east-1
aws.dynamodb.table-name=archviz-diagrams
```

### 3. Provide AWS credentials

Credentials are resolved via the standard AWS credential chain:

- Environment variables: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- `~/.aws/credentials` profile file
- IAM role (when running on EC2/ECS/Lambda)

### 4. Create the DynamoDB table

The table only requires `id` (String) as the partition key. All other attributes are stored automatically.

```bash
aws dynamodb create-table \
  --table-name archviz-diagrams \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

That's it — start the app with `mvn spring-boot:run` and diagrams saved via the UI will persist in DynamoDB.

## Project Structure

```
.
├── ArchViz.java                             # jbang single-file runner
├── pom.xml                                  # Maven build (Spring Boot 3.3.1, Java 17)
├── docs/                                    # Design docs and test plans
│   └── playwright-testing.md                # Playwright integration test guide
├── src/main/java/io/github/drompincen/archviz/
│   ├── ArchVizApplication.java              # Spring Boot main class
│   ├── JsonListController.java              # GET /json/ directory listing
│   └── HtmlAccessLogFilter.java             # Logs every .html page access
├── src/main/resources/
│   ├── application.properties
│   └── static/
│       ├── collab-animation.html            # Main HTML shell (module imports)
│       ├── css/                             # Modular CSS (core, nodes, sequence, widgets, benefits, narrative)
│       ├── js/                              # ES modules (state, rendering, narrative, benefits, animation, etc.)
│       ├── json/                            # Example diagram definitions
│       └── json_spec.txt                    # JSON format specification
├── src/test/java/io/github/drompincen/archviz/
│   └── ui/
│       ├── CollabAnimationUITest.java       # HtmlUnit-based UI tests (mvn test)
│       ├── CollabPageIT.java                # Playwright core UI tests (mvn verify)
│       └── StoryModeIT.java                 # Playwright story mode tests (mvn verify)
└── README.md
```

## Testing

The project has three test layers:

| Layer | Tool | Command | Files |
|-------|------|---------|-------|
| Unit tests | JUnit 5 + MockMvc | `mvn test` | `*Test.java` |
| HtmlUnit UI tests | Selenium HtmlUnit | `mvn test` | `CollabAnimationUITest.java` |
| Playwright integration tests | Playwright (Chromium) | `mvn verify` | `*IT.java` |

Playwright tests run in a real headless Chromium browser, testing CSS rendering, ES module loading, story mode navigation, and keyboard interactions. See [docs/playwright-testing.md](docs/playwright-testing.md) for details.

To run all tests including Playwright:

```bash
# Install Chromium (first time only)
mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install --with-deps chromium" -Dexec.classpathScope=test

# Run all tests
mvn verify
```

## License

MIT License — see [license.txt](license.txt).
