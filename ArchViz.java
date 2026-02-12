///usr/bin/env jbang "$0" "$@" ; exit $?
//JAVA 17+
//DEPS org.springframework.boot:spring-boot-starter-web:3.4.2

package com.drom.archviz;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@SpringBootApplication
@RestController
public class ArchViz {

    public static void main(String[] args) {
        // Point Spring Boot to serve static files from ./src/main/resources/static
        System.setProperty("spring.web.resources.static-locations",
                "file:src/main/resources/static/,classpath:/static/");
        SpringApplication.run(ArchViz.class, args);
    }

    @GetMapping(value = "/json/", produces = "text/html")
    public String listJsonFiles() throws IOException {
        // Try filesystem first (jbang), then classpath (packaged jar)
        var resolver = new PathMatchingResourcePatternResolver();
        List<String> files = new ArrayList<>();

        for (String pattern : new String[]{
                "file:src/main/resources/static/json/*.json",
                "classpath:/static/json/*.json"}) {
            try {
                Resource[] resources = resolver.getResources(pattern);
                for (Resource r : resources) {
                    String filename = r.getFilename();
                    if (filename != null && !files.contains(filename)) {
                        files.add(filename);
                    }
                }
            } catch (IOException ignored) {
            }
        }

        var sb = new StringBuilder("<html><body>");
        for (String f : files) {
            sb.append("<a href=\"").append(f).append("\">").append(f).append("</a><br>");
        }
        sb.append("</body></html>");
        return sb.toString();
    }
}
