/* ── Narrative: wizard-style story mode with slide navigation ── */

import { state, dom } from './state.js';
import { getPhaseIndex, itemBelongsToPhase } from './core-data.js';

var narrativeActive = false;
var autoActivated = false;
var slides = [];
var currentSlide = 0;
var storySession = false;
var returnSlideIdx = 0;
var backArrow = null;

/* ── Init: bind story button + keyboard ── */

export function initNarrative() {
    if (!dom.btnStoryMode) return;
    dom.btnStoryMode.addEventListener('click', function() {
        toggleNarrative();
    });

    // Create back-to-story bar (inserted above canvas-wrapper, hidden by default)
    var stage = document.getElementById('center-stage');
    var wrapper = document.getElementById('canvas-wrapper');
    if (stage && wrapper) {
        backArrow = document.createElement('button');
        backArrow.id = 'narr-back-arrow';
        backArrow.innerHTML = '\u00AB\u00AB Back To Story';
        backArrow.addEventListener('click', returnToStory);
        stage.insertBefore(backArrow, wrapper);
    }

    document.addEventListener('keydown', function(e) {
        if (!narrativeActive) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            navigateSlide(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            navigateSlide(-1);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            toggleNarrative();
        }
    });
}

/* ── Called from rendering.js after each render ── */

export function renderNarrativeControls() {
    if (!dom.btnStoryMode) return;

    if (state.graph.story) {
        dom.btnStoryMode.classList.add('has-story');
    } else {
        dom.btnStoryMode.classList.remove('has-story');
        dom.btnStoryMode.classList.remove('active');
        hideNarrative();
        autoActivated = false;
        return;
    }

    // Auto-activate: ?story=true OR uiHints.initialView === 'narrative'
    if (!autoActivated) {
        var shouldAutoStart = state.storyMode ||
            (state.graph.story.uiHints && state.graph.story.uiHints.initialView === 'narrative');

        if (shouldAutoStart) {
            autoActivated = true;

            // Set initial phase from uiHints
            if (state.graph.story.uiHints && state.graph.story.uiHints.initialPhase && state.graph.phases) {
                var initIdx = getPhaseIndex(state.graph.story.uiHints.initialPhase);
                if (initIdx >= 0) {
                    state.selectedPhase = initIdx;
                    dom.phaseSlider.value = initIdx;
                    if (state.graph.phases[initIdx]) {
                        dom.phaseLabelDisplay.textContent = state.graph.phases[initIdx].label || state.graph.phases[initIdx].id;
                    }
                }
            }

            narrativeActive = true;
            dom.btnStoryMode.classList.add('active');
            buildSlides(state.graph.story);
            currentSlide = 0;
            showNarrative();
            return;
        }
    }

    if (narrativeActive) {
        renderCurrentSlide();
    }
}

/* ── Build flat slides array from story JSON ── */

function buildSlides(story) {
    slides = [];

    if (story.problem) {
        slides.push({ type: 'problem', data: story.problem });
    }

    if (story.vision) {
        slides.push({ type: 'vision', data: story.vision });
    }

    if (story.phases && story.phases.length > 0) {
        story.phases.forEach(function(phase, idx) {
            slides.push({ type: 'phase', data: phase, phaseIdx: idx });
        });
    }
}

/* ── Toggle / show / hide ── */

function toggleNarrative() {
    if (!state.graph.story) return;

    narrativeActive = !narrativeActive;
    dom.btnStoryMode.classList.toggle('active', narrativeActive);

    if (narrativeActive) {
        buildSlides(state.graph.story);
        // Resume at the slide we left if coming back from architecture sub-view
        if (storySession) {
            currentSlide = returnSlideIdx;
        } else {
            currentSlide = 0;
        }
        showNarrative();
    } else {
        hideNarrative();
    }
}

