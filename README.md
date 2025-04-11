# Papelio - Research & Authentication System

Papelio is a research platform developed using Spring Boot. It allows users to search for academic articles, manage user roles, track research history, and ensure compliance with data security standards.

## Features

### **1. Secure Authentication & User Management**
- **Secure Authentication:** Password encryption and protected sessions.
- **Role-Based Access Control:**
    - **Administrator:** Full CRUD operations on user management and database.
    - **User:** Can view personal information and manage research data.
- **Automated Testing:** `test.sh` script for authentication and CRUD operations using cURL.

### **2. Research & Article Search**
- **Basic Article Search:** Keyword-based search via Semantic Scholar/CrossRef APIs.
- **Advanced Filtering:** Filters by publication date, journal, document type, and language.
- **Metadata Enrichment:** DOI, citations, and author details fetched asynchronously.

### **3. Personalized Research Experience**
- **Search History Tracking:** Logs user queries and timestamps.
- **Favorites Management:** Save/remove articles for easy access.
- **Personalized Search Suggestions:** AI-driven recommendations based on search history.
- **Exporting Data:** Allows exporting saved research as CSV/JSON.

### **4. Compliance & Security**
- **API Rate Limits:** Implements retries and API usage monitoring.
- **GDPR Compliance:** Secure user data deletion upon request.
- **API Key Protection:** Externalized secrets management.
- **Audit Logging:** Tracks searches, logins, and user activity.

### **5. Research Recommendation Engine**
- **AI-Based Recommendations:** Suggests related articles via Semantic Scholar API.
- **Trending Research Alerts:** Highlights popular publications.
- **Citation Network Visualization:** Displays citation relationships.

### **6. Performance & Scalability**
- **API Response Caching:** Uses Redis for caching frequent queries.
- **Concurrent Session Support:** Scalable user session management.
- **Load-Tolerant Authentication:** Optimized security filter chain.
- **Health Monitoring:** Tracks API latency and errors.

## Installation & Deployment

### **1. Local Execution**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AxlAleT/papelio
   cd papelio
   ```

2. **Build and package the application:**
    ```bash
    ./mvnw clean package -DskipTests
    ```

3. **Run the application:**
    ```bash
    java -jar target/*.jar
    ```
   The application will be available at [http://localhost:8080](http://localhost:8080).

### **2. Docker Deployment**

1. **Build the Docker image:**
   ```bash
   docker build -t papelio .
   ```

2. **Run using Docker Compose:**
   ```bash
   docker-compose up
   ```
    - Application will be accessible at [http://localhost:8080](http://localhost:8080).
    - PostgreSQL database will be mapped to port 5433.

## License
This project is open-source and available under the MIT License.
