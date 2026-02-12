package com.drom.archviz;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.context.ServletWebServerInitializedEvent;
import org.springframework.context.event.EventListener;

@SpringBootApplication
public class ArchVizApplication {

    private static final Logger log = LoggerFactory.getLogger(ArchVizApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(ArchVizApplication.class, args);
    }

    @EventListener
    public void onServerStarted(ServletWebServerInitializedEvent event) {
        int port = event.getWebServer().getPort();
        log.info("============================================================");
        log.info("  DROM Architecture Visualizer is ready!");
        log.info("  Main UI:     http://localhost:{}/collab-animation.html", port);
        log.info("  Animation:   http://localhost:{}/animation.html", port);
        log.info("  API:         http://localhost:{}/api/diagrams", port);
        log.info("============================================================");
    }
}
