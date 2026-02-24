/* ── PDF export functions ── */

import { state, dom } from './state.js';
import { fastForward } from './animation.js';
import { renderSequenceView } from './sequence-view.js';

export function initPdfExport() {
    dom.btnExportPdf.onclick = function() {
        dom.optionsDropdown.classList.remove('open');
        dom.pdfOverlay.classList.add('visible');
    };

    dom.btnPdfCancel.onclick = function() {
        dom.pdfOverlay.classList.remove('visible');
    };

    dom.btnPdfGo.onclick = function() {
        dom.pdfOverlay.classList.remove('visible');
        var choice = document.querySelector('input[name="pdf-view"]:checked').value;
        exportToPDF(choice);
    };
}

function exportToPDF(viewChoice) {
    fastForward();

    var renderArea = dom.exportArea;
    renderArea.style.top = '0px';
    renderArea.style.left = '0px';
    renderArea.style.position = 'fixed';
    renderArea.style.zIndex = '99999';
    renderArea.style.background = getComputedStyle(document.body).getPropertyValue('--bg-color').trim();
    renderArea.innerHTML = '';

    var titleEl = document.createElement('h2');
    titleEl.style.cssText = 'color:' + getComputedStyle(document.body).getPropertyValue('--text-main').trim() + ';padding:20px 20px 10px;margin:0;font-family:Segoe UI,sans-serif;';
    titleEl.textContent = state.graph.title || 'Architecture Diagram';
    renderArea.appendChild(titleEl);

    var promises = [];

    if (viewChoice === 'collab' || viewChoice === 'both') {
        promises.push(captureCollabView());
    }

    if (viewChoice === 'sequence' || viewChoice === 'both') {
        promises.push(captureSequenceView());
    }

    promises.push(captureNotebookView());
    promises.push(captureLogsView());

    Promise.all(promises).then(function(canvases) {
        var totalHeight = 60;
        canvases.forEach(function(c) { totalHeight += c.height + 20; });

        var pdf = new jspdf.jsPDF({
            orientation: totalHeight > 1200 ? 'portrait' : 'landscape',
            unit: 'px',
            format: [1200, totalHeight]
        });

        var bgColor = getComputedStyle(document.body).getPropertyValue('--bg-color').trim();
        pdf.setFillColor(bgColor);
        pdf.rect(0, 0, 1200, totalHeight, 'F');

        var textColor = document.body.classList.contains('light-theme') ? '#333333' : '#d4d4d4';
        pdf.setTextColor(textColor);
        pdf.setFontSize(18);
        pdf.text(state.graph.title || 'Architecture Diagram', 20, 35);

        var yPos = 60;
        canvases.forEach(function(canvas) {
            var imgData = canvas.toDataURL('image/png');
            var ratio = Math.min(1160 / canvas.width, 1);
            var w = canvas.width * ratio;
            var h = canvas.height * ratio;
            pdf.addImage(imgData, 'PNG', 20, yPos, w, h);
            yPos += h + 20;
        });

        pdf.save((state.graph.title || 'diagram') + '.pdf');

        renderArea.innerHTML = '';
        renderArea.style.top = '-99999px';
        renderArea.style.left = '-99999px';
        renderArea.style.zIndex = '-1';
    });
}

function captureCollabView() {
    return new Promise(function(resolve) {
        var clone = dom.previewCanvas.cloneNode(true);
        clone.style.position = 'relative';
        clone.style.width = '1160px';
        clone.style.height = '600px';
        clone.style.overflow = 'hidden';
        clone.classList.remove('hidden');

        var label = document.createElement('div');
        label.style.cssText = 'padding:8px 15px;font-size:14px;font-weight:bold;color:' + getComputedStyle(document.body).getPropertyValue('--text-main').trim() + ';font-family:Segoe UI,sans-serif;';
        label.textContent = 'Collaboration View (Spatial)';
        dom.exportArea.appendChild(label);
        dom.exportArea.appendChild(clone);

        setTimeout(function() {
            html2canvas(clone, { backgroundColor: null, scale: 2, useCORS: true }).then(function(canvas) {
                resolve(canvas);
            });
        }, 300);
    });
}