function showNarrative() {
    if (!dom.narrativeView) return;
    dom.narrativeView.classList.add('visible');
    dom.previewCanvas.classList.add('hidden');
    dom.sequenceView.classList.remove('visible');
    if (dom.chkSequenceMode.checked) {
        dom.chkSequenceMode.checked = false;
        dom.chkSequenceMode.dispatchEvent(new Event('change'));
    }

    // Hide notebook + benefits panel (we render our own sidebar)
    if (dom.notebookWidget) dom.notebookWidget.classList.add('hidden');
    if (dom.benefitsPanel) dom.benefitsPanel.classList.remove('visible');

    // Hide back arrow (we're in story slides now)
    if (backArrow) backArrow.style.display = 'none';

    storySession = true;

    // Add story-active class to body
    document.body.classList.add('story-active');

    // Sync URL param
    updateUrlStoryParam(true);

    renderCurrentSlide();
}

function hideNarrative() {
    narrativeActive = false;
    storySession = false;
    if (!dom.narrativeView) return;
    dom.narrativeView.classList.remove('visible');
    dom.previewCanvas.classList.remove('hidden');

    // Restore notebook
    if (dom.notebookWidget) dom.notebookWidget.classList.remove('hidden');

    // Hide back arrow
    if (backArrow) backArrow.style.display = 'none';

    var kpiHud = document.getElementById('kpi-hud');
    if (kpiHud) kpiHud.classList.remove('visible');

    document.body.classList.remove('story-active');

    // Remove story param from URL
    updateUrlStoryParam(false);
}

/* ── Navigation ── */

function navigateSlide(delta) {
    var newIdx = currentSlide + delta;
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= slides.length) newIdx = slides.length - 1;
    if (newIdx === currentSlide) return;
    currentSlide = newIdx;

    // Sync phase when landing on a phase slide
    var slide = slides[currentSlide];
    if (slide.type === 'phase') {
        syncPhase(slide.phaseIdx);
    }

    renderCurrentSlide();
}

function goToSlide(idx) {
    if (idx < 0 || idx >= slides.length || idx === currentSlide) return;
    currentSlide = idx;
    var slide = slides[currentSlide];
    if (slide.type === 'phase') {
        syncPhase(slide.phaseIdx);
    }
    renderCurrentSlide();
}

function syncPhase(phaseIdx) {
    state.selectedPhase = phaseIdx;
    dom.phaseSlider.value = phaseIdx;
    if (state.graph.phases && state.graph.phases[phaseIdx]) {
        dom.phaseLabelDisplay.textContent = state.graph.phases[phaseIdx].label || state.graph.phases[phaseIdx].id;
    }
}

/* ── Render current slide ── */

function renderCurrentSlide() {
    if (!dom.narrativeView || !slides.length) return;

    var slide = slides[currentSlide];
    var story = state.graph.story;
    var html = '';

    // Scrollable content area (slide + sidebar)
    html += '<div class="narr-content-area">';

    html += '<div class="narr-slide-container">';
    html += '<div class="narr-slide type-' + slide.type + '">';

    if (slide.type === 'problem') {
        html += renderProblemSlide(slide.data, story.kpis || []);
    } else if (slide.type === 'vision') {
        html += renderVisionSlide(slide.data, story.kpis || []);
    } else if (slide.type === 'phase') {
        html += renderPhaseSlide(slide.data, slide.phaseIdx, story);
    }

    html += '</div>'; // .narr-slide
    html += '</div>'; // .narr-slide-container

    // Benefits sidebar (right)
    html += renderBenefitsSidebar(story);

    html += '</div>'; // .narr-content-area

    // Nav bar (pinned at bottom, outside scroll area)
    html += renderNavBar();

    dom.narrativeView.innerHTML = html;

    // Bind events
    bindNavButtons();
    bindScopeChips();
    bindViewArchButtons();
    bindIdeaNodeChips();
    bindBenefitCards();

    // KPI HUD
    renderKpiHud();
}

/* ── Problem slide ── */

