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
class StoryModeIT {

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
    void loadStoryMode() {
        page = browser.newPage();
        page.navigate("http://localhost:" + port +
                "/collab-animation.html?collab=coffee-shop-transformation.json&story=true");
        page.waitForLoadState();
        page.locator(".narr-slide.type-problem").waitFor();
    }

    @Test
    void storyAutoStart_showsProblemSlide() {
        assertThat(page.locator("#narrative-view")).hasClass(java.util.regex.Pattern.compile(".*visible.*"));
        assertThat(page.locator(".narr-slide.type-problem")).isVisible();
        assertThat(page.locator(".narr-section-label")).containsText("The Problem");
    }

    @Test
    void navigation_prevNextAndDots() {
        // Start on problem (slide 0)
        assertThat(page.locator(".narr-slide.type-problem")).isVisible();
        Locator dots = page.locator(".narr-dot");
        // coffee-shop has: problem, vision, 4 phases = 6 slides
        assertTrue(dots.count() >= 4, "Should have at least 4 nav dots, found " + dots.count());

        // First dot should be active
        assertThat(dots.nth(0)).hasClass(java.util.regex.Pattern.compile(".*active.*"));

        // Click Next to vision
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-vision").waitFor();
        assertThat(page.locator(".narr-slide.type-vision")).isVisible();
        assertThat(dots.nth(1)).hasClass(java.util.regex.Pattern.compile(".*active.*"));

        // Click Next to phase 0
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-phase").waitFor();
        assertThat(page.locator(".narr-slide.type-phase")).isVisible();

        // Click dot 0 to go back to problem
        dots.nth(0).click();
        page.locator(".narr-slide.type-problem").waitFor();
        assertThat(page.locator(".narr-slide.type-problem")).isVisible();
    }

    @Test
    void benefitsSidebar_accumulatesPerPhase() {
        // Navigate to phase slide: Problem -> Vision -> Phase 0 -> Phase 1
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-vision").waitFor();
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-phase").waitFor();
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.waitForFunction("document.querySelectorAll('.narr-slide.type-phase').length >= 1");

        // On Phase 1 (mobile), sidebar should show benefits
        Locator sidebar = page.locator(".narr-benefits-sidebar");
        if (sidebar.count() > 0) {
            Locator cards = page.locator(".narr-sb-benefit-card");
            int phase1Benefits = cards.count();

            // Navigate to Phase 2
            page.locator(".narr-nav-btn[data-nav='1']").click();
            page.waitForFunction("document.querySelectorAll('.narr-sb-benefit-card').length >= " + phase1Benefits);

            int phase2Benefits = page.locator(".narr-sb-benefit-card").count();
            assertTrue(phase2Benefits >= phase1Benefits,
                    "Phase 2 should accumulate benefits from earlier phases. Phase 1: " +
                            phase1Benefits + ", Phase 2: " + phase2Benefits);
        }
    }

    @Test
    void kpiHud_updatesPerPhase() {
        // Navigate to first phase slide (index 2: Problem, Vision, Phase 0)
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-vision").waitFor();
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-phase").waitFor();

        Locator kpiHud = page.locator("#kpi-hud");
        assertThat(kpiHud).hasClass(java.util.regex.Pattern.compile(".*visible.*"));
        Locator kpiCards = page.locator(".kpi-hud-card");
        assertTrue(kpiCards.count() >= 1, "KPI HUD should show at least one card");

        // Capture a KPI value
        String valueAtPhase0 = page.locator(".kpi-hud-value").first().textContent();

        // Navigate to a later phase slide
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-phase").waitFor();
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-phase").waitFor();

        String valueAtPhase2 = page.locator(".kpi-hud-value").first().textContent();
        // Values should differ as idea card deltas accumulate
        assertNotEquals(valueAtPhase0, valueAtPhase2,
                "KPI values should change between phases");
    }

    @Test
    void viewArchitecture_transitionsToCollab() {
        // Navigate to a phase slide
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-vision").waitFor();
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-phase").waitFor();

        // Click View Architecture
        page.locator(".narr-view-arch-btn").click();
        page.waitForFunction("!document.getElementById('narrative-view').classList.contains('visible')");

        // Canvas should be visible, narrative hidden
        assertFalse(page.locator("#preview-canvas").getAttribute("class").contains("hidden"),
                "Preview canvas should be visible");
        assertFalse(page.locator("#narrative-view").getAttribute("class").contains("visible"),
                "Narrative view should be hidden");

        // Nodes should be rendered
        assertTrue(page.locator("#nodes-container .node").count() >= 1,
                "Architecture view should show nodes");
    }

