/* ── Data loading: init, discoverJsonFiles, handleCollabParam, json selector ── */

import { state, dom, initDom } from './state.js';
import { editorString } from './constants.js';
import { render } from './rendering.js';
import { resetAnimation } from './animation.js';
import { clearLog } from './logging.js';
import { initUIInteractions } from './ui-interactions.js';
import { initPdfExport } from './export-pdf.js';
import { initFileOperations } from './file-operations.js';
import { initNarrative } from './narrative.js';

function addApiDiagramOption(diagram) {
    for (var i = 0; i < dom.jsonSelector.options.length; i++) {
        if (dom.jsonSelector.options[i].value === diagram.id) return;
    }
    var opt = document.createElement('option');
    opt.value = diagram.id;
    var displayName = diagram.title || diagram.id;
    if (diagram.source === 'db' && diagram.tags && diagram.tags.length > 0) {
        displayName = diagram.title + ' \u2022 ' + diagram.tags[0];
    }
    opt.textContent = displayName;
    opt.dataset.source = diagram.source;
    opt.dataset.diagramId = diagram.id;
    // Store actual filename for URL sync
    if (diagram.id && diagram.id.indexOf('file-') === 0) {
        opt.dataset.filename = diagram.id.replace(/^file-/, '') + '.json';
    }
    dom.jsonSelector.appendChild(opt);
}

function addJsonFileOptionLegacy(filename) {
    for (var i = 0; i < dom.jsonSelector.options.length; i++) {
        if (dom.jsonSelector.options[i].value === filename) return;
    }
    fetch('json/' + filename).then(function(r) {
        if (!r.ok) return;
        return r.json().then(function(data) {
            var displayName = (data.title || filename.replace('.json', '').replace(/[-_]/g, ' '));
            state.SAMPLE_JSONS[filename] = data;
            for (var j = 0; j < dom.jsonSelector.options.length; j++) {
                if (dom.jsonSelector.options[j].value === filename) return;
            }
            var opt = document.createElement('option');
            opt.value = filename;
            opt.textContent = displayName;
            opt.dataset.filename = filename;
            dom.jsonSelector.appendChild(opt);
        });
    }).catch(function() {});
}

function discoverJsonFiles() {
    fetch('/api/diagrams').then(function(r) {
        if (!r.ok) throw new Error('API unavailable');
        return r.json();
    }).then(function(diagrams) {
        if (!diagrams) return;
        diagrams.forEach(function(d) {
            addApiDiagramOption(d);
        });
    }).catch(function() {
        fallbackDiscoverJsonFiles();
    });
}

function fallbackDiscoverJsonFiles() {
    fetch('json/').then(function(r) {
        if (!r.ok) return;
        return r.text();
    }).then(function(html) {
        if (!html) return;
        var matches = html.match(/[\w\-]+\.json/g);
        if (!matches) return;
        var unique = matches.filter(function(v, i, a) { return a.indexOf(v) === i; });
        unique.forEach(function(filename) {
            addJsonFileOptionLegacy(filename);
        });
    }).catch(function() {});
}

function handleCollabParam() {
    var params = new URLSearchParams(window.location.search);
    var storyParam = params.get('story');
    if (storyParam === 'true') state.storyMode = true;
    var collabFile = params.get('collab');
    if (!collabFile) return;
    fetch('json/' + collabFile).then(function(r) {
        if (!r.ok) throw new Error('File not found: ' + collabFile);
        return r.json();
    }).then(function(data) {
        state.SAMPLE_JSONS[collabFile] = data;
        var displayName = data.title || collabFile.replace('.json', '').replace(/[-_]/g, ' ');
        var exists = false;
        for (var i = 0; i < dom.jsonSelector.options.length; i++) {
            if (dom.jsonSelector.options[i].value === collabFile) { exists = true; break; }
        }
        if (!exists) {
            var opt = document.createElement('option');
            opt.value = collabFile;
            opt.textContent = displayName;
            opt.dataset.filename = collabFile;
            dom.jsonSelector.appendChild(opt);
        }
        dom.jsonSelector.value = collabFile;
        dom.input.value = JSON.stringify(data, null, 4);
        render();
        resetAnimation(true);
    }).catch(function(err) {
        console.warn('Could not load ?collab=' + collabFile + ':', err.message);
    });
}

function syncCollabUrl(key) {
    var url = new URL(window.location);
    if (key && key !== '__default__') {
        // Read filename from the selected option's data-filename attribute
        var selectedOpt = dom.jsonSelector.options[dom.jsonSelector.selectedIndex];
        var filename = (selectedOpt && selectedOpt.dataset.filename) || key;
        // Fallback: derive from key if data-filename not set
        if (!filename.endsWith('.json')) {
            filename = filename.replace(/^file-/, '') + '.json';
        }
        url.searchParams.set('collab', filename);
    } else {
        url.searchParams.delete('collab');
    }
    window.history.replaceState({}, '', url);
}

function initJsonSelector() {
    dom.jsonSelector.addEventListener('change', function() {
        var key = dom.jsonSelector.value;
        if (key === '__default__') {
            dom.input.value = editorString;
            state.currentDiagramMeta = null;
            syncCollabUrl(null);
            render();
            resetAnimation(true);
            return;
        }
        if (state.SAMPLE_JSONS[key]) {
            dom.input.value = JSON.stringify(state.SAMPLE_JSONS[key], null, 4);
            state.currentDiagramMeta = state.DIAGRAM_META[key] || null;
            syncCollabUrl(key);
            render();
            resetAnimation(true);
            return;
        }
        fetch('/api/diagrams/' + key).then(function(r) {
            if (!r.ok) throw new Error('Not found');
            return r.json();
        }).then(function(diagram) {
            state.currentDiagramMeta = {
                id: diagram.id,
                title: diagram.title,
                description: diagram.description,
                tags: diagram.tags,
                source: diagram.source,
                version: diagram.version
            };
            var flowData = diagram.flow;
            if (flowData && !flowData.title) {
                flowData.title = diagram.title;
            }
            state.DIAGRAM_META[key] = state.currentDiagramMeta;
            state.SAMPLE_JSONS[key] = flowData;
            dom.input.value = JSON.stringify(flowData, null, 4);
            syncCollabUrl(key);
            render();
            resetAnimation(true);
        }).catch(function() {
            dom.input.value = editorString;
            state.currentDiagramMeta = null;
            render();
            resetAnimation(true);
        });
    });
}

function init() {
    initDom();
    dom.input.value = editorString;
    initUIInteractions();
    initPdfExport();
    initFileOperations();
    initJsonSelector();
    initNarrative();
    render();
    clearLog();
    discoverJsonFiles();
    handleCollabParam();
}

init();
