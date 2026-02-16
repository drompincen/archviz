///usr/bin/env jbang "$0" "$@" ; exit $?
//JAVA 17+
//DEPS org.springframework.boot:spring-boot-starter-web:3.4.2

package com.drom.archviz;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.boot.web.servlet.context.ServletWebServerInitializedEvent;
import org.springframework.context.event.EventListener;

@SpringBootApplication
@RestController
public class ArchViz {

    private static final Logger log = LoggerFactory.getLogger(ArchViz.class);

    @Autowired
    private ObjectMapper objectMapper;

    // --- In-memory diagram store ---
    private final Map<String, ObjectNode> diagramStore = new ConcurrentHashMap<>();

    public static void main(String[] args) {
        // Point Spring Boot to serve static files from ./src/main/resources/static
        System.setProperty("spring.web.resources.static-locations",
                "file:src/main/resources/static/,classpath:/static/");
        SpringApplication.run(ArchViz.class, args);
    }

    @EventListener
    public void onServerStarted(ServletWebServerInitializedEvent event) {
        int port = event.getWebServer().getPort();
        log.info("============================================================");
        log.info("  DROM Architecture Visualizer is ready!");
        log.info("  Main UI:     http://localhost:{}/collab-animation.html", port);
        log.info("  Animation:   http://localhost:{}/animation.html", port);
        log.info("  API:         http://localhost:{}/api/diagrams", port);
        log.info("============================================================");
    }

