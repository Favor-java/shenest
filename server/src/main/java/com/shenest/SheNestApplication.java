package com.shenest;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;

@SpringBootApplication
public class SheNestApplication {
    // This is the entry point: create the database folder, then start Spring Boot.
    public static void main(String[] args) throws Exception {
        Files.createDirectories(Path.of("data"));
        SpringApplication.run(SheNestApplication.class, args);
    }
}