function renderProblemSlide(problem, kpis) {
    var html = '<div class="narr-section-label">The Problem</div>';

    html += '<div class="narr-problem-headline">' + escapeHtml(problem.headline) + '</div>';

    if (problem.impactMetric) {
        var kpi = kpis.find(function(k) { return k.id === problem.impactMetric.kpiId; });
        var label = kpi ? kpi.label : problem.impactMetric.kpiId;
        html += '<div class="narr-impact-badge">';
        html += '<span>\u26A0</span> ';
        html += '<span>' + escapeHtml(label) + ': <strong>' + problem.impactMetric.value + ' ' + (problem.impactMetric.unit || '') + '</strong></span>';
        html += '</div>';
    }

    html += '<div class="narr-problem-desc">' + escapeHtml(problem.description) + '</div>';

    if (problem.risks && problem.risks.length > 0) {
        html += '<div class="narr-risk-chips">';
        problem.risks.forEach(function(risk) {
            html += '<div class="narr-risk-chip">' + escapeHtml(risk) + '</div>';
        });
        html += '</div>';
    }

    if (problem.evidence && problem.evidence.length > 0) {
        html += '<div class="narr-evidence-links">';
        problem.evidence.forEach(function(ev) {
            html += '<span class="narr-evidence-link" title="' + escapeHtml(ev.url || '') + '">';
            html += '\uD83D\uDCCE ' + escapeHtml(ev.label);
            html += '</span>';
        });
        html += '</div>';
    }

    if (problem.scope && problem.scope.length > 0) {
        html += '<div class="narr-scope-chips">';
        problem.scope.forEach(function(nodeId) {
            html += '<span class="narr-scope-chip" data-node-id="' + escapeHtml(nodeId) + '">' + escapeHtml(nodeId) + '</span>';
        });
        html += '</div>';
    }

    return html;
}

/* ── Vision slide ── */

function renderVisionSlide(vision, kpis) {
    var html = '<div class="narr-section-label">The Vision</div>';

    html += '<div class="narr-vision-summary">' + escapeHtml(vision.summary) + '</div>';
    html += '<div class="narr-vision-desc">' + escapeHtml(vision.description) + '</div>';

    if (vision.kpiTargets && vision.kpiTargets.length > 0) {
        html += '<div class="narr-kpi-targets">';
        vision.kpiTargets.forEach(function(target) {
            var kpi = kpis.find(function(k) { return k.id === target.kpiId; });
            var label = kpi ? kpi.label : target.kpiId;
            var baseline = kpi ? kpi.baseline : 0;
            var targetMid = (target.min + target.max) / 2;

            var scaleMax = target.max * 1.2;
            if (kpi && kpi.direction === 'lower_is_better') {
                scaleMax = baseline * 1.2;
            }
            var fillPct = Math.min((targetMid / scaleMax) * 100, 100);
            var confMinPct = Math.min((target.min / scaleMax) * 100, 100);
            var confMaxPct = Math.min((target.max / scaleMax) * 100, 100);

            var valueText = target.min + ' \u2013 ' + target.max;
            if (kpi && kpi.unit) valueText += ' ' + kpi.unit;
            if (target.horizon) valueText += ' (' + target.horizon + ')';

            html += '<div class="narr-kpi-target">';
            html += '<div class="narr-kpi-target-label">' + escapeHtml(label) + '</div>';
            html += '<div class="narr-kpi-target-bar">';
            html += '<div class="narr-kpi-target-confidence" style="left:' + confMinPct + '%;width:' + (confMaxPct - confMinPct) + '%"></div>';
            html += '<div class="narr-kpi-target-fill" style="width:' + fillPct + '%"></div>';
            html += '</div>';
            html += '<div class="narr-kpi-target-value">' + valueText + '</div>';
            html += '</div>';
        });
        html += '</div>';
    }

    if (vision.acceptanceCriteria && vision.acceptanceCriteria.length > 0) {
        html += '<div class="narr-acceptance">';
        html += '<div class="narr-acceptance-title">Acceptance Criteria</div>';
        vision.acceptanceCriteria.forEach(function(criterion) {
            html += '<div class="narr-acceptance-item">';
            html += '<span class="narr-acceptance-check">\u25CB</span>';
            html += '<span>' + escapeHtml(criterion) + '</span>';
            html += '</div>';
        });
        html += '</div>';
    }

    return html;
}

