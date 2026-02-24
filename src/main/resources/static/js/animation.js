/* ── Animation: resetAnimation, togglePlay, runSequence, animateStep, fastForward ── */

import { state, dom } from './state.js';
import { clearLog, clearBadges, addStepBadge, appendLog, showPopUp } from './logging.js';

export function resetAnimation(fullReset) {
    clearTimeout(state.timer);
    state.isPlaying = false;
    state.stepIndex = 0;
    dom.particle.style.display = 'none';
    dom.btnNext.disabled = true;
    dom.btnPlay.innerHTML = "&#9654; Play";

    document.querySelectorAll('.popup-toast').forEach(function(el) { el.remove(); });
    if (fullReset) {
        clearLog();
        clearBadges();
        document.querySelectorAll('g[id^="seq-step-"]').forEach(function(g) { g.style.opacity = 0; });
    }
}

export function fastForward() {
    clearTimeout(state.timer);
    state.isPlaying = false;
    dom.particle.style.display = 'none';

    var seq = state.activeSequence;

    clearLog();
    clearBadges();

    var lastPopUp = null;
    var lastPopUpNode = null;
    seq.forEach(function(step, i) {
        addStepBadge(step.to, i + 1, step.status);
        appendLog(i + 1, step.text, step.status, step.popUp);
        if (step.popUp) { lastPopUp = step.popUp; lastPopUpNode = step.to; }
    });

    document.querySelectorAll('g[id^="seq-step-"]').forEach(function(g) { g.style.opacity = 1; });

    if (lastPopUp) showPopUp(lastPopUp, lastPopUpNode);

    state.stepIndex = seq.length;
    dom.btnPlay.innerHTML = "&#8634; Replay";
    dom.btnNext.disabled = true;
}

export function togglePlay() {
    if (state.isPlaying) {
        clearTimeout(state.timer);
        state.isPlaying = false;
        dom.btnPlay.innerHTML = "&#9654; Resume";
    } else {
        if (state.stepIndex === 0 || state.stepIndex >= state.activeSequence.length) {
            state.stepIndex = 0;
            clearLog();
            clearBadges();
            document.querySelectorAll('g[id^="seq-step-"]').forEach(function(g) { g.style.opacity = 0; });
        }
        state.isPlaying = true;
        dom.btnPlay.innerHTML = "&#9208; Pause";
        runSequence();
    }
}

export function runSequence() {
    if (!state.isPlaying) return;
    var seq = state.activeSequence;
    if (state.stepIndex >= seq.length) {
        state.isPlaying = false;
        dom.btnPlay.innerHTML = "&#8634; Replay";
        return;
    }

    var step = seq[state.stepIndex];
    animateStep(step, state.stepIndex + 1, function() {
        state.stepIndex++;
        if (dom.chkPause.checked) {
            state.isPlaying = false;
            dom.btnPlay.innerHTML = "&#9654; Resume";
            dom.btnNext.disabled = false;
        } else {
            var delay = parseFloat(dom.inpDelay.value) * 1000;
            state.timer = setTimeout(runSequence, delay);
        }
    });
}

function animateStep(step, stepNum, cb) {
    var isSequenceMode = dom.chkSequenceMode.checked;

    if (isSequenceMode) {
        var groupId = state.sequenceGroups[stepNum - 1];
        if (groupId) {
            var el = document.getElementById(groupId);
            if (el) el.style.opacity = 1;
            appendLog(stepNum, step.text, step.status, step.popUp);
        } else {
            appendLog(stepNum, step.text + " (Hidden in Seq)", step.status, step.popUp);
        }
        if (step.popUp) showPopUp(step.popUp, step.to);
        setTimeout(cb, 500);
    } else {
        var n1 = state.nodeMap[step.from];
        var n2 = state.nodeMap[step.to];
        if (!n1 || !n2) { cb(); return; }

        var p = dom.particle;
        var x1 = parseInt(n1.el.style.left) + n1.el.offsetWidth / 2;
        var y1 = parseInt(n1.el.style.top) + n1.el.offsetHeight / 2;
        var x2 = parseInt(n2.el.style.left) + n2.el.offsetWidth / 2;
        var y2 = parseInt(n2.el.style.top) + n2.el.offsetHeight / 2;

        p.style.display = 'block';
        p.style.transition = 'none';
        p.style.left = (x1 - 6) + 'px';
        p.style.top = (y1 - 6) + 'px';
        void p.offsetWidth;
        p.style.transition = 'all 1s ease-in-out';
        p.style.left = (x2 - 6) + 'px';
        p.style.top = (y2 - 6) + 'px';

        setTimeout(function() {
            addStepBadge(step.to, stepNum, step.status);
            appendLog(stepNum, step.text, step.status, step.popUp);
            if (step.popUp) showPopUp(step.popUp, step.to);
            cb();
        }, 1000);
    }
}
