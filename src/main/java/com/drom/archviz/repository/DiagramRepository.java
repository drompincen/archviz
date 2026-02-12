package com.drom.archviz.repository;

import com.drom.archviz.model.Diagram;

import java.util.List;
import java.util.Optional;

public interface DiagramRepository {

    Diagram save(Diagram diagram);

    Optional<Diagram> findById(String id);

    List<Diagram> findAll(Optional<String> tag, Optional<String> query);

    void deleteById(String id);
}
