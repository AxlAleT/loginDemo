### **1. Core Search & User Management**
**Actors**: Researchers, Students, Admins

| Use Case | Goal | Design Focus |
|----------|------|--------------|
| **Basic Article Search** | Find articles by keywords/title via Semantic Scholar/CrossRef APIs | Preprocess queries with Spring RestTemplate/WebClient, validate inputs with Spring Validation |
| **Article Metadata Enrichment** | Display detailed metadata (DOI, citations, authors) from API responses | Asynchronous data fetching with WebClient/CompletableFuture |
| **User Registration & Credential Storage** | Allow users to register with email/password | Spring Security’s `UserDetailsService`, BCrypt password encoding |
| **Form-Based Authentication** | Authenticate users via username/password | Configure Spring Security’s `formLogin`, CSRF protection, and session management |
| **Role-Based Dashboard Access** | Restrict admin features (e.g., user management) to specific roles | Use `@PreAuthorize("hasRole('ADMIN')")` on admin endpoints |

---

### **2. Personalization & History**
**Actors**: Authenticated Users

| Use Case | Goal | Design Focus |
|----------|------|--------------|
| **Search History Tracking** | Log user search queries with timestamps | Use `SecurityContextHolder` to inject user context into Spring Data JPA repositories |
| **Favorites Management** | Save/remove articles to a personal list | Many-to-many relationships in JPA, audit fields (`@CreatedDate`) |
| **Personalized Search Suggestions** | Suggest keywords based on user history | Store aggregated history data, use Spring `@Scheduled` for periodic analysis |

---

### **3. Compliance & Data Security**
**Actors**: Admins, System

| Use Case | Goal | Design Focus |
|----------|------|--------------|
| **API Rate Limit Compliance** | Avoid exceeding third-party API quotas | Implement retries with Spring Retry, track usage via counters |
| **GDPR-Compliant Data Deletion** | Delete user data on request | Use Spring Data JPA’s `@Query` for cascading deletions, audit trails |
| **Secure API Key Storage** | Protect Semantic Scholar/CrossRef keys | Externalize secrets using `application-{env}.yml` and `@ConfigurationProperties` |
| **Audit Logging** | Track user actions (searches, logins) | Spring Data Auditing with `AuditorAware`, custom event listeners |

---

### **4. Recommendation Engine**
**Actors**: Users, System

| Use Case | Goal | Design Focus |
|----------|------|--------------|
| **Semantic Scholar-Based Recommendations** | Fetch related articles via recommendation API | Circuit breakers (Resilience4j) for fault tolerance |
| **Trending Research Alerts** | Highlight popular articles in a field | Scheduled API polling with `@Scheduled`, cache results in Redis |

---

### **5. Performance & Scalability**
**Actors**: System Architects

| Use Case | Goal | Design Focus |
|----------|------|--------------|
| **API Response Caching** | Cache frequent API responses (e.g., top searches) | Spring Cache with Caffeine/Redis, evict stale data with `@CacheEvict` |
| **Concurrent User Sessions** | Support 1k+ authenticated sessions | Spring Session with Redis for distributed session storage |
| **Load-Tolerant Authentication** | Handle login spikes without downtime | Optimize Spring Security filter chain, disable unnecessary filters |

---

### **6. Accessibility & Integration**
**Actors**: Users, Developers

| Use Case | Goal | Design Focus                                                        |
|----------|------|---------------------------------------------------------------------|
| **Theme Management** | Support dark/light/auto themes | Store user preferences in CSS variables                             |
| **Metadata Normalization** | Standardize data from CrossRef/Semantic Scholar | Custom Spring `Converter` implementations for DTO mapping           |
| **Error Handling** | Return user-friendly API/client errors | Global exception handling with `@ControllerAdvice`, custom HTTP codes |

---

### **7. Advanced Security** (Spring Security-Focused)
**Actors**: Admins, Users

| Use Case | Goal | Design Focus |
|----------|------|--------------|
| **Brute-Force Login Prevention** | Block repeated failed login attempts | Implement `AuthenticationFailureHandler` with lockout counters |
| **Session Timeout Management** | Automatically log out inactive users | Configure `HttpSession` timeout in `application.yml` |
| **Password Policy Enforcement** | Require strong passwords | Custom `PasswordEncoder` with regex validation |
| **Role Hierarchies** | Define admin/moderator/user permissions | Configure `RoleHierarchy` in Spring Security |

---