    @Test
    void backToStory_returnsToSameSlide() {
        // Navigate to phase slide (index 2)
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-vision").waitFor();
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-phase").waitFor();

        // View Architecture
        page.locator(".narr-view-arch-btn").click();
        page.waitForFunction("!document.getElementById('narrative-view').classList.contains('visible')");

        // Click back arrow
        page.locator("#narr-back-arrow").click();
        page.locator("#narrative-view.visible").waitFor();

        // Should be back on a phase slide (same one we left)
        assertThat(page.locator("#narrative-view")).hasClass(java.util.regex.Pattern.compile(".*visible.*"));
        assertThat(page.locator(".narr-slide.type-phase")).isVisible();
    }

    @Test
    void keyboardNavigation_arrowKeys() {
        // Start on problem
        assertThat(page.locator(".narr-slide.type-problem")).isVisible();

        // Press Right arrow to advance
        page.keyboard().press("ArrowRight");
        page.locator(".narr-slide.type-vision").waitFor();
        assertThat(page.locator(".narr-slide.type-vision")).isVisible();

        // Press Left arrow to go back
        page.keyboard().press("ArrowLeft");
        page.locator(".narr-slide.type-problem").waitFor();
        assertThat(page.locator(".narr-slide.type-problem")).isVisible();
    }

    @Test
    void kpiHud_hiddenOnProblem_visibleOnVision() {
        // On Problem slide, KPI HUD should NOT be visible
        Locator kpiHud = page.locator("#kpi-hud");
        String cls = kpiHud.getAttribute("class");
        assertFalse(cls != null && cls.contains("visible"),
                "KPI HUD should be hidden on Problem slide");

        // Navigate to Vision slide
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-vision").waitFor();

        // KPI HUD should now be visible
        assertThat(kpiHud).hasClass(java.util.regex.Pattern.compile(".*visible.*"));
        assertTrue(page.locator(".kpi-hud-card").count() >= 1,
                "KPI HUD should show at least one card on Vision slide");
    }

    @Test
    void kpiToggle_hidesBenefitsPanelInArchView() {
        // Exit story mode and trigger a render via phase dot click
        page.locator("#btn-story-mode").dispatchEvent("click");
        page.waitForFunction("!document.body.classList.contains('story-active')");
        page.locator("#phase-dots .phase-dot[data-phase-idx='1']").dispatchEvent("click");
        page.waitForFunction("document.getElementById('benefits-panel').classList.contains('visible')");

        // Benefits panel should be visible (coffee-shop has benefits)
        Locator benefitsPanel = page.locator("#benefits-panel");
        assertThat(benefitsPanel).hasClass(java.util.regex.Pattern.compile(".*visible.*"));

        // Uncheck KPI toggle — benefits panel should hide
        page.locator("#btn-options").click();
        page.locator("#chk-show-kpis").dispatchEvent("click");
        page.waitForFunction("!document.getElementById('benefits-panel').classList.contains('visible')");

        String cls = benefitsPanel.getAttribute("class");
        assertFalse(cls != null && cls.contains("visible"),
                "Benefits panel should be hidden when KPI toggle is unchecked");

        // Re-check toggle — benefits panel should reappear
        page.locator("#chk-show-kpis").dispatchEvent("click");
        page.waitForFunction("document.getElementById('benefits-panel').classList.contains('visible')");
        assertThat(benefitsPanel).hasClass(java.util.regex.Pattern.compile(".*visible.*"));
    }

    @Test
    void kpiToggle_hidesHudInNarrativeMode() {
        // Navigate to vision slide where KPI HUD is visible
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-vision").waitFor();

        Locator kpiHud = page.locator("#kpi-hud");
        assertThat(kpiHud).hasClass(java.util.regex.Pattern.compile(".*visible.*"));

        // Exit story mode, uncheck KPI toggle, re-enter story
        page.locator("#btn-story-mode").dispatchEvent("click");
        page.waitForFunction("!document.body.classList.contains('story-active')");

        page.locator("#btn-options").click();
        page.locator("#chk-show-kpis").dispatchEvent("click");
        page.waitForFunction("!document.getElementById('chk-show-kpis').checked");

        // Re-enter story mode and go to vision
        page.locator("#btn-story-mode").dispatchEvent("click");
        page.locator("#narrative-view.visible").waitFor();
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.locator(".narr-slide.type-vision").waitFor();

        // KPI HUD should be hidden
        String cls = kpiHud.getAttribute("class");
        assertFalse(cls != null && cls.contains("visible"),
                "KPI HUD should be hidden when toggle is unchecked");
    }