/* ── Phase slide ── */

function renderPhaseSlide(phaseData, phaseIdx, story) {
    var html = '<div class="narr-section-label">Phase ' + phaseData.order + ' \u2014 ' + escapeHtml(phaseData.label) + '</div>';

    // Meta: status, owner, timebox
    html += '<div class="narr-phase-meta">';
    var statusCls = phaseData.status || 'planned';
    html += '<span class="narr-phase-status-badge ' + statusCls + '">' + escapeHtml(phaseData.status || 'planned') + '</span>';
    if (phaseData.owner) {
        html += '<span class="narr-phase-owner">' + escapeHtml(phaseData.owner) + '</span>';
    }
    if (phaseData.timebox) {
        html += '<span class="narr-phase-timebox">' + escapeHtml(phaseData.timebox) + '</span>';
    }
    html += '</div>';

    if (phaseData.description) {
        html += '<div class="narr-phase-desc">' + escapeHtml(phaseData.description) + '</div>';
    }

    // Idea cards for this phase
    var phaseRef = phaseData.phaseRef;
    var ideaCards = (story.ideaCards || []).filter(function(idea) {
        return (idea.phases || []).indexOf(phaseRef) >= 0;
    });

    if (ideaCards.length > 0) {
        var kpiMap = {};
        (story.kpis || []).forEach(function(k) { kpiMap[k.id] = k; });

        html += '<div class="narr-ideas-container">';
        html += '<div class="narr-ideas-title">Initiatives</div>';

        ideaCards.forEach(function(idea) {
            var confidenceCls = 'conf-' + (idea.confidence || 'medium');
            var statusIcon = idea.status === 'accepted' ? '\u2705' : (idea.status === 'rejected' ? '\u274C' : '\uD83D\uDCA1');

            html += '<div class="narr-idea-card ' + confidenceCls + '">';
            html += '<div class="narr-idea-header">';
            html += '<span class="narr-idea-status-icon">' + statusIcon + '</span>';
            html += '<span class="narr-idea-title">' + escapeHtml(idea.title) + '</span>';
            html += '<span class="narr-idea-confidence">' + escapeHtml(idea.confidence || '') + '</span>';
            html += '</div>';

            html += '<div class="narr-idea-hypothesis">' + escapeHtml(idea.hypothesis) + '</div>';

            if (idea.expectedKpiImpacts && idea.expectedKpiImpacts.length > 0) {
                html += '<div class="narr-idea-impacts">';
                idea.expectedKpiImpacts.forEach(function(impact) {
                    var kpi = kpiMap[impact.kpiId];
                    var label = kpi ? kpi.label : impact.kpiId;
                    var sign = impact.delta > 0 ? '+' : '';
                    var unit = kpi ? kpi.unit : '';
                    var impCls = '';
                    if (kpi) {
                        var good = (kpi.direction === 'higher_is_better' && impact.delta > 0) ||
                                   (kpi.direction === 'lower_is_better' && impact.delta < 0);
                        impCls = good ? 'impact-positive' : 'impact-negative';
                    }
                    html += '<span class="narr-idea-impact ' + impCls + '">' + escapeHtml(label) + ' ' + sign + impact.delta + ' ' + unit + '</span>';
                });
                html += '</div>';
            }

            if (idea.linkedNodes && idea.linkedNodes.length > 0) {
                html += '<div class="narr-idea-nodes">';
                idea.linkedNodes.forEach(function(nid) {
                    html += '<span class="narr-idea-node-chip" data-node-id="' + escapeHtml(nid) + '">' + escapeHtml(nid) + '</span>';
                });
                html += '</div>';
            }

            html += '</div>';
        });

        html += '</div>';
    }

    // View Architecture button
    html += '<button class="narr-view-arch-btn" data-phase-idx="' + phaseIdx + '">View Architecture \u2192</button>';

    return html;
}

