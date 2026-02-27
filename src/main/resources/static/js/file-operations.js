/* ── File operations: save, upload, download handlers ── */

import { state, dom } from './state.js';
import { stripJsonComments, normalizeMultilineStrings } from './core-data.js';
import { render } from './rendering.js';
import { resetAnimation } from './animation.js';
import { hasOptionForFile, sortDropdownOptions } from './data-loading.js';

function addApiDiagramOption(diagram) {
    if (hasOptionForFile(diagram.id)) return;
    var opt = document.createElement('option');
    opt.value = diagram.id;
    var displayName = diagram.title || diagram.id;
    if (diagram.source === 'db' && diagram.tags && diagram.tags.length > 0) {
        displayName = diagram.title + ' \u2022 ' + diagram.tags[0];
    }
    opt.textContent = displayName;
    opt.dataset.source = diagram.source;
    opt.dataset.diagramId = diagram.id;
    dom.jsonSelector.appendChild(opt);
}

function refreshDiagramDropdown(selectId) {
    while (dom.jsonSelector.options.length > 1) {
        dom.jsonSelector.remove(1);
    }
    fetch('/api/diagrams').then(function(r) { return r.json(); })
        .then(function(diagrams) {
            diagrams.forEach(function(d) { addApiDiagramOption(d); });
            sortDropdownOptions();
            if (selectId) dom.jsonSelector.value = selectId;
        }).catch(function() {});
}

function downloadJson(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/[^a-z0-9_-]/gi, '-').toLowerCase() + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

function downloadEditorJson() {
    var exportData;
    try {
        var cleanJson = stripJsonComments(dom.input.value);
        cleanJson = normalizeMultilineStrings(cleanJson);
        exportData = JSON.parse(cleanJson);
    } catch (e) {
        exportData = { error: 'Invalid JSON in editor' };
    }
    downloadJson(exportData, exportData.title || 'diagram');
}

export function initFileOperations() {
    // Upload JSON
    dom.optUpload.onclick = function() {
        dom.optionsDropdown.classList.remove('open');
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    var cleaned = stripJsonComments(ev.target.result);
                    cleaned = normalizeMultilineStrings(cleaned);
                    var data = JSON.parse(cleaned);
                    if (!data.nodes || !Array.isArray(data.nodes)) {
                        alert('Invalid diagram JSON: must contain a "nodes" array.');
                        return;
                    }
                    dom.input.value = JSON.stringify(data, null, 4);
                    state.currentDiagramMeta = { source: 'editor' };
                    render();
                    resetAnimation(true);
                    document.getElementById('save-title').value = data.title || file.name.replace('.json', '');
                    document.getElementById('save-description').value = '';
                    document.getElementById('save-tags').value = '';
                    document.getElementById('save-modal-title').textContent = 'Save Uploaded Diagram';
                    dom.saveOverlay.classList.add('visible');
                } catch (ex) {
                    alert('Invalid JSON file: ' + ex.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    // Save to Repository
    dom.optSave.onclick = function() {
        dom.optionsDropdown.classList.remove('open');
        var title = state.graph.title || '';
        document.getElementById('save-title').value = title;
        document.getElementById('save-description').value =
            (state.currentDiagramMeta && state.currentDiagramMeta.description) || '';
        document.getElementById('save-tags').value =
            (state.currentDiagramMeta && state.currentDiagramMeta.tags) ? state.currentDiagramMeta.tags.join(', ') : '';
        document.getElementById('save-modal-title').textContent =
            (state.currentDiagramMeta && state.currentDiagramMeta.id && state.currentDiagramMeta.source === 'db')
                ? 'Update Diagram' : 'Save New Diagram';
        dom.saveOverlay.classList.add('visible');
    };

    document.getElementById('btn-save-cancel').onclick = function() {
        dom.saveOverlay.classList.remove('visible');
    };

    document.getElementById('btn-save-confirm').onclick = function() {
        var title = document.getElementById('save-title').value.trim();
        var description = document.getElementById('save-description').value.trim();
        var tagsStr = document.getElementById('save-tags').value.trim();
        var tags = tagsStr ? tagsStr.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];

        var cleanJson = stripJsonComments(dom.input.value);
        cleanJson = normalizeMultilineStrings(cleanJson);
        var flowData;
        try {
            flowData = JSON.parse(cleanJson);
        } catch (e) {
            alert('Fix JSON errors before saving.');
            return;
        }

        var isUpdate = state.currentDiagramMeta && state.currentDiagramMeta.id && state.currentDiagramMeta.source === 'db';
        var url = isUpdate ? '/api/diagrams/' + state.currentDiagramMeta.id : '/api/diagrams';
        var method = isUpdate ? 'PUT' : 'POST';

        var body = {
            title: title || flowData.title || 'Untitled',
            description: description,
            tags: tags,
            flow: flowData
        };

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function(r) {
            if (!r.ok) throw new Error('Save failed: ' + r.status);
            return r.json();
        }).then(function(saved) {
            state.currentDiagramMeta = {
                id: saved.id,
                title: saved.title,
                description: saved.description,
                tags: saved.tags,
                source: 'db',
                version: saved.version
            };
            refreshDiagramDropdown(saved.id);
            dom.saveOverlay.classList.remove('visible');
        }).catch(function(err) {
            alert(err.message);
        });
    };

    // Download JSON Spec
    dom.optDownloadSpec.onclick = function() {
        dom.optionsDropdown.classList.remove('open');
        var a = document.createElement('a');
        a.href = '/json_spec.txt';
        a.download = 'json_spec.txt';
        a.click();
    };

    // Download JSON
    dom.optDownload.onclick = function() {
        dom.optionsDropdown.classList.remove('open');
        if (state.currentDiagramMeta && state.currentDiagramMeta.id) {
            fetch('/api/diagrams/' + state.currentDiagramMeta.id)
                .then(function(r) { return r.json(); })
                .then(function(diagram) {
                    downloadJson(diagram, diagram.title || 'diagram');
                }).catch(function() {
                    downloadEditorJson();
                });
        } else {
            downloadEditorJson();
        }
    };
}
