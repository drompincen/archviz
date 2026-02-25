/* ── Global state + DOM refs (singleton) ── */

export const state = {
    graph: {},
    isPlaying: false,
    stepIndex: 0,
    timer: null,
    nodeMap: {},
    zoneMap: {},
    sequenceGroups: [],
    savedLogHeight: 200,
    selectedPhase: Infinity,
    selectedFlowId: '__default__',
    activeSequence: [],
    currentDiagramMeta: null,
    DIAGRAM_META: {},
    SAMPLE_JSONS: {},
    storyMode: false
};

export const dom = {};

export function initDom() {
    dom.input = document.getElementById('json-input');
    dom.errorMsg = document.getElementById('error-msg');
    dom.container = document.getElementById('nodes-container');
    dom.svgLayer = document.getElementById('connections-layer');
    dom.particle = document.getElementById('particle');
    dom.zonesContainer = document.getElementById('zones-container');
    dom.title = document.getElementById('phase-display');
    dom.editorPane = document.getElementById('left-sidebar');
    dom.notebookWidget = document.getElementById('notebook-widget');
    dom.notebook = document.getElementById('notebook-display');
    dom.logPane = document.getElementById('log-pane');
    dom.previewCanvas = document.getElementById('preview-canvas');
    dom.sequenceView = document.getElementById('sequence-view');

    dom.btnPlay = document.getElementById('btn-play');
    dom.btnNext = document.getElementById('btn-next');
    dom.btnFF = document.getElementById('btn-ff');
    dom.btnUpdate = document.getElementById('btn-update');
    dom.btnExportPdf = document.getElementById('opt-export-pdf');
    dom.chkPause = document.getElementById('chk-pause');
    dom.inpDelay = document.getElementById('inp-delay');
    dom.chkEditMode = document.getElementById('chk-edit-mode');
    dom.chkShowEditor = document.getElementById('chk-show-editor');
    dom.chkShowNotes = document.getElementById('chk-show-notes');
    dom.chkSequenceMode = document.getElementById('chk-sequence-mode');
    dom.chkLightMode = document.getElementById('chk-light-mode');
    dom.jsonSelector = document.getElementById('json-selector');
    dom.phaseControls = document.getElementById('phase-controls');
    dom.phaseDots = document.getElementById('phase-dots');
    dom.phaseLabelDisplay = document.getElementById('phase-label-display');
    dom.flowControls = document.getElementById('flow-controls');
    dom.flowSelector = document.getElementById('flow-selector');

    dom.benefitsPanel = document.getElementById('benefits-panel');

    dom.resizer = document.getElementById('pane-resizer');
    dom.centerStage = document.getElementById('center-stage');

    dom.pdfOverlay = document.getElementById('pdf-modal-overlay');
    dom.btnPdfCancel = document.getElementById('btn-pdf-cancel');
    dom.btnPdfGo = document.getElementById('btn-pdf-go');
    dom.exportArea = document.getElementById('export-render-area');

    dom.btnOptions = document.getElementById('btn-options');
    dom.optionsDropdown = document.getElementById('options-dropdown');
    dom.optSave = document.getElementById('opt-save');
    dom.optUpload = document.getElementById('opt-upload');
    dom.optDownload = document.getElementById('opt-download');
    dom.optExportPdf = document.getElementById('opt-export-pdf');
    dom.optDownloadSpec = document.getElementById('opt-download-spec');
    dom.saveOverlay = document.getElementById('save-modal-overlay');

    dom.narrativeView = document.getElementById('narrative-view');
    dom.btnStoryMode = document.getElementById('btn-story-mode');
}
