package com.drom.archviz.service;

import com.drom.archviz.dto.DiagramCreateRequest;
import com.drom.archviz.dto.DiagramUpdateRequest;
import com.drom.archviz.model.Diagram;
import com.drom.archviz.model.DiagramSummary;
import com.drom.archviz.repository.DiagramRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class DiagramService {

    private final DiagramRepository repository;
    private final StaticFileService staticFileService;

    public DiagramService(DiagramRepository repository, StaticFileService staticFileService) {
        this.repository = repository;
        this.staticFileService = staticFileService;
    }

    public List<DiagramSummary> listAll(Optional<String> tag, Optional<String> query) {
        List<Diagram> dbDiagrams = repository.findAll(tag, query);
        dbDiagrams.forEach(d -> d.setSource("db"));

        List<Diagram> fileDiagrams = staticFileService.loadStaticDiagrams();

        Stream<Diagram> fileStream = fileDiagrams.stream();
        if (tag.isPresent()) {
            String t = tag.get();
            fileStream = fileStream.filter(d -> d.getTags() != null && d.getTags().contains(t));
        }
        if (query.isPresent()) {
            String q = query.get().toLowerCase();
            fileStream = fileStream.filter(d ->
                    d.getTitle() != null && d.getTitle().toLowerCase().contains(q));
        }

        return Stream.concat(dbDiagrams.stream(), fileStream)
                .map(d -> new DiagramSummary(d.getId(), d.getTitle(), d.getDescription(),
                        d.getTags(), d.getVersion(), d.getSource()))
                .collect(Collectors.toList());
    }

    public Optional<Diagram> getById(String id) {
        Optional<Diagram> dbResult = repository.findById(id);
        if (dbResult.isPresent()) {
            dbResult.get().setSource("db");
            return dbResult;
        }
        return staticFileService.loadStaticDiagramById(id);
    }

    public Diagram create(DiagramCreateRequest request) {
        Diagram d = new Diagram();
        d.setId(UUID.randomUUID().toString());
        d.setTitle(request.title());
        d.setDescription(request.description());
        d.setTags(request.tags() != null ? request.tags() : Collections.emptyList());
        d.setVersion(1);
        d.setSource("db");
        d.setCreatedAt(Instant.now());
        d.setUpdatedAt(Instant.now());
        d.setFlow(request.flow());
        return repository.save(d);
    }

    public Optional<Diagram> update(String id, DiagramUpdateRequest request) {
        Optional<Diagram> existing = repository.findById(id);
        if (existing.isEmpty()) {
            return Optional.empty();
        }
        Diagram d = existing.get();
        d.setTitle(request.title());
        d.setDescription(request.description());
        d.setTags(request.tags() != null ? request.tags() : d.getTags());
        d.setVersion(d.getVersion() + 1);
        d.setUpdatedAt(Instant.now());
        d.setFlow(request.flow());
        d.setSource("db");
        return Optional.of(repository.save(d));
    }
}
