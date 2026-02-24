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
}
