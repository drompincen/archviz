/* ── Benefits panel rendering ── */

import { state, dom } from './state.js';
import { getPhaseIndex } from './core-data.js';

export function renderBenefitsPanel() {
    if (!state.graph.story || !state.graph.story.benefits || state.graph.story.benefits.length === 0) {
        dom.benefitsPanel.classList.remove('visible');
        return;
    }

    if (dom.chkShowKpis && !dom.chkShowKpis.checked) {
        dom.benefitsPanel.classList.remove('visible');
        return;
    }

    var story = state.graph.story;
    var kpiMap = {};
    (story.kpis || []).forEach(function(k) { kpiMap[k.id] = k; });

    var visibleBenefits = story.benefits.filter(function(b) {
        if (!b.phaseId) return true;
        var idx = getPhaseIndex(b.phaseId);
        return idx >= 0 && idx <= state.selectedPhase;
    });

    if (visibleBenefits.length === 0) {
        dom.benefitsPanel.classList.remove('visible');
        return;
    }

    var nbWidget = dom.notebookWidget;
    if (!nbWidget.classList.contains('hidden')) {
        var nbRect = nbWidget.getBoundingClientRect();
        var stageRect = dom.centerStage.getBoundingClientRect();
        dom.benefitsPanel.style.top = (nbRect.bottom - stageRect.top + 10) + 'px';
        dom.benefitsPanel.style.right = '20px';
        dom.benefitsPanel.style.bottom = '';
    } else {
        dom.benefitsPanel.style.top = '20px';
        dom.benefitsPanel.style.right = '20px';
        dom.benefitsPanel.style.bottom = '';
    }

    var phaseGroups = {};
    visibleBenefits.forEach(function(b) {
        var key = b.phaseId || '_none';
        if (!phaseGroups[key]) phaseGroups[key] = [];
        phaseGroups[key].push(b);
    });

    var html = '';

    (state.graph.phases || []).forEach(function(phase, phaseIdx) {
        if (phaseIdx > state.selectedPhase) return;
        var benefits = phaseGroups[phase.id];
        if (!benefits) return;

        var storyPhase = (story.phases || []).find(function(sp) { return sp.phaseRef === phase.id; });
        var phaseLabel = storyPhase ? storyPhase.label : phase.label;
        html += '<div class="benefit-phase-header">' + phaseLabel + '</div>';

        benefits.forEach(function(b) {
            var kpi = kpiMap[b.kpiId];
            var isRealized = b.realized;
            var icon = isRealized ? '\u2705' : '\u23F3';
            var cardClass = isRealized ? 'realized' : 'pending';

            var barPct = 0;
            var barClass = 'positive';
            if (kpi && b.targetRange) {
                var targetMid = (b.targetRange.min + b.targetRange.max) / 2;
                var totalRange = Math.abs(targetMid - b.baseline);
                if (totalRange > 0) {
                    var currentVal = isRealized && b.realizedValue != null ? b.realizedValue : (kpi.current || b.baseline);
                    var progress = Math.abs(currentVal - b.baseline) / totalRange;
                    barPct = Math.min(Math.max(progress * 100, 0), 100);
                }
                if (kpi.direction === 'lower_is_better') {
                    barClass = targetMid < b.baseline ? 'positive' : 'negative';
                } else {
                    barClass = targetMid > b.baseline ? 'positive' : 'negative';
                }
            }

            var nodeChips = '';
            (b.boundNodes || []).forEach(function(nid) {
                nodeChips += '<span>' + nid + '</span>';
            });

            var baselineLabel = '';
            var targetLabel = '';
            if (kpi && kpi.format === 'qualitative') {
                baselineLabel = '\u2014 No Change';
                targetLabel = kpi.direction === 'lower_is_better' ? '\u25BC Reduce' : '\u25B2 Improve';
            } else if (kpi && b.targetRange) {
                baselineLabel = (b.baseline != null ? b.baseline : '') + ' ' + kpi.unit;
                targetLabel = b.targetRange.min + '\u2013' + b.targetRange.max + ' ' + kpi.unit;
            } else if (b.baseline != null) {
                baselineLabel = String(b.baseline);
            }

            html += '<div class="benefit-card ' + cardClass + '" data-benefit-id="' + b.id + '" data-bound-nodes="' + (b.boundNodes || []).join(',') + '">' +
                '<div class="benefit-title"><span class="benefit-icon">' + icon + '</span> ' + b.title + '</div>' +
                '<div class="benefit-kpi-bar"><div class="benefit-kpi-fill ' + barClass + '" style="width:' + barPct + '%"></div></div>' +
                '<div class="benefit-detail"><span>' + baselineLabel + '</span><span>' + targetLabel + '</span></div>' +
                (nodeChips ? '<div class="benefit-nodes">' + nodeChips + '</div>' : '') +
                '</div>';
        });
    });

    dom.benefitsPanel.innerHTML = html;
    dom.benefitsPanel.classList.add('visible');

    dom.benefitsPanel.querySelectorAll('.benefit-card').forEach(function(card) {
        card.addEventListener('click', function() {
            document.querySelectorAll('.node.benefit-highlight').forEach(function(el) {
                el.classList.remove('benefit-highlight');
            });

            var boundNodes = (card.getAttribute('data-bound-nodes') || '').split(',').filter(Boolean);
            boundNodes.forEach(function(nid) {
                var nodeEl = document.getElementById('node-' + nid);
                if (nodeEl) {
                    nodeEl.classList.add('benefit-highlight');
                    setTimeout(function() { nodeEl.classList.remove('benefit-highlight'); }, 3000);
                }
            });
        });
    });
}
