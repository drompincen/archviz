package com.drom.archviz;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@RestController
public class JsonListController {

    @GetMapping(value = "/json/", produces = "text/html")
    public String listJsonFiles() throws IOException {
        var resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:/static/json/*.json");
        List<String> files = new ArrayList<>();
        for (Resource r : resources) {
            String filename = r.getFilename();
            if (filename != null) {
                files.add(filename);
            }
        }

        // Return an HTML page with links — the JS parses href filenames from this
        var sb = new StringBuilder("<html><body>");
        for (String f : files) {
            sb.append("<a href=\"").append(f).append("\">").append(f).append("</a><br>");
        }
        sb.append("</body></html>");
        return sb.toString();
    }
}
