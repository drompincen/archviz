package com.drom.archviz.service;

import com.drom.archviz.model.Diagram;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class StaticFileService {

    private final ObjectMapper objectMapper;

    public StaticFileService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<Diagram> loadStaticDiagrams() {
        List<Diagram> result = new ArrayList<>();
        var resolver = new PathMatchingResourcePatternResolver();
        try {
            Resource[] resources = resolver.getResources("classpath:/static/json/*.json");
            for (Resource r : resources) {
                String filename = r.getFilename();
                if (filename == null) continue;
                try (InputStream is = r.getInputStream()) {
                    JsonNode root = objectMapper.readTree(is);
                    Diagram d = new Diagram();
                    d.setId("file-" + filename.replace(".json", ""));
                    d.setTitle(root.has("title") ? root.get("title").asText() : filename);
                    d.setDescription(null);
                    d.setTags(Collections.emptyList());
                    d.setVersion(0);
                    d.setSource("file");
                    d.setFlow(root);
                    result.add(d);
                } catch (IOException e) {
                    // Skip malformed files
                }
            }
        } catch (IOException e) {
            // No static files found
        }
        return result;
    }

    public Optional<Diagram> loadStaticDiagramById(String id) {
        return loadStaticDiagrams().stream()
                .filter(d -> d.getId().equals(id))
                .findFirst();
    }
}
