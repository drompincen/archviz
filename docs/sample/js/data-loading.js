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

// Normalize both "file-foo-bar" and "foo-bar.json" to "foo-bar.json"
export function canonicalFilename(value) {
    if (!value) return value;
    var name = value.replace(/^file-/, '');
    if (!name.endsWith('.json')) name += '.json';
    return name;
}

export function hasOptionForFile(value) {
    var canonical = canonicalFilename(value);
    for (var i = 0; i < dom.jsonSelector.options.length; i++) {
        if (canonicalFilename(dom.jsonSelector.options[i].value) === canonical) return true;
    }
    return false;
}

export function sortDropdownOptions() {
    var opts = [];
    for (var i = 1; i < dom.jsonSelector.options.length; i++) {
        opts.push(dom.jsonSelector.options[i]);
    }
    opts.sort(function(a, b) {
        return a.textContent.toLowerCase().localeCompare(b.textContent.toLowerCase());
    });
    // Remove all non-default options, then re-append sorted
    while (dom.jsonSelector.options.length > 1) {
        dom.jsonSelector.remove(1);
    }
    opts.forEach(function(o) { dom.jsonSelector.appendChild(o); });
}

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
    // Store actual filename for URL sync
    if (diagram.id && diagram.id.indexOf('file-') === 0) {
        opt.dataset.filename = diagram.id.replace(/^file-/, '') + '.json';
    }
    dom.jsonSelector.appendChild(opt);
}

function addJsonFileOptionLegacy(filename) {
    if (hasOptionForFile(filename)) return;
    fetch('json/' + filename).then(function(r) {
        if (!r.ok) return;
        return r.json().then(function(data) {
            var displayName = (data.title || filename.replace('.json', '').replace(/[-_]/g, ' '));
            state.SAMPLE_JSONS[filename] = data;
            if (hasOptionForFile(filename)) return;
            var opt = document.createElement('option');
            opt.value = filename;
            opt.textContent = displayName;
            opt.dataset.filename = filename;
            dom.jsonSelector.appendChild(opt);
            sortDropdownOptions();
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
        sortDropdownOptions();
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
        if (!hasOptionForFile(collabFile)) {
            var opt = document.createElement('option');
            opt.value = collabFile;
            opt.textContent = displayName;
            opt.dataset.filename = collabFile;
            dom.jsonSelector.appendChild(opt);
            sortDropdownOptions();
        }
        // Select the matching option (may have file- prefix from API path)
        var found = false;
        for (var i = 0; i < dom.jsonSelector.options.length; i++) {
            if (canonicalFilename(dom.jsonSelector.options[i].value) === canonicalFilename(collabFile)) {
                dom.jsonSelector.value = dom.jsonSelector.options[i].value;
                found = true;
                break;
            }
        }
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
