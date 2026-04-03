package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS Configuration for allowing frontend requests
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(
                        "http://localhost",           // Local production
                        "http://localhost:80",        // Local production explicit port
                        "http://localhost:5173",      // Vite development
                        "http://localhost:3000",      // Alternative dev port
                        "http://localhost:8080",      // Backend port (same machine)
                        "http://54.176.178.31",       // AWS EC2 instance
                        "http://54.176.178.31:80",    // AWS EC2 port 80
                        "http://54.176.178.31:5173",  // AWS EC2 Vite port
                        "http://54.176.178.31:3000"   // AWS EC2 alt dev
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
