/* ── Sequence view rendering ── */

import { state, dom } from './state.js';
import { isVisibleInPhase } from './core-data.js';

export function renderSequenceView() {
    var allNodes = state.graph.nodes || [];
    var visibleNodes = allNodes.filter(function(n) { return !n.skipSequence && isVisibleInPhase(n); });
    var sequence = state.activeSequence;
    state.sequenceGroups = [];

    if (visibleNodes.length === 0) {
        dom.sequenceView.innerHTML = "<div style='padding:20px; color:#aaa;'>No visible nodes for sequence.</div>";
        return;
    }

    var colWidth = 160;
    var startX = 60;
    var headerHeight = 60;
    var rowHeight = 50;

    var svgWidth = startX + (visibleNodes.length * colWidth);
    var svgHeight = headerHeight + (sequence.length * rowHeight) + 50;

    var arrowFill = document.body.classList.contains('light-theme') ? '#555' : '#d4d4d4';

    var svg = '<svg width="' + svgWidth + '" height="' + svgHeight + '" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">' +
        '<polygon points="0 0, 10 3.5, 0 7" fill="' + arrowFill + '" /></marker>';

    // Add clip paths for each participant header
    visibleNodes.forEach(function(node, index) {
        var x = startX + (index * colWidth) + (colWidth / 2);
        svg += '<clipPath id="clip-seq-' + index + '"><rect x="' + (x - 60) + '" y="10" width="120" height="40" /></clipPath>';
    });
    svg += '</defs>';

    visibleNodes.forEach(function(node, index) {
        var x = startX + (index * colWidth) + (colWidth / 2);
        var tagClass = node.tag ? 'tag-' + node.tag : 'tag-core';
        var label = (node.label || '').replace(/\\n/g, ' ');

        // Shrink font for long labels so they fit the 120px-wide header
        var fontSize = 12;
        var maxTextWidth = 110;
        var estCharWidth = 7.2;
        if (label.length * estCharWidth > maxTextWidth) {
            fontSize = Math.max(8, Math.floor(12 * maxTextWidth / (label.length * estCharWidth)));
        }

        var statusSvg = "";
        if (node.status === 'ready') {
            statusSvg = '<circle cx="' + (x + 60) + '" cy="10" r="8" class="seq-status-bg status-ready-svg" />' +
                '<text x="' + (x + 60) + '" y="10" class="seq-status-text">\u2714</text>';
        } else if (node.status === 'wip') {
            statusSvg = '<circle cx="' + (x + 60) + '" cy="10" r="8" class="seq-status-bg status-wip-svg" />' +
                '<text x="' + (x + 60) + '" y="10" class="seq-status-text">\u23F3</text>';
        }

        svg += '<g class="seq-node ' + tagClass + '">' +
            '<rect x="' + (x - 60) + '" y="10" width="120" height="40" class="seq-head-rect" />' +
            '<text x="' + x + '" y="35" class="seq-head-text" style="font-size:' + fontSize + 'px" clip-path="url(#clip-seq-' + index + ')">' + label + '</text>' +
            statusSvg +
            '<line x1="' + x + '" y1="50" x2="' + x + '" y2="' + svgHeight + '" class="seq-lifeline" />' +
            '</g>';
    });

    sequence.forEach(function(step, index) {
        var srcIndex = visibleNodes.findIndex(function(n) { return n.id === step.from; });
        var tgtIndex = visibleNodes.findIndex(function(n) { return n.id === step.to; });

        var y = headerHeight + (index * rowHeight) + 30;
        var groupId = 'seq-step-' + index;
        state.sequenceGroups[index] = groupId;

        if (srcIndex !== -1 && tgtIndex !== -1) {
            var x1 = startX + (srcIndex * colWidth) + (colWidth / 2);
            var x2 = startX + (tgtIndex * colWidth) + (colWidth / 2);
            var labelX = (x1 + x2) / 2;
            var labelText = '[' + (index + 1) + '] ' + step.text;

            svg += '<g id="' + groupId + '" style="opacity: 0; transition: opacity 0.5s ease-in-out;">' +
                '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" class="seq-arrow" />' +
                '<text x="' + labelX + '" y="' + (y - 6) + '" class="seq-arrow-label">' + labelText + '</text>' +
                '</g>';
        } else {
            state.sequenceGroups[index] = null;
        }
    });

    svg += '</svg>';
    dom.sequenceView.innerHTML = svg;
}
