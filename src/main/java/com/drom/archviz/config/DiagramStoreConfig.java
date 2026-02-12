package com.drom.archviz.config;

import com.drom.archviz.repository.DiagramRepository;
import com.drom.archviz.repository.DynamoDiagramRepository;
import com.drom.archviz.repository.InMemoryDiagramRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DiagramStoreConfig {

    @Bean
    @ConditionalOnProperty(name = "diagram.store", havingValue = "inMemory", matchIfMissing = true)
    public DiagramRepository inMemoryDiagramRepository() {
        return new InMemoryDiagramRepository();
    }

    @Bean
    @ConditionalOnProperty(name = "diagram.store", havingValue = "dynamodb")
    public DiagramRepository dynamoDiagramRepository() {
        return new DynamoDiagramRepository();
    }
}
