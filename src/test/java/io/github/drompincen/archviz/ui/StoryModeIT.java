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
        page.waitForTimeout(1500);
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
        page.waitForTimeout(300);
        assertThat(page.locator(".narr-slide.type-vision")).isVisible();
        assertThat(dots.nth(1)).hasClass(java.util.regex.Pattern.compile(".*active.*"));

        // Click Next to phase 0
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.waitForTimeout(300);
        assertThat(page.locator(".narr-slide.type-phase")).isVisible();

        // Click dot 0 to go back to problem
        dots.nth(0).click();
        page.waitForTimeout(300);
        assertThat(page.locator(".narr-slide.type-problem")).isVisible();
    }

    @Test
    void benefitsSidebar_accumulatesPerPhase() {
        // Navigate to phase slide: Problem -> Vision -> Phase 0 -> Phase 1
        for (int i = 0; i < 3; i++) {
            page.locator(".narr-nav-btn[data-nav='1']").click();
            page.waitForTimeout(300);
        }

        // On Phase 1 (mobile), sidebar should show benefits
        Locator sidebar = page.locator(".narr-benefits-sidebar");
        if (sidebar.count() > 0) {
            Locator cards = page.locator(".narr-sb-benefit-card");
            int phase1Benefits = cards.count();

            // Navigate to Phase 2
            page.locator(".narr-nav-btn[data-nav='1']").click();
            page.waitForTimeout(300);

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
        page.waitForTimeout(300);
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.waitForTimeout(300);

        Locator kpiHud = page.locator("#kpi-hud");
        assertThat(kpiHud).hasClass(java.util.regex.Pattern.compile(".*visible.*"));
        Locator kpiCards = page.locator(".kpi-hud-card");
        assertTrue(kpiCards.count() >= 1, "KPI HUD should show at least one card");

        // Capture a KPI value
        String valueAtPhase0 = page.locator(".kpi-hud-value").first().textContent();

        // Navigate to a later phase slide
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.waitForTimeout(300);
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.waitForTimeout(300);

        String valueAtPhase2 = page.locator(".kpi-hud-value").first().textContent();
        // Values should differ as idea card deltas accumulate
        assertNotEquals(valueAtPhase0, valueAtPhase2,
                "KPI values should change between phases");
    }

    @Test
    void viewArchitecture_transitionsToCollab() {
        // Navigate to a phase slide
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.waitForTimeout(300);
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.waitForTimeout(300);

        // Click View Architecture
        page.locator(".narr-view-arch-btn").click();
        page.waitForTimeout(500);

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
        page.waitForTimeout(300);
        page.locator(".narr-nav-btn[data-nav='1']").click();
        page.waitForTimeout(300);

        // View Architecture
        page.locator(".narr-view-arch-btn").click();
        page.waitForTimeout(500);

        // Click back arrow
        page.locator("#narr-back-arrow").click();
        page.waitForTimeout(500);

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
        page.waitForTimeout(300);
        assertThat(page.locator(".narr-slide.type-vision")).isVisible();

        // Press Left arrow to go back
        page.keyboard().press("ArrowLeft");
        page.waitForTimeout(300);
        assertThat(page.locator(".narr-slide.type-problem")).isVisible();
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