function captureSequenceView() {
    return new Promise(function(resolve) {
        var wasVisible = dom.sequenceView.classList.contains('visible');
        if (!wasVisible) renderSequenceView();

        document.querySelectorAll('g[id^="seq-step-"]').forEach(function(g) { g.style.opacity = 1; });

        var clone = dom.sequenceView.cloneNode(true);
        clone.style.position = 'relative';
        clone.style.width = '1160px';
        clone.style.minHeight = '400px';
        clone.style.overflow = 'visible';
        clone.style.opacity = '1';
        clone.style.pointerEvents = 'auto';
        clone.style.background = getComputedStyle(document.body).getPropertyValue('--bg-color').trim();

        var label = document.createElement('div');
        label.style.cssText = 'padding:8px 15px;font-size:14px;font-weight:bold;color:' + getComputedStyle(document.body).getPropertyValue('--text-main').trim() + ';font-family:Segoe UI,sans-serif;margin-top:10px;';
        label.textContent = 'Sequence Diagram';
        dom.exportArea.appendChild(label);
        dom.exportArea.appendChild(clone);

        setTimeout(function() {
            html2canvas(clone, { backgroundColor: null, scale: 2, useCORS: true }).then(function(canvas) {
                resolve(canvas);
            });
        }, 300);
    });
}

function captureNotebookView() {
    return new Promise(function(resolve) {
        var notes = state.graph.notes || '';
        if (!notes) {
            var placeholder = document.createElement('canvas');
            placeholder.width = 1;
            placeholder.height = 1;
            resolve(placeholder);
            return;
        }

        var container = document.createElement('div');
        container.style.cssText = 'width:400px;background:#fdf6e3;border:1px solid #d4c4a8;border-radius:4px;font-family:Segoe UI,Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;color:#222;';

        var header = document.createElement('div');
        header.style.cssText = 'background:#eee8d5;color:#586e75;padding:5px 12px;font-size:0.7rem;font-weight:bold;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #d4c4a8;border-radius:4px 4px 0 0;';
        header.textContent = 'Project Notes';
        container.appendChild(header);

        var body = document.createElement('div');
        body.style.cssText = 'padding:6px 16px 6px 24px;line-height:16px;font-weight:500;white-space:pre-wrap;word-wrap:break-word;background-image:linear-gradient(transparent 15px,#d4c4a8 1px);background-size:100% 16px;';
        body.textContent = notes.replace(/\\n/g, '\n');
        container.appendChild(body);

        var label = document.createElement('div');
        label.style.cssText = 'padding:8px 15px;font-size:14px;font-weight:bold;color:' + getComputedStyle(document.body).getPropertyValue('--text-main').trim() + ';font-family:Segoe UI,sans-serif;margin-top:10px;';
        label.textContent = 'Notebook';
        dom.exportArea.appendChild(label);
        dom.exportArea.appendChild(container);

        setTimeout(function() {
            html2canvas(container, { backgroundColor: null, scale: 1, useCORS: true }).then(function(canvas) {
                resolve(canvas);
            });
        }, 300);
    });
}

function captureLogsView() {
    return new Promise(function(resolve) {
        var container = document.createElement('div');
        container.style.cssText = 'width:1160px;background:' + getComputedStyle(document.body).getPropertyValue('--bg-color').trim() + ';padding:0;font-family:Consolas,monospace;font-size:10px;';

        var label = document.createElement('div');
        label.style.cssText = 'padding:8px 15px;font-size:14px;font-weight:bold;color:' + getComputedStyle(document.body).getPropertyValue('--text-main').trim() + ';font-family:Segoe UI,sans-serif;margin-top:10px;';
        label.textContent = 'Steps / Log';
        dom.exportArea.appendChild(label);

        var entries = dom.logPane.querySelectorAll('.log-entry');
        entries.forEach(function(entry) {
            var clone = entry.cloneNode(true);
            clone.style.animation = 'none';
            container.appendChild(clone);
        });

        if (entries.length === 0) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding:10px 15px;color:#666;font-style:italic;';
            empty.textContent = 'No steps recorded.';
            container.appendChild(empty);
        }

        dom.exportArea.appendChild(container);

        setTimeout(function() {
            html2canvas(container, { backgroundColor: null, scale: 1, useCORS: true }).then(function(canvas) {
                resolve(canvas);
            });
        }, 300);
    });
}
