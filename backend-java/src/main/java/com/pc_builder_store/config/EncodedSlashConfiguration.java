package com.pc_builder_store.config;

import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EncodedSlashConfiguration
        implements WebServerFactoryCustomizer<TomcatServletWebServerFactory> {

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        factory.addConnectorCustomizers(
                connector -> connector.setEncodedSolidusHandling("decode"));
    }
}
