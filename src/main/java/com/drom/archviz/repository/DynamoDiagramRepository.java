package com.drom.archviz.repository;

import com.drom.archviz.model.Diagram;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

public class DynamoDiagramRepository implements DiagramRepository {

    private static final Logger log = LoggerFactory.getLogger(DynamoDiagramRepository.class);

    private final DynamoDbClient client;
    private final String tableName;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DynamoDiagramRepository(DynamoDbClient client, String tableName) {
        this.client = client;
        this.tableName = tableName;
        ensureTableExists();
    }

    private void ensureTableExists() {
        try {
            client.describeTable(DescribeTableRequest.builder().tableName(tableName).build());
            log.info("DynamoDB table '{}' already exists", tableName);
        } catch (ResourceNotFoundException e) {
            log.info("DynamoDB table '{}' not found, creating...", tableName);
            client.createTable(CreateTableRequest.builder()
                    .tableName(tableName)
                    .keySchema(KeySchemaElement.builder()
                            .attributeName("id")
                            .keyType(KeyType.HASH)
                            .build())
                    .attributeDefinitions(AttributeDefinition.builder()
                            .attributeName("id")
                            .attributeType(ScalarAttributeType.S)
                            .build())
                    .billingMode(BillingMode.PAY_PER_REQUEST)
                    .build());

            client.waiter().waitUntilTableExists(
                    DescribeTableRequest.builder().tableName(tableName).build());
            log.info("DynamoDB table '{}' created successfully", tableName);
        }
    }

    @Override
    public Diagram save(Diagram diagram) {
        Map<String, AttributeValue> item = toItem(diagram);
        client.putItem(PutItemRequest.builder()
                .tableName(tableName)
                .item(item)
                .build());
        return diagram;
    }

    @Override
    public Optional<Diagram> findById(String id) {
        GetItemResponse response = client.getItem(GetItemRequest.builder()
                .tableName(tableName)
                .key(Map.of("id", AttributeValue.builder().s(id).build()))
                .build());
        if (!response.hasItem() || response.item().isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(toDiagram(response.item()));
    }

    @Override
    public List<Diagram> findAll(Optional<String> tag, Optional<String> query) {
        ScanRequest.Builder scanBuilder = ScanRequest.builder().tableName(tableName);

        List<String> filterParts = new ArrayList<>();
        Map<String, AttributeValue> exprValues = new HashMap<>();

        if (tag.isPresent()) {
            filterParts.add("contains(tags, :tagVal)");
            exprValues.put(":tagVal", AttributeValue.builder().s(tag.get()).build());
        }
        if (query.isPresent()) {
            filterParts.add("(contains(title, :qVal) OR contains(description, :qVal))");
            exprValues.put(":qVal", AttributeValue.builder().s(query.get()).build());
        }

        if (!filterParts.isEmpty()) {
            scanBuilder.filterExpression(String.join(" AND ", filterParts));
            scanBuilder.expressionAttributeValues(exprValues);
        }

        ScanResponse response = client.scan(scanBuilder.build());
        return response.items().stream()
                .map(this::toDiagram)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteById(String id) {
        client.deleteItem(DeleteItemRequest.builder()
                .tableName(tableName)
                .key(Map.of("id", AttributeValue.builder().s(id).build()))
                .build());
    }

    private Map<String, AttributeValue> toItem(Diagram d) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("id", AttributeValue.builder().s(d.getId()).build());

        if (d.getTitle() != null) {
            item.put("title", AttributeValue.builder().s(d.getTitle()).build());
        }
        if (d.getDescription() != null) {
            item.put("description", AttributeValue.builder().s(d.getDescription()).build());
        }
        if (d.getTags() != null && !d.getTags().isEmpty()) {
            item.put("tags", AttributeValue.builder()
                    .l(d.getTags().stream()
                            .map(t -> AttributeValue.builder().s(t).build())
                            .collect(Collectors.toList()))
                    .build());
        }
        item.put("version", AttributeValue.builder().n(String.valueOf(d.getVersion())).build());
        if (d.getSource() != null) {
            item.put("source", AttributeValue.builder().s(d.getSource()).build());
        }
        if (d.getCreatedAt() != null) {
            item.put("createdAt", AttributeValue.builder().s(d.getCreatedAt().toString()).build());
        }
        if (d.getUpdatedAt() != null) {
            item.put("updatedAt", AttributeValue.builder().s(d.getUpdatedAt().toString()).build());
        }
        if (d.getFlow() != null) {
            try {
                item.put("flow", AttributeValue.builder()
                        .s(objectMapper.writeValueAsString(d.getFlow()))
                        .build());
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Failed to serialize flow JSON", e);
            }
        }
        return item;
    }

    private Diagram toDiagram(Map<String, AttributeValue> item) {
        Diagram d = new Diagram();
        d.setId(item.get("id").s());

        if (item.containsKey("title")) {
            d.setTitle(item.get("title").s());
        }
        if (item.containsKey("description")) {
            d.setDescription(item.get("description").s());
        }
        if (item.containsKey("tags") && item.get("tags").hasL()) {
            d.setTags(item.get("tags").l().stream()
                    .map(AttributeValue::s)
                    .collect(Collectors.toList()));
        } else {
            d.setTags(Collections.emptyList());
        }
        if (item.containsKey("version")) {
            d.setVersion(Integer.parseInt(item.get("version").n()));
        }
        if (item.containsKey("source")) {
            d.setSource(item.get("source").s());
        }
        if (item.containsKey("createdAt")) {
            d.setCreatedAt(Instant.parse(item.get("createdAt").s()));
        }
        if (item.containsKey("updatedAt")) {
            d.setUpdatedAt(Instant.parse(item.get("updatedAt").s()));
        }
        if (item.containsKey("flow")) {
            try {
                JsonNode flowNode = objectMapper.readTree(item.get("flow").s());
                d.setFlow(flowNode);
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Failed to deserialize flow JSON", e);
            }
        }
        return d;
    }
}
