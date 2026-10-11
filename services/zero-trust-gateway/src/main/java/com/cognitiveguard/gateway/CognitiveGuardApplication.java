package com.cognitiveguard.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CognitiveGuardApplication {
    public static void main(String[] args) {
        SpringApplication.run(CognitiveGuardApplication.class, args);
    }
}
