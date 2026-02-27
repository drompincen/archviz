package io.github.drompincen.archviz.ui;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CollabPageIT {

    @LocalServerPort
    private int port;

    private Playwright playwright;
    private Browser browser;
    private Page page;

    @BeforeAll
    void launchBrowser() {
        playwright = Playwright.create();
        browser = playwright.chromium().launch(
                new BrowserType.LaunchOptions().setHeadless(true));
    }

    @AfterAll
    void closeBrowser() {
        if (browser != null) browser.close();
        if (playwright != null) playwright.close();
    }

    @BeforeEach
    void newPage() {
        page = browser.newPage();
        page.navigate("http://localhost:" + port + "/collab-animation.html");
        page.waitForLoadState();
    }

    @Test
    void pageLoads_titleAndHeader() {
        assertEquals("DROM: Architecture Viz", page.title());
        assertThat(page.locator(".brand")).containsText("DROM");
    }

    @Test
    void defaultDiagram_rendersNodes() {
        Locator nodes = page.locator("#nodes-container .node");
        assertTrue(nodes.count() >= 3,
                "Default diagram should render at least 3 nodes, found " + nodes.count());
    }

    @Test
    void defaultDiagram_rendersConnections() {
        Locator paths = page.locator("#connections-layer path.connector");
        assertTrue(paths.count() >= 2,
                "Default diagram should have at least 2 connections, found " + paths.count());
    }

    @Test
    void invalidJson_showsError() {
        // Open options dropdown and enable JSON editor first
        page.locator("#btn-options").click();
        page.locator("#chk-show-editor").dispatchEvent("click");
        page.locator("#left-sidebar").waitFor(new Locator.WaitForOptions().setState(com.microsoft.playwright.options.WaitForSelectorState.VISIBLE));

        page.locator("#json-input").fill("{ invalid json !!!");
        page.locator("#btn-update").click();
        assertThat(page.locator("#error-msg")).hasClass(java.util.regex.Pattern.compile(".*visible.*"));
    }

    @Test
    void themeToggle_appliesLightClass() {
        assertFalse(page.locator("body").evaluate("el => el.classList.contains('light-theme')").toString().equals("true"),
                "Body should not have light-theme initially");
        // Open options dropdown, then click the theme checkbox
        page.locator("#btn-options").click();
        page.locator("#chk-light-mode").dispatchEvent("click");
        assertTrue(page.locator("body").evaluate("el => el.classList.contains('light-theme')").toString().equals("true"),
                "Body should have light-theme after toggling");
    }

    @Test
    void editorToggle_showsHidesSidebar() {
        // sidebar starts hidden
        assertThat(page.locator("#left-sidebar")).hasClass(java.util.regex.Pattern.compile(".*hidden.*"));
        // Open options dropdown, then check the "JSON Editor" checkbox
        page.locator("#btn-options").click();
        page.locator("#chk-show-editor").dispatchEvent("click");
        Locator sidebar = page.locator("#left-sidebar");
        page.waitForFunction("!document.getElementById('left-sidebar').classList.contains('hidden')");
        assertFalse(sidebar.getAttribute("class").contains("hidden"),
                "Sidebar should be visible after toggling editor on");
    }

    @Test
    void optionsDropdown_opensCloses() {
        Locator dropdown = page.locator("#options-dropdown");
        assertFalse(dropdown.getAttribute("class") != null && dropdown.getAttribute("class").contains("open"),
                "Dropdown should be closed initially");
        page.locator("#btn-options").click();
        assertTrue(dropdown.getAttribute("class").contains("open"),
                "Dropdown should open after clicking options button");
    }

    @Test
    void diagramSelector_loadsJson() {
        // Wait for json-selector to be populated with more than default
        page.waitForFunction("document.getElementById('json-selector').options.length > 1");
        Locator selector = page.locator("#json-selector");

        // Pick the second option (first real diagram)
        String secondValue = (String) selector.evaluate("el => el.options[1].value");
        selector.selectOption(secondValue);

        // Wait for the editor to load new JSON (title won't be "Simple API Flow")
        page.waitForFunction("!document.getElementById('json-input').value.includes('Simple API Flow')");

        // Editor should have new content
        String editorContent = page.locator("#json-input").inputValue();
        assertFalse(editorContent.contains("Simple API Flow"),
                "Editor should contain new diagram JSON, not the default");

        // Should have rendered nodes
        Locator nodes = page.locator("#nodes-container .node");
        assertTrue(nodes.count() >= 1, "Loaded diagram should render nodes");
    }

    @Test
    void diagramSelector_syncsUrl() {
        page.waitForFunction("document.getElementById('json-selector').options.length > 1");
        Locator selector = page.locator("#json-selector");
        String secondValue = (String) selector.evaluate("el => el.options[1].value");
        selector.selectOption(secondValue);
        page.waitForFunction("window.location.href.includes('collab=')");

        String url = page.url();
        assertTrue(url.contains("collab="), "URL should contain ?collab= after selecting a diagram");
    }

    @Test
    void storyMode_activatesViaUrl() {
        page.navigate("http://localhost:" + port +
                "/collab-animation.html?collab=coffee-shop-transformation.json&story=true");
        page.waitForLoadState();
        page.locator("#narrative-view.visible").waitFor();

        assertThat(page.locator("#narrative-view")).hasClass(java.util.regex.Pattern.compile(".*visible.*"));
    }

    @Test
    void storyMode_navigatesSlides() {
        page.navigate("http://localhost:" + port +
                "/collab-animation.html?collab=coffee-shop-transformation.json&story=true");
        page.waitForLoadState();
        page.locator(".narr-slide.type-problem").waitFor();

        // Should start on first slide (problem)
        assertThat(page.locator(".narr-slide.type-problem")).isVisible();

        // Click Next
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-vision").waitFor();

        // Should now be on vision slide
        assertThat(page.locator(".narr-slide.type-vision")).isVisible();

        // Click Prev
        page.locator(".narr-nav-btn[data-nav='-1']").click();
        page.locator(".narr-slide.type-problem").waitFor();

        // Back to problem
        assertThat(page.locator(".narr-slide.type-problem")).isVisible();
    }

    @Test
    void storyMode_viewArchitecture() {
        page.navigate("http://localhost:" + port +
                "/collab-animation.html?collab=coffee-shop-transformation.json&story=true");
        page.waitForLoadState();
        page.locator(".narr-slide.type-problem").waitFor();

        // Navigate to first phase slide (Problem -> Vision -> Phase 0)
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-vision").waitFor();
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-phase").waitFor();

        // Click "View Architecture"
        page.locator(".narr-view-arch-btn").click();
        page.waitForFunction("!document.getElementById('narrative-view').classList.contains('visible')");

        // Narrative should be hidden, canvas visible
        assertFalse(page.locator("#narrative-view").getAttribute("class").contains("visible"),
                "Narrative view should be hidden after View Architecture");
        assertFalse(page.locator("#preview-canvas").getAttribute("class").contains("hidden"),
                "Preview canvas should be visible after View Architecture");

        // Back arrow should be visible
        assertThat(page.locator("#narr-back-arrow")).isVisible();
    }

    /** Navigate to coffee-shop diagram and wait for it to fully render. */
    private void loadCoffeeShop() {
        page.navigate("http://localhost:" + port +
                "/collab-animation.html?collab=coffee-shop-transformation.json");
        page.waitForLoadState();
        // Wait for a coffee-shop-specific node to confirm the JSON loaded
        page.waitForFunction("document.getElementById('node-walk-in') !== null");
    }

    /** Dismiss auto-started story mode and re-render at the given phase. */
    private void dismissStoryAndGoToPhase(int phaseIdx) {
        // Toggle off narrative via the story button (properly resets internal state)
        page.locator("#btn-story-mode").dispatchEvent("click");
        page.waitForFunction("!document.body.classList.contains('story-active')");
        // Click phase dot to force a clean re-render at the desired phase
        page.locator("#phase-dots .phase-dot[data-phase-idx='" + phaseIdx + "']").dispatchEvent("click");
        page.waitForFunction(
                "document.querySelector('#phase-dots .phase-dot.active[data-phase-idx=\"" + phaseIdx + "\"]') !== null");
    }

    @Test
    void phaseArrayVisibility_nodeHidesInLaterPhase() {
        // Load coffee-shop diagram which has card-terminal with phase: ["legacy", "mobile"]
        loadCoffeeShop();
        dismissStoryAndGoToPhase(0);

        // At phase 0 (legacy), card-terminal should be in the DOM
        assertEquals(1, page.locator("#node-card-terminal").count(),
                "card-terminal should exist at phase 0 (legacy)");

        // Click phase dot 1 (mobile) — still present
        page.locator("#phase-dots .phase-dot[data-phase-idx='1']").dispatchEvent("click");
        page.waitForFunction("document.getElementById('node-card-terminal') !== null");
        assertEquals(1, page.locator("#node-card-terminal").count(),
                "card-terminal should exist at phase 1 (mobile)");

        // Click phase dot 2 (credits) — should be removed from DOM
        page.locator("#phase-dots .phase-dot[data-phase-idx='2']").dispatchEvent("click");
        page.waitForFunction("document.getElementById('node-card-terminal') === null");
        assertEquals(0, page.locator("#node-card-terminal").count(),
                "card-terminal should be gone at phase 2 (credits)");

        // Click phase dot 3 (analytics) — still gone
        page.locator("#phase-dots .phase-dot[data-phase-idx='3']").dispatchEvent("click");
        page.waitForFunction("document.getElementById('node-card-terminal') === null");
        assertEquals(0, page.locator("#node-card-terminal").count(),
                "card-terminal should be gone at phase 3 (analytics)");

        // Click phase dot 0 (legacy) — should reappear
        page.locator("#phase-dots .phase-dot[data-phase-idx='0']").dispatchEvent("click");
        page.waitForFunction("document.getElementById('node-card-terminal') !== null");
        assertEquals(1, page.locator("#node-card-terminal").count(),
                "card-terminal should reappear at phase 0 (legacy)");
    }

    @Test
    void flowDropdown_filtersByPhase() {
        loadCoffeeShop();
        dismissStoryAndGoToPhase(0);

        // At phase 0 (legacy), only legacy flows should be visible
        Locator flowSelector = page.locator("#flow-selector");
        page.waitForFunction("document.getElementById('flow-selector').options.length > 1");

        // Count non-default options
        int optionCount = ((Number) flowSelector.evaluate(
                "el => Array.from(el.options).filter(o => o.value !== '__default__').length")).intValue();
        assertEquals(2, optionCount,
                "At phase 0 (legacy), only legacy-cash and legacy-card should appear");

        // Verify specific flow IDs present
        assertTrue((Boolean) flowSelector.evaluate(
                "el => Array.from(el.options).some(o => o.value === 'legacy-cash')"),
                "legacy-cash should be in dropdown at phase 0");
        assertTrue((Boolean) flowSelector.evaluate(
                "el => Array.from(el.options).some(o => o.value === 'legacy-card')"),
                "legacy-card should be in dropdown at phase 0");
        assertFalse((Boolean) flowSelector.evaluate(
                "el => Array.from(el.options).some(o => o.value === 'mobile-order')"),
                "mobile-order should NOT be in dropdown at phase 0");
        assertFalse((Boolean) flowSelector.evaluate(
                "el => Array.from(el.options).some(o => o.value === 'credits-reload')"),
                "credits-reload should NOT be in dropdown at phase 0");
        assertFalse((Boolean) flowSelector.evaluate(
                "el => Array.from(el.options).some(o => o.value === 'ai-forecast')"),
                "ai-forecast should NOT be in dropdown at phase 0");

        // Move to phase 1 (mobile) — mobile-order should appear
        page.locator("#phase-dots .phase-dot[data-phase-idx='1']").dispatchEvent("click");
        page.waitForFunction(
                "Array.from(document.getElementById('flow-selector').options).some(o => o.value === 'mobile-order')");

        assertTrue((Boolean) flowSelector.evaluate(
                "el => Array.from(el.options).some(o => o.value === 'mobile-order')"),
                "mobile-order should appear at phase 1 (mobile)");
        assertFalse((Boolean) flowSelector.evaluate(
                "el => Array.from(el.options).some(o => o.value === 'legacy-cash')"),
                "legacy-cash should NOT be in dropdown at phase 1 (mobile)");
    }

    @Test
    void jsonWithHashComments_parsesCorrectly() {
        // Open editor
        page.locator("#btn-options").click();
        page.locator("#chk-show-editor").dispatchEvent("click");
        page.locator("#left-sidebar").waitFor(new Locator.WaitForOptions()
                .setState(com.microsoft.playwright.options.WaitForSelectorState.VISIBLE));

        // Paste JSON with # comments and multiline strings
        String jsonWithComments = "{\n"
                + "  # This is a hash comment\n"
                + "  \"title\": \"Test\",\n"
                + "  // This is a double-slash comment\n"
                + "  \"nodes\": [\n"
                + "    { \"id\": \"svc-a\", \"label\": \"Service\n"
                + "A\", \"x\": 100, \"y\": 100 }\n"
                + "  ],\n"
                + "  \"sequence\": []\n"
                + "}";
        page.locator("#json-input").fill(jsonWithComments);
        page.locator("#btn-update").click();

        // Should render without error
        String errorCls = page.locator("#error-msg").getAttribute("class");
        assertFalse(errorCls != null && errorCls.contains("visible"),
                "Error message should not be visible — JSON with comments should parse");

        // Node should be rendered
        page.waitForFunction("document.getElementById('node-svc-a') !== null");
        assertEquals(1, page.locator("#node-svc-a").count(),
                "Node svc-a should be rendered from commented JSON");
    }

    @Test
    void flowDropdown_hasFixedWidth() {
        loadCoffeeShop();
        dismissStoryAndGoToPhase(0);

        page.waitForFunction("document.getElementById('flow-selector').options.length > 1");

        // Verify flow selector has constrained width via computed style
        String minW = (String) page.locator("#flow-selector").evaluate(
                "el => getComputedStyle(el).minWidth");
        String maxW = (String) page.locator("#flow-selector").evaluate(
                "el => getComputedStyle(el).maxWidth");
        assertEquals("180px", minW, "Flow selector min-width should be 180px");
        assertEquals("180px", maxW, "Flow selector max-width should be 180px");
    }

    @Test
    void flowSelector_syncsPhaseWhenFlowHasPhasesProperty() {
        loadCoffeeShop();
        dismissStoryAndGoToPhase(1);

        // At phase 1 (mobile), mobile-order should be in the dropdown
        page.waitForFunction(
                "Array.from(document.getElementById('flow-selector').options).some(o => o.value === 'mobile-order')");

        // Select mobile-order via JS — should stay at phase 1 since mobile is in its phases list
        page.evaluate("document.getElementById('flow-selector').value = 'mobile-order';" +
                "document.getElementById('flow-selector').dispatchEvent(new Event('change'));");
        String phaseLabel = page.locator("#phase-label-display").textContent();
        assertTrue(phaseLabel.contains("Mobile"),
                "Phase should stay at Mobile after selecting mobile-order, got: " + phaseLabel);

        // Move to phase 2 (credits) where credits-reload is visible
        page.locator("#phase-dots .phase-dot[data-phase-idx='2']").dispatchEvent("click");
        page.waitForFunction(
                "Array.from(document.getElementById('flow-selector').options).some(o => o.value === 'credits-reload')");

        // Select credits-reload — phase should stay at credits
        page.evaluate("document.getElementById('flow-selector').value = 'credits-reload';" +
                "document.getElementById('flow-selector').dispatchEvent(new Event('change'));");
        phaseLabel = page.locator("#phase-label-display").textContent();
        assertTrue(phaseLabel.contains("Credits"),
                "Phase should stay at Credits after selecting credits-reload, got: " + phaseLabel);

        // Test phase-jump: inject credits-reload option into the dropdown at phase 3
        // and select it — handler should jump to phase 2 (credits)
        page.locator("#phase-dots .phase-dot[data-phase-idx='3']").dispatchEvent("click");
        page.waitForFunction("document.querySelector('#phase-dots .phase-dot.active[data-phase-idx=\"3\"]') !== null");

        // Inject the option and select it to trigger the phase-jump
        page.evaluate(
                "var sel = document.getElementById('flow-selector');" +
                "var opt = document.createElement('option');" +
                "opt.value = 'credits-reload'; opt.textContent = 'Credits';" +
                "sel.appendChild(opt);" +
                "sel.value = 'credits-reload';" +
                "sel.dispatchEvent(new Event('change'));");
        page.waitForFunction("document.querySelector('#phase-dots .phase-dot.active[data-phase-idx=\"2\"]') !== null");

        phaseLabel = page.locator("#phase-label-display").textContent();
        assertTrue(phaseLabel.contains("Credits"),
                "Phase should jump to Credits when selecting credits-reload from phase 3, got: " + phaseLabel);
    }
}
