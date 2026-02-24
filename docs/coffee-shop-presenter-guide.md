# Bean & Byte Coffee — Presenter Walkthrough

**Audience**: Board, investors, or executive team
**Duration**: 15-20 minutes
**Diagram file**: `coffee-shop-transformation.json`

---

## How the Presentation Flows

The tool enforces a deliberate reading order. You don't start with architecture —
you start with pain.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   NARRATIVE VIEW (Story Mode)                                            │
│                                                                          │
│   ┌─────────────┐    ┌─────────────┐    ┌──────────────────────────┐    │
│   │  PROBLEM     │    │  VISION      │    │  PHASE ROADMAP           │    │
│   │  CARD        │───▶│  PANEL       │───▶│  STEPPER                 │    │
│   │              │    │              │    │                          │    │
│   │  "Our        │    │  "3x revenue │    │  Legacy ● ── ● ── ● ── ●│    │
│   │   register   │    │   phone-     │    │  Today   Ph1  Ph2  Ph3  │    │
│   │   kills 40%  │    │   first..."  │    │                          │    │
│   │   of revenue"│    │              │    │                          │    │
│   └─────────────┘    └─────────────┘    └──────────────────────────┘    │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │  KPI HUD (top-right, always visible)                             │    │
│   │                                                                   │    │
│   │  Orders/hr: 30 ──────────────────────────●──── target: 90        │    │
│   │  Wait time:  8.0 min ●──────────────────────── target: 2.5       │    │
│   │  Rev/cust:  $4.50 ──────────●──────────────── target: $7.50      │    │
│   │  Digital %:    0% ●────────────────────────── target: 75%        │    │
│   │  Revenue:  $394K ──────────●───────────────── target: $1.2M      │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│         ║                                                                │
│         ║  "View Architecture" or step a phase                          │
│         ▼                                                                │
│                                                                          │
│   COLLAB DIAGRAM VIEW (same phase, same KPI HUD)                       │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                                                                   │    │
│   │   [Walk-in] ──▶ [Cashier + Old Register] ──▶ [Barista]          │    │
│   │                      │                                            │    │
│   │                 [Cash Drawer]  [Card Terminal]                    │    │
│   │                                                                   │    │
│   │               ... phase slider reveals more nodes ...             │    │
│   │                                                                   │    │
│   │   [Mobile Customer] ──▶ [API GW] ──▶ [Order Svc] ──▶ [Queue]   │    │
│   │                            │                                      │    │
│   │                      [Stripe Pay]    [Wallet Svc] ──▶ [Loyalty]  │    │
│   │                                                                   │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Minute-by-Minute Script

### Minutes 0-3: The Problem (Phase 0 — Legacy)

**What you show**: Problem Card fills the narrative view. Big red headline.

**What you say**:

> "Let me show you where we are today. Our register — the same one we bought
> in 2009 — processes 30 orders an hour. During the 7-9 AM rush, the line
> averages 8 minutes. We watched video from January: people literally look in
> the window, see the line, and walk to the Starbucks across the street."

**What the audience sees**:
- Problem headline: **"Our register kills 40% of potential revenue"**
- Impact metric badge: **30 orders/hr** (large, red)
- Scope chips: `Cashier`, `Card Terminal`, `Cash Drawer`, `Paper Log` (all tagged `legacy` = red)
- Risk items in amber
- Evidence documents: video audit, terminal error logs, customer survey, competitor benchmarks

**Presenter action**: Click a scope chip (e.g., `Card Terminal`) to flash-cut to the
collab diagram and highlight that node — the audience sees the old terminal sitting
there in the architecture. Click back to narrative.

> "62% of our payments are cash. Every dollar bill is a dollar we can't track,
> can't attribute, can't market back to. And our card terminal? Twelve seconds
> per swipe. Watch this..."

**Presenter action**: Toggle to collab diagram. Select the "Legacy — Card Swipe (Slow)"
flow. Hit Play. The animation shows the agonizing swipe-wait-approve-ticket flow,
ending with the amber popup: *"Terminal timeout — customer line growing."*

---

### Minutes 3-5: The Vision (Still Phase 0)

**What you show**: Toggle back to narrative. Vision Panel appears below the Problem.

**What you say**:

> "Here's where we're going. In 12 months, we will process 90 orders an hour —
> 3x today. 75% of orders will be placed and paid before the customer walks in.
> Average wait under 3 minutes. Revenue per customer goes from $4.50 to over $7
> with credits and loyalty. That's $1.2 million annual — 3x the $394K we did
> last year."

**What the audience sees**:
- Vision summary: **"3x throughput, phone-first ordering, Starbucks-style credits"**
- KPI target bars: each showing baseline → target range with confidence band
- Acceptance criteria checklist (5 concrete, measurable items)