    @Test
    void richText_rendersHtmlInStoryFields() {
        // Navigate to problem slide which has the description field
        assertThat(page.locator(".narr-slide.type-problem")).isVisible();

        // Inject story with HTML markup matching a real user's description
        page.locator("#btn-story-mode").dispatchEvent("click");
        page.waitForFunction("!document.body.classList.contains('story-active')");

        page.locator("#btn-options").click();
        page.locator("#chk-show-editor").dispatchEvent("click");
        page.locator("#left-sidebar").waitFor(new Locator.WaitForOptions()
                .setState(com.microsoft.playwright.options.WaitForSelectorState.VISIBLE));

        String json = "{\"title\":\"Test\",\"nodes\":[{\"id\":\"a\",\"label\":\"A\",\"x\":10,\"y\":10}],"
                + "\"sequence\":[],\"story\":{\"problem\":{\"headline\":\"<b>Slow</b> & Manual Operations\","
                + "\"description\":\"Bean & Byte serves 30 orders/hour with a cash register from 2009."
                + " <br>62% of <b>payments</b> are cash (slow to count, impossible to audit)."
                + " <u>We have zero customer data</u> — no emails, no purchase history.\"},"
                + "\"uiHints\":{\"initialView\":\"narrative\"}}}";
        page.locator("#json-input").fill(json);
        page.locator("#btn-update").click();
        // Manually activate story mode (autoActivated is already set from first load)
        page.locator("#btn-story-mode").dispatchEvent("click");
        page.locator("#narrative-view.visible").waitFor();
        page.locator(".narr-slide.type-problem").waitFor();

        // Check that <b> was rendered as real HTML bold in headline
        Locator headline = page.locator(".narr-problem-headline");
        assertEquals(1, headline.locator("b").count(),
                "Bold tag should render as real <b> in headline");
        assertThat(headline.locator("b")).containsText("Slow");
        // & should render correctly (not double-escaped)
        assertThat(headline).containsText("& Manual");

        // Check that <br>, <b>, and <u> were rendered in description
        Locator desc = page.locator(".narr-problem-desc");
        assertTrue(desc.locator("br").count() >= 1,
                "<br> should render as real line break in description");
        assertTrue(desc.locator("b").count() >= 1,
                "<b> should render as real bold in description");
        assertThat(desc.locator("b")).containsText("payments");
        assertTrue(desc.locator("u").count() >= 1,
                "<u> should render as real underline in description");
        assertThat(desc.locator("u")).containsText("We have zero customer data");
    }

    @Test
    void richText_worksWhenLoadedFromFile() {
        // BeforeEach already loads coffee-shop with story=true, auto-starts on problem slide
        assertThat(page.locator(".narr-slide.type-problem")).isVisible();

        // Exit story mode so we can access the editor
        page.locator("#btn-story-mode").dispatchEvent("click");
        page.waitForFunction("!document.body.classList.contains('story-active')");

        // Open editor
        page.locator("#btn-options").click();
        page.locator("#chk-show-editor").dispatchEvent("click");
        page.locator("#left-sidebar").waitFor(new Locator.WaitForOptions()
                .setState(com.microsoft.playwright.options.WaitForSelectorState.VISIBLE));

        // Modify the description in the editor to include HTML tags
        page.evaluate(
                "var ta = document.getElementById('json-input');" +
                "ta.value = ta.value.replace(" +
                "  'The line averages 8 minutes during peak.'," +
                "  'The line averages <b>8 minutes</b> during peak.<br>'" +
                ");");
        page.locator("#btn-update").click();

        // Re-enter story mode (toggle back on)
        page.locator("#btn-story-mode").dispatchEvent("click");
        page.locator("#narrative-view.visible").waitFor();
        page.locator(".narr-slide.type-problem").waitFor();

        // Verify the HTML tags rendered
        Locator desc = page.locator(".narr-problem-desc");
        assertTrue(desc.locator("b").count() >= 1,
                "<b> should render as real bold when loaded from file and edited");
        assertThat(desc.locator("b")).containsText("8 minutes");
        assertTrue(desc.locator("br").count() >= 1,
                "<br> should render as real line break when loaded from file and edited");
    }

