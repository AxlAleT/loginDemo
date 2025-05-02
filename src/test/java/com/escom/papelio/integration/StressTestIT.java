package com.escom.papelio.integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class StressTestIT {

    private static final Logger logger = LoggerFactory.getLogger(StressTestIT.class);

    @Autowired
    private MockMvc mockMvc;

    private final AtomicBoolean testShouldContinue = new AtomicBoolean(true);
    private final AtomicInteger successfulRegistrations = new AtomicInteger(0);
    private final AtomicInteger successfulLogins = new AtomicInteger(0);
    private final AtomicInteger successfulDashboardAccesses = new AtomicInteger(0);
    private final AtomicInteger failedOperations = new AtomicInteger(0);
    private final List<Long> responseTimesList = new CopyOnWriteArrayList<>();

    private static class UserCredential {
        final String email;
        final String password;
        final String name;

        UserCredential(String email, String password, String name) {
            this.email = email;
            this.password = password;
            this.name = name;
        }
    }

    @Test
    @Timeout(value = 20, unit = TimeUnit.MINUTES)
    public void performStressTestUntilFailure() throws Exception {
        int initialThreads = 10;        // More aggressive start
        int maxThreads = 200;           // Higher max threads
        int incrementStep = 10;         // Larger increments
        int requestsPerThread = 15;     // More requests per thread
        long stabilizationDelayMs = 500; // Reduced delay between increments

        ExecutorService executorService = null;
        
        logger.info("==========================================");
        logger.info("STRESS TEST STARTED AT: {}", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        logger.info("Initial threads: {}, Max threads: {}, Increment: {}, Requests per thread: {}", 
                initialThreads, maxThreads, incrementStep, requestsPerThread);
        logger.info("==========================================");
        
        try {
            logger.info("Starting stress test...");
            
            for (int threadCount = initialThreads; 
                 threadCount <= maxThreads && testShouldContinue.get(); 
                 threadCount += incrementStep) {
                
                executorService = Executors.newFixedThreadPool(threadCount);
                List<UserCredential> registeredUsers = new CopyOnWriteArrayList<>();
                CountDownLatch latch = new CountDownLatch(threadCount);

                logger.info("Testing with {} concurrent users...", threadCount);
                
                // Submit tasks to the thread pool
                for (int i = 0; i < threadCount; i++) {
                    executorService.submit(() -> {
                        try {
                            for (int j = 0; j < requestsPerThread && testShouldContinue.get(); j++) {
                                // Register a new user
                                UserCredential user = generateRandomUser();
                                boolean registered = registerUser(user);
                                
                                if (registered) {
                                    registeredUsers.add(user);
                                    successfulRegistrations.incrementAndGet();
                                    
                                    // Login with the registered user
                                    boolean loggedIn = loginUser(user);
                                    
                                    if (loggedIn) {
                                        successfulLogins.incrementAndGet();
                                        
                                        // Access dashboard
                                        boolean accessed = accessDashboard();
                                        if (accessed) {
                                            successfulDashboardAccesses.incrementAndGet();
                                        }
                                    }
                                }
                            }
                        } catch (Exception e) {
                            failedOperations.incrementAndGet();
                            logger.error("Test failure detected: {}", e.getMessage(), e);
                            testShouldContinue.set(false);
                        } finally {
                            latch.countDown();
                        }
                    });
                }

                // Wait for all threads to complete
                boolean completed = latch.await(3, TimeUnit.MINUTES);
                if (!completed) {
                    logger.warn("Test timed out with {} threads", threadCount);
                    break;
                }
                
                // Shutdown the executor service
                executorService.shutdown();
                boolean terminated = executorService.awaitTermination(45, TimeUnit.SECONDS);
                if (!terminated) {
                    executorService.shutdownNow();
                }
                
                // Check if test should continue
                if (!testShouldContinue.get()) {
                    logger.info("Test failed with {} threads", threadCount);
                    break;
                }
                
                // Print current statistics
                printStatistics(threadCount);
                
                // Give the system time to stabilize
                Thread.sleep(stabilizationDelayMs);
            }
            
            logger.info("Stress test completed");
            printFinalStatistics();
            
        } finally {
            if (executorService != null && !executorService.isShutdown()) {
                executorService.shutdownNow();
            }
        }
    }
    
    private UserCredential generateRandomUser() {
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        String email = "stress_test_" + uuid + "@example.com";
        String password = "StrongPass_" + uuid + "!";
        String name = "Test User " + uuid;
        
        return new UserCredential(email, password, name);
    }
    
    private boolean registerUser(UserCredential user) {
        try {
            long startTime = System.currentTimeMillis();
            
            MvcResult result = mockMvc.perform(post("/register")
                    .with(SecurityMockMvcRequestPostProcessors.csrf())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .param("name", user.name)
                    .param("password", user.password)
                    .param("email", user.email)
                    .param("confirmPassword", user.password))
                    .andReturn();
            
            long responseTime = System.currentTimeMillis() - startTime;
            responseTimesList.add(responseTime);
            
            int status = result.getResponse().getStatus();
            if (status >= 200 && status < 400) {
                logger.debug("User registered successfully: {}", user.email);
                return true;
            } else {
                logger.debug("Registration failed for user: {}, status: {}", user.email, status);
                return false;
            }
        } catch (Exception e) {
            failedOperations.incrementAndGet();
            logger.error("Error during registration: {}", e.getMessage());
            testShouldContinue.set(false);
            return false;
        }
    }
    
    private boolean loginUser(UserCredential user) {
        try {
            long startTime = System.currentTimeMillis();
            
            MvcResult result = mockMvc.perform(formLogin("/login")
                    .user("username", user.email)
                    .password(user.password))
                    .andReturn();
            
            long responseTime = System.currentTimeMillis() - startTime;
            responseTimesList.add(responseTime);
            
            int status = result.getResponse().getStatus();
            if (status >= 200 && status < 400) {
                logger.debug("User logged in successfully: {}", user.email);
                return true;
            } else {
                logger.debug("Login failed for user: {}, status: {}", user.email, status);
                return false;
            }
        } catch (Exception e) {
            failedOperations.incrementAndGet();
            logger.error("Error during login: {}", e.getMessage());
            testShouldContinue.set(false);
            return false;
        }
    }
    
    private boolean accessDashboard() {
        try {
            long startTime = System.currentTimeMillis();
            
            MvcResult result = mockMvc.perform(get("/dashboard"))
                    .andReturn();
            
            long responseTime = System.currentTimeMillis() - startTime;
            responseTimesList.add(responseTime);
            
            int status = result.getResponse().getStatus();
            if (status >= 200 && status < 400) {
                logger.debug("Dashboard accessed successfully");
                return true;
            } else {
                logger.debug("Dashboard access failed, status: {}", status);
                return false;
            }
        } catch (Exception e) {
            failedOperations.incrementAndGet();
            logger.error("Error accessing dashboard: {}", e.getMessage());
            testShouldContinue.set(false);
            return false;
        }
    }
    
    private void printStatistics(int threadCount) {
        logger.info("------------------------");
        logger.info("Statistics for {} threads:", threadCount);
        logger.info("Successful registrations: {}", successfulRegistrations.get());
        logger.info("Successful logins: {}", successfulLogins.get());
        logger.info("Successful dashboard accesses: {}", successfulDashboardAccesses.get());
        logger.info("Failed operations: {}", failedOperations.get());
        
        if (!responseTimesList.isEmpty()) {
            long sum = responseTimesList.stream().mapToLong(Long::longValue).sum();
            long avg = sum / responseTimesList.size();
            long max = responseTimesList.stream().mapToLong(Long::longValue).max().orElse(0);
            logger.info("Average response time: {}ms", avg);
            logger.info("Max response time: {}ms", max);
            
            // Calculate percentiles for more detailed performance metrics
            List<Long> sortedTimes = new ArrayList<>(responseTimesList);
            java.util.Collections.sort(sortedTimes);
            int size = sortedTimes.size();
            if (size > 0) {
                long p50 = sortedTimes.get(size / 2);
                long p90 = sortedTimes.get((int)(size * 0.9));
                long p95 = sortedTimes.get((int)(size * 0.95));
                long p99 = sortedTimes.get((int)(size * 0.99));
                
                logger.info("Response time percentiles - 50th: {}ms, 90th: {}ms, 95th: {}ms, 99th: {}ms", 
                        p50, p90, p95, p99);
            }
        }
        logger.info("------------------------");
    }
    
    private void printFinalStatistics() {
        logger.info("\n========== FINAL RESULTS ==========");
        logger.info("TEST COMPLETED AT: {}", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        logger.info("Total successful registrations: {}", successfulRegistrations.get());
        logger.info("Total successful logins: {}", successfulLogins.get());
        logger.info("Total successful dashboard accesses: {}", successfulDashboardAccesses.get());
        logger.info("Total failed operations: {}", failedOperations.get());
        
        if (!responseTimesList.isEmpty()) {
            long sum = responseTimesList.stream().mapToLong(Long::longValue).sum();
            long avg = sum / responseTimesList.size();
            long max = responseTimesList.stream().mapToLong(Long::longValue).max().orElse(0);
            long min = responseTimesList.stream().mapToLong(Long::longValue).min().orElse(0);
            logger.info("Total requests processed: {}", responseTimesList.size());
            logger.info("Overall average response time: {}ms", avg);
            logger.info("Overall min response time: {}ms", min);
            logger.info("Overall max response time: {}ms", max);
            
            // Calculate final percentiles
            List<Long> sortedTimes = new ArrayList<>(responseTimesList);
            java.util.Collections.sort(sortedTimes);
            int size = sortedTimes.size();
            if (size > 0) {
                long p50 = sortedTimes.get(size / 2);
                long p90 = sortedTimes.get((int)(size * 0.9));
                long p95 = sortedTimes.get((int)(size * 0.95));
                long p99 = sortedTimes.get((int)(size * 0.99));
                
                logger.info("Overall response time percentiles:");
                logger.info("50th percentile: {}ms", p50);
                logger.info("90th percentile: {}ms", p90);
                logger.info("95th percentile: {}ms", p95);
                logger.info("99th percentile: {}ms", p99);
            }
        }
        logger.info("====================================");
    }
}

