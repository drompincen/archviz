/* ── Rendering: render, updateConnections, getNodeCenter ── */

import { state, dom } from './state.js';
import { ICONS, CONTENT_TOP } from './constants.js';
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
        // Include label/step in key so distinct labeled connections aren't merged
        var pairKey = [conn.from, conn.to].sort().join('|');
        var key = pairKey + ':' + (conn.label || '') + ':' + (conn.step != null ? conn.step : '');
        if (!seen[key]) {
            seen[key] = true;
            result.push(conn);
        }
    });
    return result;
}

function ensureArrowMarkers() {
    var defs = dom.svgLayer.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        dom.svgLayer.insertBefore(defs, dom.svgLayer.firstChild);
    }
    return defs;
}

function getMarkerId(color, direction) {
    var safeColor = (color || '#666').replace('#', '');
    return 'arrow-' + direction + '-' + safeColor;
}

function ensureMarker(defs, color, direction) {
    var id = getMarkerId(color, direction);
    if (defs.querySelector('#' + id)) return id;
    var marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", id);
    marker.setAttribute("markerWidth", "8");
    marker.setAttribute("markerHeight", "8");
    marker.setAttribute("fill", color || '#666');
    marker.setAttribute("orient", "auto-start-reverse");
    if (direction === 'forward') {
        marker.setAttribute("refX", "7");
        marker.setAttribute("refY", "4");
        marker.setAttribute("viewBox", "0 0 8 8");
        marker.innerHTML = '<path d="M0,0 L8,4 L0,8 Z"/>';
    } else {
        marker.setAttribute("refX", "1");
        marker.setAttribute("refY", "4");
        marker.setAttribute("viewBox", "0 0 8 8");
        marker.innerHTML = '<path d="M8,0 L0,4 L8,8 Z"/>';
    }
    defs.appendChild(marker);
    return id;
}

function getPointOnPath(pathEl, t) {
    var len = pathEl.getTotalLength();
    var pt = pathEl.getPointAtLength(len * t);
    return { x: pt.x, y: pt.y };
}

