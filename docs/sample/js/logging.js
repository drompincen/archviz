/* ── Logging: clearLog, appendLog, showPopUp, badges ── */

import { state, dom } from './state.js';
import { POPUP_ICONS } from './constants.js';

export function clearLog() {
    dom.logPane.innerHTML = '<div class="log-entry" style="color:#666; font-style:italic;">Ready...</div>';
}

export function clearBadges() {
    document.querySelectorAll('.step-badge').forEach(function(el) { el.remove(); });
}

export function addStepBadge(nodeId, stepNum, status) {
    var container = document.getElementById('badges-' + nodeId);
    if (container) {
        var badge = document.createElement('div');
        badge.className = 'step-badge';
        if (status === 'wip') badge.classList.add('badge-wip');
        else if (status === 'ready') badge.classList.add('badge-ready');
        else badge.classList.add('badge-default');
        badge.innerText = stepNum;
        container.appendChild(badge);
    }
}

export function showPopUp(popUp, nodeId) {
    if (!popUp || !popUp.type || !popUp.msg) return;
    document.querySelectorAll('.popup-toast').forEach(function(el) { el.remove(); });
    var toast = document.createElement('div');
    toast.className = 'popup-toast popup-' + popUp.type;
    var iconSvg = POPUP_ICONS[popUp.type] || POPUP_ICONS.alert;
    toast.innerHTML = '<div class="popup-icon">' + iconSvg + '</div><div class="popup-msg"></div>';
    toast.querySelector('.popup-msg').textContent = popUp.msg;

    var node = nodeId ? state.nodeMap[nodeId] : null;
    if (node && node.el) {
        dom.previewCanvas.appendChild(toast);
        void toast.offsetWidth;
        var nodeLeft = parseInt(node.el.style.left) || 0;
        var nodeTop = parseInt(node.el.style.top) || 0;
        var nodeW = node.el.offsetWidth || node.w || 100;
        var toastW = toast.offsetWidth;
        var toastH = toast.offsetHeight;
        toast.style.left = (nodeLeft + nodeW / 2 - toastW / 2) + 'px';
        toast.style.top = (nodeTop - toastH - 10) + 'px';
    } else {
        toast.style.position = 'fixed';
        toast.style.top = '80px';
        toast.style.right = '30px';
        document.body.appendChild(toast);
    }

    requestAnimationFrame(function() { toast.classList.add('visible'); });

    setTimeout(function() {
        toast.classList.remove('visible');
        setTimeout(function() { toast.remove(); }, 400);
    }, 3000);
}

export function appendLog(stepNum, text, status, popUp) {
    if (dom.logPane.children[0] && dom.logPane.children[0].innerText.includes("Ready")) {
        dom.logPane.innerHTML = '';
    }
    var div = document.createElement('div');
    div.className = 'log-entry';
    var timeStr = new Date().toLocaleTimeString().split(' ')[0];

    var tagHtml = '';
    if (status === 'wip') tagHtml = '<span class="log-tag tag-wip">[WIP]</span>';
    else if (status === 'ready') tagHtml = '<span class="log-tag tag-ready">[READY]</span>';

    var popUpHtml = '';
    if (popUp && popUp.type && popUp.msg) {
        var iconSvg = POPUP_ICONS[popUp.type] || POPUP_ICONS.alert;
        popUpHtml = '<span class="log-popup-icon">' + iconSvg + '</span><span class="log-popup-msg"></span>';
    }

    div.innerHTML = '<span class="log-step">Step ' + stepNum + '</span>' + tagHtml + '<span class="log-text"></span>' + popUpHtml + '<span class="log-time">' + timeStr + '</span>';
    div.querySelector('.log-text').textContent = text;
    if (popUp && popUp.msg && div.querySelector('.log-popup-msg')) {
        div.querySelector('.log-popup-msg').textContent = popUp.msg;
    }
    dom.logPane.appendChild(div);
    dom.logPane.scrollTop = dom.logPane.scrollHeight;
}
