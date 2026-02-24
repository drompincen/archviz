# Playwright Integration Tests

## Overview

The project uses [Playwright for Java](https://playwright.dev/java/) to run browser-based integration tests against a real Chromium instance. These tests complement the existing HtmlUnit-based UI tests by verifying features that require full browser rendering: CSS layout, ES module loading, dynamic `import()`, and user interactions like keyboard navigation.

## What's Tested

### CollabPageIT — Core UI (12 tests)

| Test | What it verifies |
|------|-----------------|
| `pageLoads_titleAndHeader` | Page title and brand text render |
| `defaultDiagram_rendersNodes` | Default demo renders >= 3 nodes |
| `defaultDiagram_rendersConnections` | Default demo renders >= 2 connection paths |
| `invalidJson_showsError` | Error message appears for malformed JSON |
| `themeToggle_appliesLightClass` | `body.light-theme` toggles on checkbox click |
| `editorToggle_showsHidesSidebar` | JSON editor sidebar shows/hides |
| `optionsDropdown_opensCloses` | Options dropdown gets `.open` class |
| `diagramSelector_loadsJson` | Picking a diagram updates editor + renders new nodes |
| `diagramSelector_syncsUrl` | URL updates to `?collab=<file>.json` |
| `storyMode_activatesViaUrl` | `?story=true` activates narrative view |
| `storyMode_navigatesSlides` | Next/Prev buttons advance and retreat |
| `storyMode_viewArchitecture` | "View Architecture" exits story, shows diagram + back arrow |

### StoryModeIT — Story Mode Deep Tests (8 tests)

Loads `coffee-shop-transformation.json` with `?story=true`:

| Test | What it verifies |
|------|-----------------|
| `storyAutoStart_showsProblemSlide` | First slide is `.type-problem` |
| `navigation_prevNextAndDots` | Navigate all slides, verify dot indicators |
| `benefitsSidebar_accumulatesPerPhase` | Later phases accumulate benefits from earlier phases |
| `kpiHud_updatesPerPhase` | KPI values change as phases advance |
| `viewArchitecture_transitionsToCollab` | Clicking "View Architecture" shows the diagram |
| `backToStory_returnsToSameSlide` | Back arrow returns to the slide you left |
| `keyboardNavigation_arrowKeys` | Left/Right arrow keys navigate slides |
| `headerMinimal_inStoryMode` | `body.story-active` class is set, brand visible |

## How to Run

### Install Playwright browsers (first time only)

```bash
mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install --with-deps chromium" -Dexec.classpathScope=test
```

### Run all tests (unit + integration)

```bash
mvn verify
```

### Run only integration tests

```bash
mvn failsafe:integration-test failsafe:verify
```

### Run only unit tests (skips Playwright)

```bash
mvn test
```

## Test Naming Convention

| Pattern | Plugin | Phase |
|---------|--------|-------|
| `*Test.java` | maven-surefire-plugin | `test` |
| `*IT.java` | maven-failsafe-plugin | `integration-test` |

Integration tests (`*IT.java`) run during `mvn verify` via the failsafe plugin. They are NOT picked up by `mvn test`.

## Test Pattern

All Playwright tests follow this pattern:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class MyFeatureIT {

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
}
```

Key points:
- `RANDOM_PORT` starts the Spring Boot server on an available port
- `PER_CLASS` lifecycle allows `@BeforeAll`/`@AfterAll` to be non-static (accesses `@LocalServerPort`)
- Browser is launched once per class, new page per test
- Chromium only, headless mode

## CI Pipeline

The GitHub Actions workflow (`.github/workflows/java-ci.yml`) installs Chromium before running tests:

```yaml
- name: Install Playwright browsers
  run: mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install --with-deps chromium" -Dexec.classpathScope=test

- name: Build and test (Maven)
  run: mvn -B -ntp verify
```

## Adding New Tests

1. Create a new `*IT.java` file in `src/test/java/io/github/drompincen/archviz/ui/`
2. Follow the test pattern above
3. Use Playwright's [locator API](https://playwright.dev/java/docs/locators) and [assertions](https://playwright.dev/java/docs/test-assertions)
4. For tests that need a specific diagram, navigate with query params: `?collab=my-file.json&story=true`
5. Use `page.waitForTimeout()` or `page.waitForFunction()` to wait for async rendering