export function updateConnections() {
    dom.svgLayer.innerHTML = '';
    if (!state.graph.connections) return;

    var defs = ensureArrowMarkers();

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

        // Resolve style properties with backwards-compatible defaults
        var connStyle = conn.style || 'dashed';
        var connColor = conn.color || null; // null = use CSS default
        var connArrow = conn.arrow || 'none';
        var strokeDasharray = '';
        if (connStyle === 'dashed') strokeDasharray = '6,4';
        else if (connStyle === 'dotted') strokeDasharray = '2,3';
        // 'solid' → no dasharray

        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "connector");

        if (Math.abs(avoidOffset) < 5) {
            path.setAttribute("d", "M" + c1.x + "," + c1.y + " L" + c2.x + "," + c2.y);
        } else {
            path.setAttribute("d", "M" + c1.x + "," + c1.y + " Q" + ctrlX + "," + ctrlY + " " + c2.x + "," + c2.y);
        }

        // Apply style overrides
        if (strokeDasharray) {
            path.setAttribute("stroke-dasharray", strokeDasharray);
        } else {
            path.removeAttribute("stroke-dasharray");
            path.style.strokeDasharray = 'none';
        }
        if (connColor) {
            path.style.stroke = connColor;
        }
        if (conn.thickness) {
            path.style.strokeWidth = conn.thickness + 'px';
        }

        // Arrow markers
        var markerColor = connColor || '#666';
        if (connArrow === 'forward' || connArrow === 'both') {
            var fwdId = ensureMarker(defs, markerColor, 'forward');
            path.setAttribute("marker-end", "url(#" + fwdId + ")");
        }
        if (connArrow === 'reverse' || connArrow === 'both') {
            var revId = ensureMarker(defs, markerColor, 'reverse');
            path.setAttribute("marker-start", "url(#" + revId + ")");
        }

        dom.svgLayer.appendChild(path);

        // Connection label at midpoint
        if (conn.label) {
            var labelPt = getPointOnPath(path, 0.5);
            var labelG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            labelG.setAttribute("class", "conn-label-group");

            // Background rect for readability
            var bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bgRect.setAttribute("class", "conn-label-bg");

            var labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            labelText.setAttribute("class", "conn-label");
            labelText.setAttribute("x", labelPt.x);
            labelText.setAttribute("y", labelPt.y - 8);
            labelText.setAttribute("text-anchor", "middle");
            labelText.setAttribute("dominant-baseline", "auto");
            labelText.textContent = conn.label;
            if (connColor) labelText.style.fill = connColor;

            labelG.appendChild(bgRect);
            labelG.appendChild(labelText);
            dom.svgLayer.appendChild(labelG);

            // Size background rect after text is in DOM
            requestAnimationFrame(function() {
                var bbox = labelText.getBBox();
                bgRect.setAttribute("x", bbox.x - 4);
                bgRect.setAttribute("y", bbox.y - 2);
                bgRect.setAttribute("width", bbox.width + 8);
                bgRect.setAttribute("height", bbox.height + 4);
                bgRect.setAttribute("rx", "3");
            });
        }

        // Step number badge at 25% along path
        if (conn.step != null) {
            var stepPt = getPointOnPath(path, 0.25);
            var badgeColor = connColor || 'var(--highlight)';

            var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("class", "conn-step-circle");
            circle.setAttribute("cx", stepPt.x);
            circle.setAttribute("cy", stepPt.y);
            circle.setAttribute("r", "10");
            circle.style.fill = badgeColor;

            var stepText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            stepText.setAttribute("class", "conn-step-number");
            stepText.setAttribute("x", stepPt.x);
            stepText.setAttribute("y", stepPt.y);
            stepText.setAttribute("text-anchor", "middle");
            stepText.setAttribute("dominant-baseline", "central");
            stepText.textContent = conn.step;

            dom.svgLayer.appendChild(circle);
            dom.svgLayer.appendChild(stepText);
        }
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

