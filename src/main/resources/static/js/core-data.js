/* ── Core data helpers ── */

import { state } from './state.js';

export function stripJsonComments(jsonStr) {
    return jsonStr.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, function(m, g) { return g ? "" : m; });
}

export function normalizeMultilineStrings(str) {
    var out = '';
    var inStr = false;
    var esc = false;
    for (var i = 0; i < str.length; i++) {
        var ch = str[i];
        if (inStr) {
            if (esc) { out += ch; esc = false; continue; }
            if (ch === '\\') { out += ch; esc = true; continue; }
            if (ch === '"') { out += ch; inStr = false; continue; }
            if (ch === '\r') { if (str[i+1] === '\n') { i++; } out += '\\n'; while (i+1 < str.length && (str[i+1] === ' ' || str[i+1] === '\t')) { i++; } continue; }
            if (ch === '\n') { out += '\\n'; while (i+1 < str.length && (str[i+1] === ' ' || str[i+1] === '\t')) { i++; } continue; }
            out += ch;
        } else {
            if (ch === '"') { out += ch; inStr = true; esc = false; continue; }
            out += ch;
        }
    }
    return out;
}

export function getPhaseIndex(phaseId) {
    if (!state.graph.phases || !phaseId) return -1;
    return state.graph.phases.findIndex(function(p) { return p.id === phaseId; });
}

export function isVisibleInPhase(item) {
    if (state.selectedPhase === Infinity) return true;
    if (!item.phase) return true;

    if (Array.isArray(item.phase)) {
        // Array: visible only when the selected phase is in the list
        var currentPhaseId = state.graph.phases[state.selectedPhase]
            ? state.graph.phases[state.selectedPhase].id : null;
        if (!currentPhaseId) return false;
        return item.phase.indexOf(currentPhaseId) >= 0;
    }

    // String (legacy): visible from this phase onward
    var idx = getPhaseIndex(item.phase);
    return idx >= 0 && idx <= state.selectedPhase;
}

export function itemBelongsToPhase(item, phaseId) {
    if (!item.phase) return false;
    if (Array.isArray(item.phase)) return item.phase.indexOf(phaseId) >= 0;
    return item.phase === phaseId;
}

export function flowHasVisibleSteps(flow) {
    return (flow.sequence || []).some(function(step) { return isVisibleInPhase(step); });
}

export function resolveActiveSequence() {
    var seq;
    if (state.selectedFlowId !== '__default__' && state.graph.flows) {
        var flow = state.graph.flows.find(function(f) { return f.id === state.selectedFlowId; });
        seq = flow ? (flow.sequence || []) : (state.graph.sequence || []);
    } else {
        seq = state.graph.sequence || [];
    }
    state.activeSequence = seq.filter(function(step) { return isVisibleInPhase(step); });
}
