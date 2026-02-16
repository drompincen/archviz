package com.drom.archviz.repository;

import com.drom.archviz.model.Diagram;

import java.util.List;
import java.util.Optional;

public class DynamoDiagramRepository implements DiagramRepository {

    @Override
    public Diagram save(Diagram diagram) {
        throw new UnsupportedOperationException(
                "DynamoDB persistence not yet implemented. Add AWS SDK dependency and configure table name.");
    }

    @Override
    public Optional<Diagram> findById(String id) {
        throw new UnsupportedOperationException("DynamoDB persistence not yet implemented.");
    }

    @Override
    public List<Diagram> findAll(Optional<String> tag, Optional<String> query) {
        throw new UnsupportedOperationException("DynamoDB persistence not yet implemented.");
    }

    @Override
    public void deleteById(String id) {
        throw new UnsupportedOperationException("DynamoDB persistence not yet implemented.");
    }
}
