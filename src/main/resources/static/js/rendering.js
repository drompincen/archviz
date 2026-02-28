/* ── Rendering: render, updateConnections, getNodeCenter ── */

import { state, dom } from './state.js';
import { ICONS } from './constants.js';
import { stripJsonComments, normalizeMultilineStrings, isVisibleInPhase, resolveActiveSequence, isFlowVisibleInPhase } from './core-data.js';
import { clearLog } from './logging.js';
import { renderBenefitsPanel } from './benefits.js';
import { renderSequenceView } from './sequence-view.js';
import { resetAnimation } from './animation.js';
import { handleDragStart, handleZoneDragStart } from './ui-interactions.js';
import { renderNarrativeControls } from './narrative.js';

export function getNodeCenter(id) {
    var n = state.nodeMap[id];
    if (!n) return null;
    var el = n.el;
    var x = parseInt(el.style.left) + el.offsetWidth / 2;
    var y = parseInt(el.style.top) + el.offsetHeight / 2;
    return { x: x, y: y };
}

function deduplicateConnections(connections) {
    var seen = {};
    var result = [];
    connections.forEach(function(conn) {
        var key = [conn.from, conn.to].sort().join('|');
        if (!seen[key]) {
            seen[key] = true;
            result.push(conn);
        }
    });
    return result;
}

export function updateConnections() {
    dom.svgLayer.innerHTML = '';
    if (!state.graph.connections) return;

    var visibleConns = state.graph.connections.filter(function(conn) { return isVisibleInPhase(conn); });
    var dedupedConns = deduplicateConnections(visibleConns);

    var occupiedMidpoints = [];

    dedupedConns.forEach(function(conn) {
        var c1 = getNodeCenter(conn.from);
        var c2 = getNodeCenter(conn.to);
        if (!c1 || !c2) return;

        var dx = c2.x - c1.x;
        var dy = c2.y - c1.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var nx = -dy / (dist || 1);
        var ny = dx / (dist || 1);

        var midX = (c1.x + c2.x) / 2;
        var midY = (c1.y + c2.y) / 2;

        var avoidOffset = 0;
        for (var i = 0; i < occupiedMidpoints.length; i++) {
            var om = occupiedMidpoints[i];
            var omDist = Math.sqrt(Math.pow(midX + nx * avoidOffset - om.x, 2) + Math.pow(midY + ny * avoidOffset - om.y, 2));
            if (omDist < 30) {
                avoidOffset += 20;
                i = -1;
            }
        }

        var ctrlX = midX + nx * avoidOffset;
        var ctrlY = midY + ny * avoidOffset;

        occupiedMidpoints.push({ x: ctrlX, y: ctrlY });

        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "connector");

        if (Math.abs(avoidOffset) < 5) {
            path.setAttribute("d", "M" + c1.x + "," + c1.y + " L" + c2.x + "," + c2.y);
        } else {
            path.setAttribute("d", "M" + c1.x + "," + c1.y + " Q" + ctrlX + "," + ctrlY + " " + c2.x + "," + c2.y);
        }
        dom.svgLayer.appendChild(path);
    });
}

function updatePhaseDots() {
    dom.phaseDots.innerHTML = '';
    if (!state.graph.phases) return;
    state.graph.phases.forEach(function(phase, idx) {
        var dot = document.createElement('span');
        dot.className = 'phase-dot';
        if (idx <= state.selectedPhase) dot.classList.add('reached');
        if (idx === state.selectedPhase) dot.classList.add('active');
        dot.setAttribute('data-phase-idx', idx);
        dot.title = phase.label || phase.id;
        dom.phaseDots.appendChild(dot);
    });
}

function updateFlowDropdown() {
    if (state.graph.flows && state.graph.flows.length > 0) {
        dom.flowControls.style.display = '';
        var prevVal = state.selectedFlowId;
        dom.flowSelector.innerHTML = '<option value="__default__">-- Default Sequence --</option>';
        var visibleFlows = state.graph.flows.filter(function(f) { return isFlowVisibleInPhase(f); });
        visibleFlows.forEach(function(f) {
            var opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.name || f.id;
            dom.flowSelector.appendChild(opt);
        });
        dom.flowSelector.value = prevVal;
        if (!dom.flowSelector.value) {
            dom.flowSelector.value = '__default__';
            state.selectedFlowId = '__default__';
            resolveActiveSequence();
        } else {
            state.selectedFlowId = dom.flowSelector.value;
        }
    } else {
        dom.flowControls.style.display = 'none';
        state.selectedFlowId = '__default__';
    }
}

