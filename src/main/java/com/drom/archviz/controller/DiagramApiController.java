package com.drom.archviz.controller;

import com.drom.archviz.dto.DiagramCreateRequest;
import com.drom.archviz.dto.DiagramUpdateRequest;
import com.drom.archviz.model.Diagram;
import com.drom.archviz.model.DiagramSummary;
import com.drom.archviz.service.DiagramService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/diagrams")
public class DiagramApiController {

    private static final Logger log = LoggerFactory.getLogger(DiagramApiController.class);

    private final DiagramService diagramService;

    public DiagramApiController(DiagramService diagramService) {
        this.diagramService = diagramService;
    }

    @GetMapping
    public List<DiagramSummary> listDiagrams(
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String query) {
        return diagramService.listAll(Optional.ofNullable(tag), Optional.ofNullable(query));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Diagram> getDiagram(@PathVariable String id) {
        log.info("DOWNLOAD | id={}", id);
        return diagramService.getById(id)
                .map(d -> {
                    log.info("DOWNLOAD | source={} | title={}", d.getSource(), d.getTitle());
                    return ResponseEntity.ok(d);
                })
                .orElseGet(() -> {
                    log.warn("DOWNLOAD | id={} | NOT FOUND", id);
                    return ResponseEntity.notFound().build();
                });
    }

    @PostMapping
    public ResponseEntity<Diagram> createDiagram(@RequestBody DiagramCreateRequest request) {
        Diagram created = diagramService.create(request);
        log.info("SAVE | action=create | id={} | title={} | tags={}", created.getId(), created.getTitle(), created.getTags());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Diagram> updateDiagram(
            @PathVariable String id,
            @RequestBody DiagramUpdateRequest request) {
        return diagramService.update(id, request)
                .map(d -> {
                    log.info("SAVE | action=update | id={} | title={} | version={} | tags={}", d.getId(), d.getTitle(), d.getVersion(), d.getTags());
                    return ResponseEntity.ok(d);
                })
                .orElseGet(() -> {
                    log.warn("SAVE | action=update | id={} | NOT FOUND", id);
                    return ResponseEntity.notFound().build();
                });
    }
}