/* ── Benefits sidebar (accumulates up to current phase) ── */

function renderBenefitsSidebar(story) {
    if (!story.benefits || story.benefits.length === 0) return '';

    var slide = slides[currentSlide];
    var html = '<div class="narr-benefits-sidebar">';
    html += '<div class="narr-benefits-sidebar-title">Benefits</div>';

    // Determine which phases are "reached"
    if (slide.type === 'problem' || slide.type === 'vision') {
        html += '<div class="narr-benefits-empty">Benefits appear as you advance through phases.</div>';
        html += '</div>';
        return html;
    }

    // For phase slides, show benefits up to and including this phase
    var currentPhaseOrder = slide.data.order;

    // Build ordered list of phases up to current
    var reachedPhases = (story.phases || []).filter(function(p) {
        return p.order <= currentPhaseOrder;
    }).sort(function(a, b) { return a.order - b.order; });

    var reachedPhaseRefs = reachedPhases.map(function(p) { return p.phaseRef; });

    // Filter benefits to reached phases
    var visibleBenefits = story.benefits.filter(function(b) {
        return reachedPhaseRefs.indexOf(b.phaseId) >= 0;
    });

    if (visibleBenefits.length === 0) {
        html += '<div class="narr-benefits-empty">No benefits mapped to this phase yet.</div>';
        html += '</div>';
        return html;
    }

    // Group by phase
    var kpiMap = {};
    (story.kpis || []).forEach(function(k) { kpiMap[k.id] = k; });

    var phaseMap = {};
    (story.phases || []).forEach(function(p) { phaseMap[p.phaseRef] = p; });

    reachedPhases.forEach(function(phase) {
        var phaseBenefits = visibleBenefits.filter(function(b) { return b.phaseId === phase.phaseRef; });
        if (phaseBenefits.length === 0) return;

        html += '<div class="narr-sb-phase-group">';
        html += '<div class="narr-sb-phase-label">Phase ' + phase.order + ' \u2014 ' + escapeHtml(phase.label) + '</div>';

        phaseBenefits.forEach(function(b) {
            var kpi = kpiMap[b.kpiId];
            var targetText = '';
            if (b.targetRange) {
                targetText = b.targetRange.min + ' \u2013 ' + b.targetRange.max;
                if (kpi) targetText += ' ' + kpi.unit;
            }
            var nodeIds = (b.boundNodes || []).join(',');

            html += '<div class="narr-sb-benefit-card phase-' + escapeHtml(b.phaseId) + '" data-bound-nodes="' + escapeHtml(nodeIds) + '">';
            html += '<div class="sb-benefit-title">' + escapeHtml(b.title) + '</div>';
            if (targetText) {
                html += '<div class="sb-benefit-target">' + targetText + '</div>';
            }
            html += '</div>';
        });

        html += '</div>';
    });

    html += '</div>';
    return html;
}

/* ── Nav bar ── */

function renderNavBar() {
    var html = '<div class="narr-nav-bar">';

    html += '<button class="narr-nav-btn" data-nav="-1"' + (currentSlide === 0 ? ' disabled' : '') + '>\u2190 Prev</button>';

    html += '<div class="narr-dots">';
    slides.forEach(function(s, i) {
        var cls = 'narr-dot type-' + s.type;
        if (i === currentSlide) cls += ' active';
        html += '<span class="' + cls + '" data-slide-idx="' + i + '" title="' + slideTitleForDot(s, i) + '"></span>';
    });
    html += '</div>';

    html += '<button class="narr-nav-btn" data-nav="1"' + (currentSlide === slides.length - 1 ? ' disabled' : '') + '>Next \u2192</button>';

    html += '</div>';
    return html;
}

