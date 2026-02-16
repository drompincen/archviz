package com.drom.archviz.model;

import java.util.List;

public record DiagramSummary(
        String id,
        String title,
        String description,
        List<String> tags,
        int version,
        String source
) {}
