/* ── UI Interactions: event listeners, drag, resize, toggles ── */

import { state, dom } from './state.js';
import { render, updateConnections } from './rendering.js';
import { resetAnimation, togglePlay, fastForward } from './animation.js';
import { getPhaseIndex, resolveActiveSequence, getFlowPhaseRange } from './core-data.js';
import { renderSequenceView } from './sequence-view.js';
import { CONTENT_TOP } from './constants.js';

// ── Node drag ──
var dragTarget = null, dragOffset = { x: 0, y: 0 };

export function handleDragStart(e) {
    if (!dom.chkEditMode.checked || state.isPlaying || dom.chkSequenceMode.checked) return;
    dragTarget = e.currentTarget;
    var r = dragTarget.getBoundingClientRect();
    dragOffset.x = e.clientX - r.left;
    dragOffset.y = e.clientY - r.top;
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
}

function handleDragMove(e) {
    if (!dragTarget) return;
    var cRect = document.getElementById('preview-canvas').getBoundingClientRect();
    var nx = e.clientX - cRect.left - dragOffset.x;
    var ny = e.clientY - cRect.top - dragOffset.y;
    nx = Math.round(nx / 10) * 10;
    ny = Math.round(ny / 10) * 10;
    dragTarget.style.left = nx + 'px';
    dragTarget.style.top = ny + 'px';
    updateConnections();
}

function handleDragEnd() {
    if (dragTarget) {
        var id = dragTarget.id.replace('node-', '');
        var nodeItem = state.graph.nodes.find(function(n) { return n.id === id; });
        if (nodeItem) {
            nodeItem.x = parseInt(dragTarget.style.left);
            nodeItem.y = parseInt(dragTarget.style.top) - CONTENT_TOP;
            dom.input.value = JSON.stringify(state.graph, null, 4);
        }
    }
    dragTarget = null;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
}

// ── Zone drag ──
var zoneDragTarget = null, zoneDragOffset = { x: 0, y: 0 };

export function handleZoneDragStart(e) {
    if (!dom.chkEditMode.checked || state.isPlaying || dom.chkSequenceMode.checked) return;
    zoneDragTarget = e.currentTarget;
    var r = zoneDragTarget.getBoundingClientRect();
    zoneDragOffset.x = e.clientX - r.left;
    zoneDragOffset.y = e.clientY - r.top;
    e.stopPropagation();
    document.addEventListener('mousemove', handleZoneDragMove);
    document.addEventListener('mouseup', handleZoneDragEnd);
}

function handleZoneDragMove(e) {
    if (!zoneDragTarget) return;
    var cRect = document.getElementById('preview-canvas').getBoundingClientRect();
    var nx = e.clientX - cRect.left - zoneDragOffset.x;
    var ny = e.clientY - cRect.top - zoneDragOffset.y;
    nx = Math.round(nx / 10) * 10;
    ny = Math.round(ny / 10) * 10;
    zoneDragTarget.style.left = nx + 'px';
    zoneDragTarget.style.top = ny + 'px';
}

function handleZoneDragEnd() {
    if (zoneDragTarget) {
        var id = zoneDragTarget.id.replace('zone-', '');
        var zoneItem = (state.graph.zones || []).find(function(z) { return z.id === id; });
        if (zoneItem) {
            zoneItem.x = parseInt(zoneDragTarget.style.left);
            zoneItem.y = parseInt(zoneDragTarget.style.top) - CONTENT_TOP;
            dom.input.value = JSON.stringify(state.graph, null, 4);
        }
    }
    zoneDragTarget = null;
    document.removeEventListener('mousemove', handleZoneDragMove);
    document.removeEventListener('mouseup', handleZoneDragEnd);
}

// ── Pane resizer ──
var isResizing = false;

function handleResize(e) {
    if (!isResizing) return;
    var containerRect = dom.centerStage.getBoundingClientRect();
    var newHeight = containerRect.bottom - e.clientY;
    if (newHeight > 20 && newHeight < containerRect.height * 0.8) {
        dom.logPane.style.height = newHeight + 'px';
        state.savedLogHeight = newHeight;
    }
}

function stopResize() {
    isResizing = false;
    document.body.classList.remove('resizing');
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
}