function renderSections() {
    dom.sectionsContainer.innerHTML = '';
    if (!state.graph.sections) return;

    state.graph.sections.forEach(function(sec) {
        var band = document.createElement('div');
        band.className = 'section-band';
        band.style.top = (sec.y + CONTENT_TOP) + 'px';
        band.style.height = sec.height + 'px';

        // Sidebar
        var sidebar = document.createElement('div');
        sidebar.className = 'section-sidebar';
        sidebar.style.background = sec.color || '#555';

        if (sec.icon) {
            var iconWrap = document.createElement('div');
            iconWrap.className = 'section-sidebar-icon';
            var iconSvg = ICONS[sec.icon];
            if (iconSvg) {
                iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor">' + iconSvg + '</svg>';
            } else if (sec.icon.match(/^(https:\/\/|[a-zA-Z0-9_.\/\-]+)$/)) {
                iconWrap.innerHTML = '<img src="' + sec.icon + '" alt="">';
            }
            sidebar.appendChild(iconWrap);
        }

        var labelEl = document.createElement('div');
        labelEl.className = 'section-sidebar-label';
        labelEl.textContent = sec.label || '';
        sidebar.appendChild(labelEl);

        if (sec.description) {
            var descEl = document.createElement('div');
            descEl.className = 'section-sidebar-desc';
            descEl.textContent = sec.description;
            sidebar.appendChild(descEl);
        }

        band.appendChild(sidebar);

        // Content area
        var content = document.createElement('div');
        content.className = 'section-content';
        if (sec.color) {
            content.style.borderLeft = '2px solid ' + sec.color;
            content.style.background = sec.color + '08'; // very faint tint
        }
        band.appendChild(content);

        dom.sectionsContainer.appendChild(band);
    });
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

        // Render narrative controls if story exists
        renderNarrativeControls();

        // Render sections (horizontal bands behind everything)
        renderSections();

        // Render zones
        dom.zonesContainer.innerHTML = '';
        (state.graph.zones || []).forEach(function(z) {
            if (!isVisibleInPhase(z)) return;
            var zEl = document.createElement('div');
            zEl.className = 'zone zone-' + (z.type || 'cloud');
            zEl.id = 'zone-' + z.id;
            zEl.style.left = z.x + 'px';
            zEl.style.top = (z.y + CONTENT_TOP) + 'px';
            zEl.style.width = z.w + 'px';
            zEl.style.height = z.h + 'px';

            // Zone style overrides
            if (z.bgColor) zEl.style.background = z.bgColor;
            if (z.borderColor) zEl.style.borderColor = z.borderColor;
            if (z.borderStyle) {
                if (z.borderStyle === 'none') zEl.style.border = 'none';
                else zEl.style.borderStyle = z.borderStyle;
            }

            var labelEl = document.createElement('div');
            labelEl.className = 'zone-label';
            if (z.labelPosition === 'top-center') labelEl.classList.add('label-top-center');
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
            el.style.top = (n.y + CONTENT_TOP) + 'px';
            el.style.width = n.w ? n.w + 'px' : '100px';
            el.style.height = n.h ? n.h + 'px' : 'auto';

            var iconSvg = ICONS[n.type] || ICONS['default'];

            var statusHtml = '';
            if (n.status === 'ready') statusHtml = '<div class="status-icon status-ready" title="Ready">\u2714</div>';
            else if (n.status === 'wip') statusHtml = '<div class="status-icon status-wip" title="WIP">\u23F3</div>';

            // Use <img> for custom image, otherwise SVG icon
            var iconHtml;
            if (n.image) {
                var safeSrc = n.image;
                // Only allow relative paths and https:// URLs
                if (!/^(https:\/\/|[a-zA-Z0-9_.\/\-]+)$/.test(safeSrc)) safeSrc = '';
                iconHtml = safeSrc
                    ? '<img class="node-icon" src="' + safeSrc + '" onerror="this.outerHTML=\'<svg class=\\\'node-icon\\\' viewBox=\\\'0 0 24 24\\\'>' + (ICONS[n.type] || ICONS['default']).replace(/'/g, "\\'") + '</svg>\'">'
                    : '<svg class="node-icon" viewBox="0 0 24 24">' + iconSvg + '</svg>';
            } else {
                iconHtml = '<svg class="node-icon" viewBox="0 0 24 24">' + iconSvg + '</svg>';
            }

            el.innerHTML =
                statusHtml +
                '<div class="node-content-wrapper">' +
                    iconHtml +
                    '<div class="node-label"></div>' +
                '</div>' +
                '<div class="step-badges-container" id="badges-' + n.id + '"></div>';

            var labelText = (n.label || "").replace(/\\n/g, "\n");
            el.querySelector('.node-label').textContent = labelText;
            el.addEventListener('mousedown', handleDragStart);
            dom.container.appendChild(el);

            // Apply user font-scale to node labels
            var baseFontRem = 0.8 + state.nodeFontScale * 0.1;
            if (baseFontRem < 0.5) baseFontRem = 0.5;
            var lbl = el.querySelector('.node-label');
            lbl.style.fontSize = baseFontRem + 'rem';

            // Adaptive label sizing — only when height is fixed (n.h is set)
            if (n.h) {
                var ico = el.querySelector('.node-icon');

                // Step 1: shrink font to baseFontRem - 0.15rem
                var shrunkRem = baseFontRem - 0.15;
                if (shrunkRem < 0.5) shrunkRem = 0.5;
                if (el.scrollHeight > el.clientHeight) {
                    lbl.style.fontSize = shrunkRem + 'rem';
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

        // Render benefits panel after nodes/zones so it sees current layout
        renderBenefitsPanel();

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
