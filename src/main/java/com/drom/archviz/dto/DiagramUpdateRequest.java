package com.drom.archviz.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

public record DiagramUpdateRequest(
        String title,
        String description,
        List<String> tags,
        JsonNode flow
) {}