function slideTitleForDot(slide, idx) {
    if (slide.type === 'problem') return 'The Problem';
    if (slide.type === 'vision') return 'The Vision';
    if (slide.type === 'phase') return 'Phase ' + slide.data.order + ' — ' + (slide.data.label || '');
    return 'Slide ' + (idx + 1);
}

/* ── KPI HUD ── */

function renderKpiHud() {
    var kpiHud = document.getElementById('kpi-hud');
    if (!kpiHud || !state.graph.story || !state.graph.story.kpis) {
        if (kpiHud) kpiHud.classList.remove('visible');
        return;
    }

    if (!narrativeActive) {
        kpiHud.classList.remove('visible');
        return;
    }

    var story = state.graph.story;
    var kpis = story.kpis;
    var html = '';

    var phaseValues = computeKpiValuesForPhase(kpis, story);

    kpis.forEach(function(kpi) {
        var currentVal = phaseValues[kpi.id] !== undefined ? phaseValues[kpi.id] : kpi.current;
        var improving = false;
        var declining = false;

        if (kpi.direction === 'higher_is_better') {
            improving = currentVal > kpi.baseline;
            declining = currentVal < kpi.baseline;
        } else {
            improving = currentVal < kpi.baseline;
            declining = currentVal > kpi.baseline;
        }

        var formattedVal = formatKpiValue(currentVal, kpi.format);
        var valClass = improving ? 'improving' : (declining ? 'declining' : '');

        html += '<div class="kpi-hud-card">';
        html += '<div class="kpi-hud-label">' + escapeHtml(kpi.label) + '</div>';
        html += '<div class="kpi-hud-value ' + valClass + '">' + formattedVal + '<span class="kpi-hud-unit">' + escapeHtml(kpi.unit) + '</span></div>';
        html += '</div>';
    });

    kpiHud.innerHTML = html;
    kpiHud.classList.add('visible');
}

function computeKpiValuesForPhase(kpis, story) {
    var values = {};
    kpis.forEach(function(kpi) {
        values[kpi.id] = kpi.baseline;
    });

    var ideaCards = story.ideaCards || [];
    ideaCards.forEach(function(idea) {
        if (idea.status === 'rejected') return;
        var ideaPhases = idea.phases || [];
        var applicable = ideaPhases.some(function(pid) {
            var idx = getPhaseIndex(pid);
            return idx >= 0 && idx <= state.selectedPhase;
        });
        if (!applicable) return;

        (idea.expectedKpiImpacts || []).forEach(function(impact) {
            if (values[impact.kpiId] !== undefined) {
                values[impact.kpiId] += impact.delta;
            }
        });
    });

    return values;
}

function formatKpiValue(val, format) {
    if (!format) return String(Math.round(val));
    if (format === '0') return String(Math.round(val));
    if (format === '0.1f') return val.toFixed(1);
    if (format.indexOf('$') === 0) {
        if (format === '$0.00') return '$' + val.toFixed(2);
        if (format === '$0,0') return '$' + Math.round(val).toLocaleString();
        return '$' + val.toFixed(2);
    }
    return String(Math.round(val));
}

/* ── Event bindings ── */

function bindNavButtons() {
    if (!dom.narrativeView) return;

    dom.narrativeView.querySelectorAll('.narr-nav-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var delta = parseInt(btn.getAttribute('data-nav'));
            if (!isNaN(delta)) navigateSlide(delta);
        });
    });

    dom.narrativeView.querySelectorAll('.narr-dot').forEach(function(dot) {
        dot.addEventListener('click', function() {
            var idx = parseInt(dot.getAttribute('data-slide-idx'));
            if (!isNaN(idx)) goToSlide(idx);
        });
    });
}

function bindScopeChips() {
    if (!dom.narrativeView) return;
    dom.narrativeView.querySelectorAll('.narr-scope-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
            var nodeId = chip.getAttribute('data-node-id');
            if (!nodeId) return;
            transitionToCollab(null, [nodeId]);
        });
    });
}

