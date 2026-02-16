package com.drom.archviz.config;

import com.drom.archviz.repository.DiagramRepository;
import com.drom.archviz.repository.DynamoDiagramRepository;
import com.drom.archviz.repository.InMemoryDiagramRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClientBuilder;

import java.net.URI;

@Configuration
public class DiagramStoreConfig {

    @Bean
    @ConditionalOnProperty(name = "diagram.store", havingValue = "inMemory", matchIfMissing = true)
    public DiagramRepository inMemoryDiagramRepository() {
        return new InMemoryDiagramRepository();
    }

    @Bean
    @ConditionalOnProperty(name = "diagram.store", havingValue = "dynamodb")
    public DynamoDbClient dynamoDbClient(
            @Value("${aws.region:us-east-1}") String region,
            @Value("${aws.dynamodb.endpoint:}") String endpoint) {
        DynamoDbClientBuilder builder = DynamoDbClient.builder()
                .region(Region.of(region));
        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }
        return builder.build();
    }

    @Bean
    @ConditionalOnProperty(name = "diagram.store", havingValue = "dynamodb")
    public DiagramRepository dynamoDiagramRepository(
            DynamoDbClient dynamoDbClient,
            @Value("${aws.dynamodb.table-name:archviz-diagrams}") String tableName) {
        return new DynamoDiagramRepository(dynamoDbClient, tableName);
    }
}