export function render() {
    try {
        var cleanJson = stripJsonComments(dom.input.value);
        cleanJson = normalizeMultilineStrings(cleanJson);
        state.graph = JSON.parse(cleanJson);

        dom.input.classList.remove('invalid');
        dom.errorMsg.classList.remove('visible');
        dom.errorMsg.innerText = "";
        dom.btnUpdate.innerText = "Update Diagram";

        state.nodeMap = {};
        state.zoneMap = {};
        dom.title.innerText = state.graph.title || "";

        // Phase controls
        if (state.graph.phases && state.graph.phases.length > 0) {
            dom.phaseControls.style.display = '';
            if (state.selectedPhase === Infinity) {
                state.selectedPhase = state.graph.phases.length - 1;
            } else {
                state.selectedPhase = Math.min(state.selectedPhase, state.graph.phases.length - 1);
            }
            dom.phaseLabelDisplay.textContent = state.graph.phases[state.selectedPhase].label || state.graph.phases[state.selectedPhase].id;
            updatePhaseDots();
        } else {
            dom.phaseControls.style.display = 'none';
            state.selectedPhase = Infinity;
            dom.phaseDots.innerHTML = '';
        }

        // Flow controls
        updateFlowDropdown();

        resolveActiveSequence();

        var notesText = (state.graph.notes || "").replace(/\\n/g, "\n");
        dom.notebook.textContent = notesText;

        // Render benefits panel (story layer)
        renderBenefitsPanel();

        // Render narrative controls if story exists
        renderNarrativeControls();

        // Render zones
        dom.zonesContainer.innerHTML = '';
        (state.graph.zones || []).forEach(function(z) {
            if (!isVisibleInPhase(z)) return;
            var zEl = document.createElement('div');
            zEl.className = 'zone zone-' + (z.type || 'cloud');
            zEl.id = 'zone-' + z.id;
            zEl.style.left = z.x + 'px';
            zEl.style.top = z.y + 'px';
            zEl.style.width = z.w + 'px';
            zEl.style.height = z.h + 'px';
            var labelEl = document.createElement('div');
            labelEl.className = 'zone-label';
            labelEl.textContent = z.label || z.id;
            zEl.appendChild(labelEl);
            zEl.addEventListener('mousedown', handleZoneDragStart);
            dom.zonesContainer.appendChild(zEl);
            state.zoneMap[z.id] = Object.assign({}, z, { el: zEl });
        });

        dom.container.innerHTML = '';

        (state.graph.nodes || []).forEach(function(n) {
            if (!isVisibleInPhase(n)) return;
            var el = document.createElement('div');
            el.className = 'node type-' + (n.type || 'default') + ' tag-' + (n.tag || 'core');
            el.id = 'node-' + n.id;

            el.style.left = n.x + 'px';
            el.style.top = n.y + 'px';
            el.style.width = n.w ? n.w + 'px' : '100px';
            el.style.height = n.h ? n.h + 'px' : 'auto';

            var iconSvg = ICONS[n.type] || ICONS['default'];

            var statusHtml = '';
            if (n.status === 'ready') statusHtml = '<div class="status-icon status-ready" title="Ready">\u2714</div>';
            else if (n.status === 'wip') statusHtml = '<div class="status-icon status-wip" title="WIP">\u23F3</div>';

            el.innerHTML =
                statusHtml +
                '<div class="node-content-wrapper">' +
                    '<svg class="node-icon" viewBox="0 0 24 24">' + iconSvg + '</svg>' +
                    '<div class="node-label"></div>' +
                '</div>' +
                '<div class="step-badges-container" id="badges-' + n.id + '"></div>';

            var labelText = (n.label || "").replace(/\\n/g, "\n");
            el.querySelector('.node-label').textContent = labelText;
            el.addEventListener('mousedown', handleDragStart);
            dom.container.appendChild(el);

            // Adaptive label sizing — only when height is fixed (n.h is set)
            if (n.h) {
                var lbl = el.querySelector('.node-label');
                var ico = el.querySelector('.node-icon');

                // Step 1: shrink font from 0.8rem to 0.65rem
                if (el.scrollHeight > el.clientHeight) {
                    lbl.style.fontSize = '0.65rem';
                }
                // Step 2: remove bold (600 → 400)
                if (el.scrollHeight > el.clientHeight) {
                    lbl.style.fontWeight = '400';
                }
                // Step 3: shrink icon 24→16px
                if (el.scrollHeight > el.clientHeight) {
                    ico.style.width = '16px';
                    ico.style.height = '16px';
                    ico.style.marginBottom = '2px';
                }
                // Step 4: grow box to fit
                if (el.scrollHeight > el.clientHeight) {
                    el.style.height = 'auto';
                }
            }

            state.nodeMap[n.id] = Object.assign({}, n, { el: el });
        });

        updateConnections();

        if (dom.chkSequenceMode.checked) {
            renderSequenceView();
        }

        resetAnimation(true);

    } catch (e) {
        dom.input.classList.add('invalid');
        dom.errorMsg.innerText = "Error: " + e.message;
        dom.errorMsg.classList.add('visible');
        dom.btnUpdate.innerText = "\u26A0 Fix Syntax";
    }
}
