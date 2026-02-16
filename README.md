# DROM Architecture Visualizer

Animated, interactive architecture diagrams in the browser. Define nodes, connections, and sequence steps in JSON and watch the flow animate across a spatial canvas or a sequence diagram.

## Features

- **Spatial View** — drag-and-drop nodes on a canvas with animated message particles
- **Sequence View** — auto-generated sequence diagram from the same JSON
- **Live JSON Editor** — edit the diagram definition in-browser and see changes instantly
- **Project Notebook** — freeform notes rendered beside the diagram
- **PDF Export** — export spatial view, sequence diagram, notes, and logs to PDF
- **Dark / Light Theme** — toggle with one click
- **Step-through Mode** — pause and advance the animation one step at a time
- **JSON Dropdown** — auto-discovers `.json` files from the `json/` folder

## Included Examples

| File | Description |
|------|-------------|
| `ai-agent-collab.json` | Multi-agent orchestration with shared memory |
| `ci-cd-pipeline.json` | Git to production CI/CD flow |
| `ecommerce-checkout.json` | Shopping cart to payment to notification |
| `event-pipeline.json` | Kafka-based real-time data pipeline |
| `iot-sensor-network.json` | Edge sensors with anomaly detection |
| `microservice-migration.json` | Legacy monolith to microservice migration |
| `oauth-auth-flow.json` | OAuth2 / OIDC authentication flow |
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
java -jar target/archviz-0.1.0.jar
```

Then open **http://localhost:8080/collab-animation.html**

## Loading a Specific Diagram

Use the dropdown in the header, or pass a query parameter:

```
http://localhost:8080/collab-animation.html?collab=rag-pipeline.json
```

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

| Type | Icon |
|------|------|
| `user` | Person silhouette |
| `service` | Stacked layers |
| `database` | Cylinder |
| `agent` | Robot / AI |

### Node Tags (colors)

| Tag | Color | Use for |
|-----|-------|---------|
| `legacy` | Red | Systems being deprecated |
| `new` | Green | New / target-state components |
| `core` | Blue | Standard infrastructure |
| `agent` | Purple | AI agents / LLMs |
| `external` | Gray (dashed) | Users or third-party systems |

### Optional Node Fields

| Field | Description |
|-------|-------------|
| `status` | `"ready"` (green check) or `"wip"` (orange hourglass) |
| `skipSequence` | `true` to hide from sequence diagram (e.g. databases) |

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
├── pom.xml                                  # Maven build (Spring Boot 3.4.2, Java 17)
├── src/main/java/com/drom/archviz/
│   ├── ArchVizApplication.java              # Spring Boot main class
│   ├── JsonListController.java              # GET /json/ directory listing
│   └── HtmlAccessLogFilter.java             # Logs every .html page access
├── src/main/resources/
│   ├── application.properties
│   └── static/
│       ├── animation.html                   # Phase animator
│       ├── collab-animation.html            # Collaboration animator (main)
│       └── json/                            # Example diagram definitions
└── README.md
```

## License

MIT License — see [license.txt](license.txt).