**The KPI HUD is static at this point** — all values at baseline. This creates
visual tension: the bars are all in the red zone.

---

### Minutes 5-9: The Roadmap (Phase Stepper)

**What you show**: Phase Stepper in the narrative view. Four phases laid out
horizontally.

**What you say**:

> "We'll do this in four phases. Phase 0 is today — you just saw it. Phase 1
> is mobile ordering and a modern POS, shipping in Q2. Phase 2 adds credits
> and loyalty in Q3. Phase 3 is analytics and AI forecasting in Q4."

**Presenter action**: Click each phase step. As you click:
- Phase label, owner, timebox, and description expand
- KPI HUD **animates** from current values to projected values for that phase
- Status badges show completed / active / planned

**What the audience sees on each click**:

| Click | KPI HUD Animation | Key Moment |
|-------|-------------------|------------|
| Phase 0 → 1 | Orders: 30→55, Wait: 8→3.5, Digital: 0%→40% | "Mobile unlocks 25 more orders/hour" |
| Phase 1 → 2 | Rev/cust: $4.50→$6.90, Digital: 40%→65%, Revenue: $525K→$840K | "Credits create lock-in" |
| Phase 2 → 3 | Revenue: $840K→$1.1M, Orders: 80→90 | "AI fills the last gap" |

> "Watch the revenue bar. It starts at $394K... [click Phase 1] jumps to $525K...
> [click Phase 2] $840K... [click Phase 3] $1.1 million. That's 3x."

---

### Minutes 9-13: Phase Drill-Down (Narrative → Collab Transition)

This is the critical moment where the story transitions to the architecture.

**Phase 1 Deep Dive**:

**What you say**:

> "Let me show you what Phase 1 actually looks like inside. This is the architecture."

**Presenter action**: With Phase Stepper on Phase 1, click "View Architecture" (or
toggle Story Mode to collab). The narrative fades out; the collab diagram fades in at
Phase 1. The audience sees:

- **Phase 0 nodes visible**: Walk-in Customer, Cashier, Card Terminal, Barista, Cash Drawer, Paper Log (all red/legacy)
- **Phase 1 nodes appear**: Mobile Customer, API Gateway, Order Service, Stripe Payment GW, POS Tablet, Order Queue, Push Notify, Orders DB, Menu Cache (all green/new)
- The old system is still there — running in parallel
- New system connects Mobile Customer → API GW → Order Service → Queue → Barista screen

**Presenter action**: Select "Phase 1 — Mobile Order Ahead" flow. Hit Play.

The audience watches a mobile order flow through the new system:
1. Customer opens app → POST /orders
2. Menu check → Available
3. Apple Pay → Confirmed in 0.8s (green popup: "Payment instant — no line wait")
4. Order enqueued → Appears on barista tablet screen
5. Push notification → "Your latte is being made!"
6. Final popup: "Customer notified — walks in, grabs, leaves"

> "See that? The customer ordered from the parking lot. Paid in under a second.
> The barista got the order digitally — no handwriting, no miscommunication.
> The customer walks in, grabs the drink, leaves. Total time in store: 90 seconds."

**Phase 2 Deep Dive**:

**Presenter action**: Slide phase to Phase 2. New nodes appear: Wallet & Credits
Service, Loyalty Engine, Customer Profiles DB. Select "Phase 2 — Pay with Credits" flow.

> "Now watch what happens when the customer has credits loaded."

Flow plays: order → debit 55 credits → loyalty points awarded → "5 more pts to free drink!" push notification.

> "They're not even thinking about price anymore. They loaded $50 last week.
> The points gamification keeps them coming back. This is the Starbucks playbook."

---

### Minutes 13-16: Idea Cards and Benefits (Overlay)

**Presenter action**: While in collab view at Phase 2, enable Idea Overlay.

**What the audience sees**: Idea cards appear pinned near their linked nodes:
- "Mobile Order-Ahead App" card near API Gateway (green glow — high alignment)
- "Starbucks-Style Prepaid Credits" card near Wallet Service (amber glow — medium confidence)
- "Gamified Loyalty Points" card near Loyalty Engine

**Presenter action**: Click the "Starbucks-Style Prepaid Credits" idea card. It expands to show:
- Hypothesis: "Prepaid wallet creates lock-in, 2.3x more visits"
- Confidence: Medium
- Expected impact: +$1.60/customer, +15 orders/hr, +$197K/year
- Evidence: Starbucks 10-K showing $1.8B in stored-value liabilities
- CFO's comment: "Love the float revenue — interest-free loans from customers"

