/* ── Constants: ICONS, POPUP_ICONS, editorString ── */

export const CONTENT_TOP = 40; // px offset so title doesn't overlap diagram content

export const ICONS = {
    user: '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
    human: '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
    database: '<path d="M12 2C6.48 2 2 3.34 2 5v14c0 1.66 4.48 3 10 3s10-1.34 10-3V5c0-1.66-4.48-3-10-3zm0 12c-3.53 0-6.43-.85-7.85-2.09C5.36 13.56 8.44 14.5 12 14.5s6.64-.94 7.85-2.59c-1.42 1.24-4.32 2.09-7.85 2.09z"/>',
    service: '<path d="M12 2L2 7l10 5 10-5-10-5zm0 9l-10-5v2l10 5 10-5v-2l-10 5zm0 4.5l-10-5v2l10 5 10-5v-2l-10 5z"/>',
    agent: '<path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1c1.1 0 2 .9 2 2v6h2v2h-2v2c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2v-2H4v-2h2V9c0-1.1.9-2 2-2h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M9 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2m6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>',
    fargate: '<path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18L18.36 7.5 12 10.82 5.64 7.5 12 4.18zM5 9.06l6 3.31v6.57L5 15.63V9.06z"/><circle cx="8" cy="13" r="1.2"/><circle cx="16" cy="13" r="1.2"/>',
    lambda: '<path d="M4 20h3.5l4.5-9.5L16.5 20H20L13 4h-3L4 20zm6.5-2L8 12.5 10 8l4.5 10h-4z"/>',
    ec2: '<path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm3 2h6v2H9V8zm0 4h6v2H9v-2z"/>',
    gateway: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>',
    'load-balancer': '<path d="M12 2L4 7v2h16V7L12 2zm-6 9v2h4v6l2 3 2-3v-6h4v-2H6zm6-5.5L16 8H8l4-2.5z"/>',
    cdn: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4,2"/><path d="M12 3c-2 3-3 6-3 9s1 6 3 9m0-18c2 3 3 6 3 9s-1 6-3 9M3 12h18"/>',
    firewall: '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>',
    cache: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3,2"/>',
    queue: '<path d="M3 6h14a4 4 0 0 1 0 8H3V6zm0 2v4h14a2 2 0 0 0 0-4H3z"/><path d="M6 9h2v2H6zm4 0h2v2h-2zm4 0h2v2h-2z"/>',
    storage: '<path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z"/>',
    dashboard: '<path d="M3 3h8v6H3V3zm0 8h8v10H3V11zm10-8h8v10h-8V3zm0 12h8v6h-8v-6z"/>',
    vpn: '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/><path d="M10 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2"/>',
    default: '<path d="M3 3h18v18H3z"/>'
};

export const POPUP_ICONS = {
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="#f0ad4e" stroke-width="2"><path d="M12 2L1 21h22L12 2z"/><line x1="12" y1="9" x2="12" y2="15"/><circle cx="12" cy="18" r="0.5" fill="#f0ad4e"/></svg>',
    issue: '<svg viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2"><polygon points="12,1 22.4,6.5 22.4,17.5 12,23 1.6,17.5 1.6,6.5"/><line x1="12" y1="8" x2="12" y2="14"/><circle cx="12" cy="17" r="0.5" fill="#e74c3c"/></svg>',
    amplify: '<svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="7,12 10.5,16 17,8"/></svg>'
};

export const editorString = `{
    // Collab Animation - Demo JSON
    "title": "Simple API Flow",
    "notes": "Project: Quick Demo\\nTeam: Dev Team\\n\\nThis is a minimal example showing\\na user calling an API that queries a database.\\n\\nStatus: Ready",
    "nodes": [
        { "id": "usr", "type": "user", "tag": "external", "label": "User", "x": 80, "y": 180, "w": 100, "h": 70 },
        { "id": "api", "type": "service", "tag": "core", "label": "API\\nGateway", "x": 320, "y": 180, "w": 120, "h": 80, "status": "ready" },
        { "id": "svc", "type": "service", "tag": "new", "label": "Order\\nService", "x": 560, "y": 180, "w": 120, "h": 80, "status": "wip" },
        { "id": "db", "type": "database", "tag": "core", "label": "SQL DB", "x": 800, "y": 180, "w": 100, "h": 70, "skipSequence": true }
    ],
    "connections": [
        { "from": "usr", "to": "api" },
        { "from": "api", "to": "svc" },
        { "from": "svc", "to": "db" }
    ],
    "sequence": [
        { "from": "usr", "to": "api", "text": "POST /orders", "status": "ready" },
        { "from": "api", "to": "svc", "text": "Validate & forward", "status": "ready" },
        { "from": "svc", "to": "db", "text": "INSERT order row", "status": "wip" },
        { "from": "db", "to": "svc", "text": "Return order ID", "status": "wip" },
        { "from": "svc", "to": "api", "text": "200 OK + payload", "status": "ready" },
        { "from": "api", "to": "usr", "text": "Response delivered", "status": "ready" }
    ]
}`;
