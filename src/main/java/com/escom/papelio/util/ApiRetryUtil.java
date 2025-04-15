package com.escom.papelio.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Random;
import java.util.function.Supplier;

@Component
@Slf4j
public class ApiRetryUtil {
    private static final int MAX_RETRIES = 10;
    private final Random random = new Random();

    /**
     * Executes a function with retry logic for handling 429 Too Many Requests errors
     * Will retry up to MAX_RETRIES times with a random delay between 0-1 second
     *
     * @param supplier The function to execute that might throw a 429 exception
     * @param <T>      The return type of the function
     * @return The result of the function execution
     * @throws RuntimeException If the function still fails after all retries
     */
    public <T> T executeWithRetry(Supplier<T> supplier) {
        int attempts = 0;
        Exception lastException = null;

        while (attempts < MAX_RETRIES) {
            try {
                return supplier.get();
            } catch (WebClientResponseException e) {
                if (e.getStatusCode().value() == 429) {
                    attempts++;
                    lastException = e;

                    // Calculate random delay between 0-1000ms
                    long delayMillis = random.nextInt(1000);
                    log.warn("Received 429 Too Many Requests, retry attempt {}/{} after {}ms delay", 
                            attempts, MAX_RETRIES, delayMillis);

                    try {
                        Thread.sleep(delayMillis);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Interrupted during retry delay", ie);
                    }
                } else {
                    throw new RuntimeException("API call failed", e);
                }
            }
        }

        log.error("Failed after {} retry attempts", MAX_RETRIES);
        throw new RuntimeException("API call failed after maximum retries", lastException);
    }
}