**Presenter action**: Enable Benefit Lanes. Benefits for Phase 2 appear at the bottom:
- "Revenue per customer rises 35%" — click highlights Wallet Svc and Loyalty Engine
- "Digital orders hit 65%+" — click highlights Wallet Svc and Mobile Customer

> "Every idea card traces to specific architecture components and to specific
> business benefits. This isn't vaporware — it's traceable. Click any benefit
> and you see exactly which systems deliver it."

---

### Minutes 16-18: The 3x Revenue Story (Full View)

**Presenter action**: Slide to Phase 3. All nodes visible. KPI HUD animates to
final state.

**What the audience sees** (KPI HUD final state):
```
Orders/hr:    30 ──────────────────────────────────────▶ 90   ✓ 3.0x
Wait time:   8.0 ──────────────────────────────────────▶ 2.5  ✓ -69%
Rev/cust:  $4.50 ──────────────────────────────────────▶ $7.20 ✓ +60%
Digital %:    0% ──────────────────────────────────────▶ 75%  ✓
Revenue:  $394K  ──────────────────────────────────────▶ $1.1M ✓ 2.8x
Cash %:     62%  ──────────────────────────────────────▶ 12%  ✓ -81%
```

> "Let me zoom out. We're going from 30 to 90 orders an hour. From $4.50 to
> over $7 per customer. From zero digital to 75%. And from $394K to over $1.1
> million in annual revenue. That's effectively 3x the business — same four
> walls, same baristas, just smarter systems."

---

### Minutes 18-20: Confidence and Risks (Closing)

**What you show**: Narrative view. KPI HUD with confidence bands visible.

> "I want to be honest about confidence levels. Phase 1 — mobile ordering — is
> high confidence. We know this works; Starbucks proved it. Phase 2 — credits
> and loyalty — is medium confidence. We're projecting based on Starbucks data,
> but we're not Starbucks. Phase 3 — AI forecasting — is low confidence on the
> revenue number. The cost savings are real, but the revenue uplift is speculative."

**What the audience sees**: KPI target bars show confidence bands — narrow green
band for high confidence, wide amber band for medium, wide red band for low.

> "The conservative read is 2.5x. The optimistic read is 3.2x. Either way,
> we're transforming the business. Phase 1 is already approved and in progress.
> I need your sign-off on Phase 2 budget today."

---

## What Each Stakeholder Gets From This

| Stakeholder | What they focus on | View they use |
|-------------|-------------------|---------------|
| **CEO / Board** | Problem → Vision → 3x revenue number | Narrative view only, KPI HUD |
| **CFO** | Revenue projections, confidence bands, credits float | Narrative + idea card details |
| **COO** | Phase timeline, owners, wait time reduction | Phase Stepper + KPI HUD |
| **CTO** | Architecture at each phase, service boundaries | Collab diagram + flow animations |
| **Product Manager** | Idea cards, hypotheses, acceptance criteria | Idea Overlay + Benefit Lanes |
| **Barista Lead** | What changes in their workflow | "Mobile Order Ahead" flow animation |
| **Auditor** | Evidence links, status changes, timestamps | Export → JSON with full audit log |

---

## Key UX Moments That Sell the Tool

1. **Problem Card with scope chips** — clicking "Card Terminal" flash-cuts to the
   architecture and highlights the legacy node. Stakeholders immediately understand:
   "that red box is what's hurting us."

2. **KPI HUD animation on phase step** — the revenue bar climbing from $394K to $1.1M
   as you click through phases is visceral. Numbers moving is more persuasive than
   numbers on a slide.

3. **Narrative → Collab transition** — "Let me show you what Phase 1 actually looks
   like" and the architecture appears at exactly the right phase. No slide switch, no
   context loss.

4. **Flow animation on legacy system** — playing the 12-second card swipe flow makes
   the pain tangible. Playing the 0.8-second mobile payment flow right after makes
   the solution tangible.

5. **Benefit → Node traceability** — clicking "Revenue per customer rises 35%" and
   watching the Wallet Service and Loyalty Engine glow proves the benefit isn't
   hand-waving.

6. **Confidence bands** — not claiming certainty. Showing the wide band on Phase 3
   AI forecasting builds trust. "We know what we don't know."

---

## Export Artifacts

After the presentation, you export two things:

**1. JSON export** — machine-readable, includes full audit trail:
- Every idea with status, owner, evidence links
- Every KPI with baseline, current, projected, confidence
- Every audit log entry with timestamps
- Suitable for feeding into portfolio tracking tools

**2. HTML export** — human-readable summary document:
- Problem and vision statements
- Phase table with owners and timelines
- Idea cards with hypotheses and expected impacts
- KPI summary table (baseline → projected → confidence)
- Architecture snapshots per phase (SVG)
- Audit log
- Can be emailed to anyone who missed the meeting