export function initUIInteractions() {
    // Edit mode
    dom.chkEditMode.addEventListener('change', function(e) {
        document.body.classList.toggle('is-editing', e.target.checked);
    });

    // Show editor
    dom.chkShowEditor.addEventListener('change', function(e) {
        if (e.target.checked) dom.editorPane.classList.remove('hidden');
        else dom.editorPane.classList.add('hidden');
    });

    // Show notes
    dom.chkShowNotes.addEventListener('change', function(e) {
        if (e.target.checked) dom.notebookWidget.classList.remove('hidden');
        else dom.notebookWidget.classList.add('hidden');
    });

    // Sequence mode toggle
    dom.chkSequenceMode.addEventListener('change', function(e) {
        if (e.target.checked) {
            dom.previewCanvas.classList.add('hidden');
            dom.sequenceView.classList.add('visible');
            renderSequenceView();
            dom.btnPlay.disabled = false;
            dom.btnNext.disabled = true;
        } else {
            dom.previewCanvas.classList.remove('hidden');
            dom.sequenceView.classList.remove('visible');
        }
    });

    // KPI HUD toggle — triggers a full re-render so renderKpiHud() evaluates
    if (dom.chkShowKpis) {
        dom.chkShowKpis.addEventListener('change', function() {
            render();
        });
    }

    // Font size +/- buttons
    dom.btnFontUp.addEventListener('click', function(e) {
        e.stopPropagation();
        if (state.nodeFontScale < 5) { state.nodeFontScale++; render(); }
    });
    dom.btnFontDown.addEventListener('click', function(e) {
        e.stopPropagation();
        if (state.nodeFontScale > -3) { state.nodeFontScale--; render(); }
    });

    // Light mode
    dom.chkLightMode.addEventListener('change', function(e) {
        document.body.classList.toggle('light-theme', e.target.checked);
        if (dom.chkSequenceMode.checked) renderSequenceView();
    });

    // Phase dots
    dom.phaseDots.addEventListener('click', function(e) {
        var dot = e.target.closest('.phase-dot');
        if (!dot) return;
        state.selectedPhase = parseInt(dot.getAttribute('data-phase-idx'));
        if (state.graph.phases && state.graph.phases[state.selectedPhase]) {
            dom.phaseLabelDisplay.textContent = state.graph.phases[state.selectedPhase].label || state.graph.phases[state.selectedPhase].id;
        }
        resetAnimation(true);
        render();
    });

    // Flow selector
    dom.flowSelector.addEventListener('change', function() {
        state.selectedFlowId = dom.flowSelector.value;

        // Auto-sync phase dots to the flow's phase range
        if (state.selectedFlowId !== '__default__' && state.graph.flows && state.graph.phases && state.graph.phases.length > 0) {
            var flow = state.graph.flows.find(function(f) { return f.id === state.selectedFlowId; });
            if (flow) {
                var range = getFlowPhaseRange(flow);
                var targetPhase = -1;
                if (range) {
                    // Flow has explicit phases list
                    var currentId = state.graph.phases[state.selectedPhase]
                        ? state.graph.phases[state.selectedPhase].id : null;
                    if (!currentId || flow.phases.indexOf(currentId) < 0) {
                        targetPhase = range.min;
                    }
                } else if (flow.sequence) {
                    // Fallback: scan steps for max phase needed
                    var maxPhaseNeeded = 0;
                    flow.sequence.forEach(function(step) {
                        if (step.phase) {
                            if (Array.isArray(step.phase)) {
                                step.phase.forEach(function(pid) {
                                    var idx = getPhaseIndex(pid);
                                    if (idx > maxPhaseNeeded) maxPhaseNeeded = idx;
                                });
                            } else {
                                var idx = getPhaseIndex(step.phase);
                                if (idx > maxPhaseNeeded) maxPhaseNeeded = idx;
                            }
                        }
                    });
                    if (maxPhaseNeeded !== state.selectedPhase) {
                        targetPhase = maxPhaseNeeded;
                    }
                }
                if (targetPhase >= 0 && targetPhase !== state.selectedPhase) {
                    state.selectedPhase = targetPhase;
                    if (state.graph.phases[state.selectedPhase]) {
                        dom.phaseLabelDisplay.textContent = state.graph.phases[state.selectedPhase].label || state.graph.phases[state.selectedPhase].id;
                    }
                    render();
                }
            }
        }

        resolveActiveSequence();
        resetAnimation(true);
        if (dom.chkSequenceMode.checked) renderSequenceView();
    });

    // Pane resizer
    dom.resizer.addEventListener('mousedown', function() {
        isResizing = true;
        document.body.classList.add('resizing');
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    });

    // Button handlers
    dom.btnUpdate.onclick = function() { render(); resetAnimation(true); };
    dom.btnPlay.onclick = togglePlay;
    dom.btnFF.onclick = fastForward;
    dom.btnNext.onclick = function() {
        dom.btnNext.disabled = true;
        togglePlay();
    };

    // Options dropdown
    dom.btnOptions.onclick = function(e) {
        e.stopPropagation();
        dom.optionsDropdown.classList.toggle('open');
    };
    document.addEventListener('click', function(e) {
        if (!dom.optionsDropdown.contains(e.target) && e.target !== dom.btnOptions) {
            dom.optionsDropdown.classList.remove('open');
        }
    });
    dom.optionsDropdown.querySelectorAll('.opt-toggle').forEach(function(row) {
        row.addEventListener('click', function(e) {
            if (e.target.tagName === 'INPUT') return;
            var cb = row.querySelector('input[type="checkbox"]');
            if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
        });
    });

    // Keyboard shortcuts (block dev tools)
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); return false; }
    });
}