    @Test
    void longLabel_fitsInsideNodeBox() {
        // Exit story mode so we can access the editor and collab view
        page.locator("#btn-story-mode").dispatchEvent("click");
        page.waitForFunction("!document.body.classList.contains('story-active')");

        // Open editor
        page.locator("#btn-options").click();
        page.locator("#chk-show-editor").dispatchEvent("click");
        page.locator("#left-sidebar").waitFor(new Locator.WaitForOptions()
                .setState(com.microsoft.playwright.options.WaitForSelectorState.VISIBLE));

        // Inject a diagram with a very long node label
        String json = "{\"title\":\"Label Test\",\"nodes\":["
                + "{\"id\":\"long\",\"label\":\"Very Long Service Name That Should Not Overflow The Node Box\","
                + "\"x\":50,\"y\":50,\"w\":120,\"h\":80}],\"sequence\":[]}";
        page.locator("#json-input").fill(json);
        page.locator("#btn-update").click();
        page.waitForFunction("document.querySelectorAll('#nodes-container .node').length >= 1");

        // Verify adaptive sizing made the content fit (scrollHeight <= clientHeight)
        Boolean contentFits = (Boolean) page.evaluate(
                "(() => { var node = document.querySelector('#nodes-container .node');"
                        + "return node.scrollHeight <= node.clientHeight; })()");
        assertTrue(contentFits, "After adaptive sizing, content should fit (scrollHeight <= clientHeight)");

        // Verify the label's scrollWidth does not exceed the node's clientWidth
        Boolean labelFits = (Boolean) page.evaluate(
                "(() => { var node = document.querySelector('#nodes-container .node');"
                        + "var label = node.querySelector('.node-label');"
                        + "return label.scrollWidth <= node.clientWidth; })()");
        assertTrue(labelFits, "Long label scrollWidth should not exceed node clientWidth");
    }

    @Test
    void longLabel_fitsInSequenceBox() {
        // Exit story mode
        page.locator("#btn-story-mode").dispatchEvent("click");
        page.waitForFunction("!document.body.classList.contains('story-active')");

        // Open editor
        page.locator("#btn-options").click();
        page.locator("#chk-show-editor").dispatchEvent("click");
        page.locator("#left-sidebar").waitFor(new Locator.WaitForOptions()
                .setState(com.microsoft.playwright.options.WaitForSelectorState.VISIBLE));

        // Inject diagram with a long label + a sequence so both nodes exist
        String json = "{\"title\":\"Seq Label Test\",\"nodes\":["
                + "{\"id\":\"long\",\"label\":\"Very Long Service Name That Should Not Overflow\","
                + "\"x\":50,\"y\":50,\"w\":120,\"h\":80},"
                + "{\"id\":\"b\",\"label\":\"B\",\"x\":250,\"y\":50,\"w\":100,\"h\":70}],"
                + "\"sequence\":[{\"from\":\"long\",\"to\":\"b\",\"text\":\"test\"}]}";
        page.locator("#json-input").fill(json);
        page.locator("#btn-update").click();
        page.waitForFunction("document.querySelectorAll('#nodes-container .node').length >= 1");

        // Switch to sequence view via the checkbox in the header
        page.locator("#chk-sequence-mode").dispatchEvent("click");
        page.waitForFunction("document.querySelector('#sequence-view svg') !== null");

        // Verify the text element has appropriate font-size and font-weight
        Boolean adapted = (Boolean) page.evaluate(
                "(() => { var text = document.querySelector('.seq-head-text');"
                        + "if (!text) return false;"
                        + "var fs = parseFloat(text.style.fontSize);"
                        + "var fw = text.style.fontWeight;"
                        + "return (fs < 12 || fw === 'normal') && text.hasAttribute('clip-path'); })()");
        assertTrue(adapted, "Long label should have adapted font-size or font-weight in sequence view");

        // Verify the rect width accommodates the text
        Boolean rectFits = (Boolean) page.evaluate(
                "(() => { var rect = document.querySelector('.seq-head-rect');"
                        + "if (!rect) return false;"
                        + "var w = parseFloat(rect.getAttribute('width'));"
                        + "return w >= 120; })()");
        assertTrue(rectFits, "Sequence header rect width should be at least 120px");
    }

    @Test
    void headerMinimal_inStoryMode() {
        // In story mode, body should have story-active class
        assertTrue(page.locator("body").evaluate("el => el.classList.contains('story-active')").toString().equals("true"),
                "Body should have story-active class in story mode");

        // Brand should still be visible
        assertThat(page.locator(".brand")).isVisible();
    }
}