function bindViewArchButtons() {
    if (!dom.narrativeView) return;
    dom.narrativeView.querySelectorAll('.narr-view-arch-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var idx = parseInt(btn.getAttribute('data-phase-idx'));
            if (isNaN(idx)) return;

            state.selectedPhase = idx;
            dom.phaseSlider.value = idx;
            if (state.graph.phases && state.graph.phases[idx]) {
                dom.phaseLabelDisplay.textContent = state.graph.phases[idx].label || state.graph.phases[idx].id;
            }

            var phaseId = state.graph.phases[idx] ? state.graph.phases[idx].id : null;
            var boundNodes = [];
            if (phaseId) {
                (state.graph.nodes || []).forEach(function(n) {
                    if (itemBelongsToPhase(n, phaseId)) boundNodes.push(n.id);
                });
            }

            transitionToCollab(idx, boundNodes);
        });
    });
}

function bindIdeaNodeChips() {
    if (!dom.narrativeView) return;
    dom.narrativeView.querySelectorAll('.narr-idea-node-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
            var nodeId = chip.getAttribute('data-node-id');
            if (!nodeId) return;
            transitionToCollab(null, [nodeId]);
        });
    });
}

function bindBenefitCards() {
    if (!dom.narrativeView) return;
    dom.narrativeView.querySelectorAll('.narr-sb-benefit-card').forEach(function(card) {
        card.addEventListener('click', function() {
            var nodesStr = card.getAttribute('data-bound-nodes');
            if (!nodesStr) return;
            var nodeIds = nodesStr.split(',').filter(function(s) { return s.length > 0; });
            if (nodeIds.length > 0) {
                transitionToCollab(null, nodeIds);
            }
        });
    });
}

/* ── Transition to collab view ── */

function transitionToCollab(phaseIdx, glowNodeIds) {
    import('./rendering.js').then(function(mod) {
        // Remember where we are so we can come back
        returnSlideIdx = currentSlide;
        storySession = true;

        narrativeActive = false;
        dom.btnStoryMode.classList.remove('active');

        dom.narrativeView.classList.remove('visible');
        dom.previewCanvas.classList.remove('hidden');

        // Notebook stays hidden during story session

        var kpiHud = document.getElementById('kpi-hud');
        if (kpiHud) kpiHud.classList.remove('visible');

        document.body.classList.remove('story-active');

        // Show back arrow
        if (backArrow) backArrow.style.display = 'flex';

        mod.render();

        // Re-hide notebook after render (story session keeps it off)
        // Benefits panel stays visible — render() shows it naturally
        if (dom.notebookWidget) dom.notebookWidget.classList.add('hidden');

        if (glowNodeIds && glowNodeIds.length > 0) {
            setTimeout(function() {
                glowNodeIds.forEach(function(nid) {
                    var nodeEl = document.getElementById('node-' + nid);
                    if (nodeEl) {
                        nodeEl.classList.add('narr-glow');
                        setTimeout(function() { nodeEl.classList.remove('narr-glow'); }, 3000);
                    }
                });
            }, 400);
        }
    });
}

function returnToStory() {
    if (!state.graph.story) return;

    buildSlides(state.graph.story);
    currentSlide = returnSlideIdx;
    narrativeActive = true;
    dom.btnStoryMode.classList.add('active');

    // Sync phase if returning to a phase slide
    var slide = slides[currentSlide];
    if (slide && slide.type === 'phase') {
        syncPhase(slide.phaseIdx);
    }

    showNarrative();
}

/* ── URL sync ── */

function updateUrlStoryParam(active) {
    var url = new URL(window.location);
    if (active) {
        url.searchParams.set('story', 'true');
    } else {
        url.searchParams.delete('story');
    }
    window.history.replaceState({}, '', url);
}

/* ── Utility ── */

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