    @Bean
    public OncePerRequestFilter htmlAccessLogFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain filterChain) throws ServletException, IOException {
                filterChain.doFilter(request, response);

                if (request.getRequestURI().endsWith(".html")) {
                    String ip = request.getHeader("X-Forwarded-For");
                    if (ip == null || ip.isBlank()) {
                        ip = request.getRemoteAddr();
                    }
                    log.info("HTML access | {} | {} | {} | {}",
                            ip,
                            request.getMethod(),
                            request.getRequestURI(),
                            response.getStatus());
                }
            }
        };
    }

    @GetMapping(value = "/json/", produces = "text/html")
    public String listJsonFiles() throws IOException {
        var resolver = new PathMatchingResourcePatternResolver();
        List<String> files = new ArrayList<>();

        for (String pattern : new String[]{
                "file:src/main/resources/static/json/*.json",
                "classpath:/static/json/*.json"}) {
            try {
                Resource[] resources = resolver.getResources(pattern);
                for (Resource r : resources) {
                    String filename = r.getFilename();
                    if (filename != null && !files.contains(filename)) {
                        files.add(filename);
                    }
                }
            } catch (IOException ignored) {
            }
        }

        var sb = new StringBuilder("<html><body>");
        for (String f : files) {
            sb.append("<a href=\"").append(f).append("\">").append(f).append("</a><br>");
        }
        sb.append("</body></html>");
        return sb.toString();
    }

    // ========================================================================
    // Diagram CRUD API — /api/diagrams
    // ========================================================================

    @GetMapping("/api/diagrams")
    public List<ObjectNode> listDiagrams(
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String query) {

        // DB-persisted diagrams (summaries without flow)
        Stream<ObjectNode> dbStream = diagramStore.values().stream()
                .filter(d -> tag == null || hasTag(d, tag))
                .filter(d -> query == null || matchesQuery(d, query))
                .map(this::toSummary);

        // Static file diagrams
        Stream<ObjectNode> fileStream = loadStaticDiagrams().stream()
                .filter(d -> tag == null || hasTag(d, tag))
                .filter(d -> query == null || matchesQuery(d, query))
                .map(this::toSummary);

        return Stream.concat(dbStream, fileStream).collect(Collectors.toList());
    }

    @GetMapping("/api/diagrams/{id}")
    public ResponseEntity<ObjectNode> getDiagram(@PathVariable String id) {
        log.info("DOWNLOAD | id={}", id);

        // Check DB first
        ObjectNode stored = diagramStore.get(id);
        if (stored != null) {
            log.info("DOWNLOAD | source=db | title={}", stored.path("title").asText(""));
            return ResponseEntity.ok(stored);
        }

        // Fall back to static files
        Optional<ObjectNode> staticDiagram = loadStaticDiagrams().stream()
                .filter(d -> id.equals(d.path("id").asText()))
                .findFirst();

        if (staticDiagram.isPresent()) {
            log.info("DOWNLOAD | source=file | title={}", staticDiagram.get().path("title").asText(""));
            return ResponseEntity.ok(staticDiagram.get());
        }

        log.warn("DOWNLOAD | id={} | NOT FOUND", id);
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/api/diagrams")
    public ResponseEntity<ObjectNode> createDiagram(@RequestBody JsonNode request) {
        String id = UUID.randomUUID().toString();
        String title = request.path("title").asText("Untitled");
        String now = Instant.now().toString();

        ObjectNode diagram = objectMapper.createObjectNode();
        diagram.put("id", id);
        diagram.put("title", title);
        diagram.put("description", request.path("description").asText(""));
        diagram.set("tags", request.has("tags") ? request.get("tags") : objectMapper.createArrayNode());
        diagram.put("version", 1);
        diagram.put("source", "db");
        diagram.put("createdAt", now);
        diagram.put("updatedAt", now);
        diagram.set("flow", request.has("flow") ? request.get("flow") : objectMapper.createObjectNode());

        diagramStore.put(id, diagram);

        List<String> tags = new ArrayList<>();
        if (request.has("tags") && request.get("tags").isArray()) {
            request.get("tags").forEach(t -> tags.add(t.asText()));
        }
        log.info("SAVE | action=create | id={} | title={} | tags={}", id, title, tags);

        return ResponseEntity.status(HttpStatus.CREATED).body(diagram);
    }

    @PutMapping("/api/diagrams/{id}")
    public ResponseEntity<ObjectNode> updateDiagram(
            @PathVariable String id,
            @RequestBody JsonNode request) {

        ObjectNode existing = diagramStore.get(id);
        if (existing == null) {
            log.warn("SAVE | action=update | id={} | NOT FOUND", id);
            return ResponseEntity.notFound().build();
        }

        String title = request.path("title").asText(existing.path("title").asText());
        int newVersion = existing.path("version").asInt(0) + 1;
        String now = Instant.now().toString();

        existing.put("title", title);
        existing.put("description", request.path("description").asText(""));
        if (request.has("tags")) existing.set("tags", request.get("tags"));
        existing.put("version", newVersion);
        existing.put("updatedAt", now);
        existing.put("source", "db");
        if (request.has("flow")) existing.set("flow", request.get("flow"));

        List<String> tags = new ArrayList<>();
        if (existing.has("tags") && existing.get("tags").isArray()) {
            existing.get("tags").forEach(t -> tags.add(t.asText()));
        }
        log.info("SAVE | action=update | id={} | title={} | version={} | tags={}", id, title, newVersion, tags);

        return ResponseEntity.ok(existing);
    }

    // --- Helpers ---

    private List<ObjectNode> loadStaticDiagrams() {
        List<ObjectNode> result = new ArrayList<>();
        var resolver = new PathMatchingResourcePatternResolver();

        for (String pattern : new String[]{
                "file:src/main/resources/static/json/*.json",
                "classpath:/static/json/*.json"}) {
            try {
                Resource[] resources = resolver.getResources(pattern);
                for (Resource r : resources) {
                    String filename = r.getFilename();
                    if (filename == null) continue;
                    String fileId = "file-" + filename.replace(".json", "");
                    // Skip if already added (avoid duplicates from both patterns)
                    if (result.stream().anyMatch(d -> fileId.equals(d.path("id").asText()))) continue;
                    try (InputStream is = r.getInputStream()) {
                        JsonNode root = objectMapper.readTree(is);
                        ObjectNode diagram = objectMapper.createObjectNode();
                        diagram.put("id", fileId);
                        diagram.put("title", root.has("title") ? root.get("title").asText() : filename);
                        diagram.put("description", "");
                        diagram.set("tags", objectMapper.createArrayNode());
                        diagram.put("version", 0);
                        diagram.put("source", "file");
                        diagram.set("flow", root);
                        result.add(diagram);
                    } catch (IOException e) {
                        // Skip malformed files
                    }
                }
            } catch (IOException ignored) {
            }
        }
        return result;
    }

    private ObjectNode toSummary(ObjectNode full) {
        ObjectNode summary = objectMapper.createObjectNode();
        summary.put("id", full.path("id").asText());
        summary.put("title", full.path("title").asText());
        summary.put("description", full.path("description").asText(""));
        summary.set("tags", full.has("tags") ? full.get("tags") : objectMapper.createArrayNode());
        summary.put("version", full.path("version").asInt(0));
        summary.put("source", full.path("source").asText(""));
        return summary;
    }

    private boolean hasTag(ObjectNode d, String tag) {
        if (!d.has("tags") || !d.get("tags").isArray()) return false;
        for (JsonNode t : d.get("tags")) {
            if (tag.equals(t.asText())) return true;
        }
        return false;
    }

    private boolean matchesQuery(ObjectNode d, String query) {
        String lower = query.toLowerCase();
        return d.path("title").asText("").toLowerCase().contains(lower)
                || d.path("description").asText("").toLowerCase().contains(lower);
    }
}
