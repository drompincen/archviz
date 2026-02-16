package com.drom.archviz.repository;

import com.drom.archviz.model.Diagram;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

public class InMemoryDiagramRepository implements DiagramRepository {

    private final Map<String, Diagram> store = new ConcurrentHashMap<>();

    @Override
    public Diagram save(Diagram diagram) {
        store.put(diagram.getId(), diagram);
        return diagram;
    }

    @Override
    public Optional<Diagram> findById(String id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<Diagram> findAll(Optional<String> tag, Optional<String> query) {
        return store.values().stream()
                .filter(d -> tag.map(t -> d.getTags() != null && d.getTags().contains(t)).orElse(true))
                .filter(d -> query.map(q -> {
                    String lower = q.toLowerCase();
                    return (d.getTitle() != null && d.getTitle().toLowerCase().contains(lower))
                            || (d.getDescription() != null && d.getDescription().toLowerCase().contains(lower));
                }).orElse(true))
                .collect(Collectors.toList());
    }

    @Override
    public void deleteById(String id) {
        store.remove(id);
    }
}
