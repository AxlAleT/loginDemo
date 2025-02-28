#!/bin/bash

# Configuration
BASE_URL="http://localhost:8080"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"
TEST_USER_EMAIL="testuser@example.com"
TEST_USER_PASSWORD="password123"
TEST_USER_NAME="Test User"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global counters for test summary
PASSED=0
FAILED=0

# Function to print colored output and update counters
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ $2${NC}"
    PASSED=$((PASSED+1))
  else
    echo -e "${RED}✗ $2${NC}"
    echo -e "${RED}Response: $3${NC}"
    FAILED=$((FAILED+1))
  fi
}

# Function to extract CSRF token from HTML response
extract_csrf_token() {
  echo "$1" | grep -o 'name="_csrf" value="[^"]*"' | sed 's/.*value="\([^"]*\)".*/\1/'
}

# Function to test an endpoint.
# Parameters:
#   $1 = Test name
#   $2 = HTTP method (GET, POST, PUT, DELETE)
#   $3 = URL
#   $4 = Description
#   $5 = (optional) Data payload
test_endpoint() {
  local test_name="$1"
  local method="$2"
  local url="$3"
  local description="$4"
  local data="$5"

  echo -e "${BLUE}Testing: $test_name${NC}"

  local response status body

  if [ -z "$data" ]; then
    # GET (or DELETE) request without payload
    response=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X "$method" "$url")
  else
    if [[ "$data" =~ ^\{ ]]; then
      # JSON payload: add extra headers similar to browser
      response=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
         -X "$method" \
         -H "Content-Type: application/json" \
         -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
         -H "X-Requested-With: XMLHttpRequest" \
         -H "Origin: $BASE_URL" \
         -d "$data" "$url")
    else
      # Form data: append _csrf if not already provided
      if [[ "$data" != *"_csrf="* ]]; then
         data="${data}&_csrf=${CSRF_TOKEN}"
      fi
      response=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
         -X "$method" \
         -H "Content-Type: application/x-www-form-urlencoded" \
         -d "$data" "$url")
    fi
  fi

  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [[ "$status" =~ ^(200|201|302|204)$ ]]; then
    print_status 0 "$description" "$body"
  else
    print_status 1 "$description" "$body"
  fi

  echo "$body"
  echo ""
}

# Create a cookie jar file
COOKIE_JAR=$(mktemp)
echo "Using cookie jar: $COOKIE_JAR"
echo ""

# Step 1: Initial load to get CSRF token from the login page
echo -e "${BLUE}Step 1: Getting initial CSRF token${NC}"
LOGIN_PAGE=$(curl -s -c "$COOKIE_JAR" "$BASE_URL/login")
CSRF_TOKEN=$(extract_csrf_token "$LOGIN_PAGE")

if [ -z "$CSRF_TOKEN" ]; then
  echo -e "${RED}Could not extract CSRF token. Exiting.${NC}"
  exit 1
else
  echo -e "${GREEN}CSRF Token: $CSRF_TOKEN${NC}"
  echo ""
fi

# Step 2: Login as admin
echo -e "${BLUE}Step 2: Logging in as admin${NC}"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -d "username=$ADMIN_EMAIL&password=$ADMIN_PASSWORD&_csrf=$CSRF_TOKEN" \
  "$BASE_URL/login")
STATUS=$(echo "$LOGIN_RESPONSE" | tail -n1)
if [[ "$STATUS" =~ ^(200|302)$ ]]; then
  print_status 0 "Admin login successful" ""
else
  print_status 1 "Admin login failed. Status: $STATUS" "$(echo "$LOGIN_RESPONSE" | sed '$d')"
  exit 1
fi
echo ""

# Refresh CSRF token after admin login using a protected page
echo -e "${BLUE}Refreshing CSRF token after admin login${NC}"
DASHBOARD_PAGE=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/admin")
new_token=$(extract_csrf_token "$DASHBOARD_PAGE")
if [ -n "$new_token" ]; then
  CSRF_TOKEN="$new_token"
  echo -e "${GREEN}New CSRF Token: $CSRF_TOKEN${NC}"
else
  echo -e "${RED}Warning: Could not refresh CSRF token after login${NC}"
fi
echo ""

# Step 3: Test admin endpoints (GET requests)
test_endpoint "Admin Dashboard" "GET" "$BASE_URL/admin" "Admin dashboard should be accessible"
test_endpoint "User Management" "GET" "$BASE_URL/admin/usuarios" "User management page should be accessible"

# Step 4: Test admin API endpoints
echo -e "${BLUE}Step 4: Testing Admin API endpoints${NC}"
test_endpoint "List Users API" "GET" "$BASE_URL/api/admin/usuarios" "Should list all users"

# Create a new user via API (JSON payload)
NEW_USER_JSON="{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\",\"nombre\":\"$TEST_USER_NAME\",\"rol\":\"ROLE_USER\"}"
test_endpoint "Create User API" "POST" "$BASE_URL/api/admin/usuarios" "Should create a new user" "$NEW_USER_JSON"

# Get the created user ID (assuming it's the second user after admin)
USER_DATA=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/admin/usuarios")
USER_ID=$(echo "$USER_DATA" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | sed -n '2p')
if [ -z "$USER_ID" ]; then
  echo -e "${RED}Could not find user ID. Using ID=2 as fallback.${NC}"
  USER_ID=2
else
  echo -e "${GREEN}Found user ID: $USER_ID${NC}"
fi
echo ""

test_endpoint "Get User by ID" "GET" "$BASE_URL/api/admin/usuarios/$USER_ID" "Should get user details"

# Update user (JSON payload, use PUT instead of POST)
UPDATE_USER_JSON="{\"id\":$USER_ID,\"email\":\"$TEST_USER_EMAIL\",\"nombre\":\"Updated Name\",\"rol\":\"ROLE_USER\"}"
test_endpoint "Update User" "PUT" "$BASE_URL/api/admin/usuarios/$USER_ID" "Should update user" "$UPDATE_USER_JSON"

# Step 5: Logout admin
echo -e "${BLUE}Step 5: Logging out admin${NC}"
LOGOUT_PAGE=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/login")
CSRF_TOKEN=$(extract_csrf_token "$LOGOUT_PAGE")
LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -d "_csrf=$CSRF_TOKEN" \
  "$BASE_URL/logout")
STATUS=$(echo "$LOGOUT_RESPONSE" | tail -n1)
if [[ "$STATUS" =~ ^(200|302)$ ]]; then
  print_status 0 "Admin logout successful" ""
else
  print_status 1 "Admin logout failed. Status: $STATUS" "$(echo "$LOGOUT_RESPONSE" | sed '$d')"
fi
echo ""

# Step 6: Test registration (form data)
echo -e "${BLUE}Step 6: Testing user registration${NC}"
REGISTRO_PAGE=$(curl -s -c "$COOKIE_JAR" "$BASE_URL/registro")
CSRF_TOKEN=$(extract_csrf_token "$REGISTRO_PAGE")
NEW_TEST_EMAIL="newuser@example.com"
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -d "email=$NEW_TEST_EMAIL&password=password123&nombre=New User&_csrf=$CSRF_TOKEN" \
  "$BASE_URL/registro")
STATUS=$(echo "$REGISTER_RESPONSE" | tail -n1)
if [[ "$STATUS" =~ ^(200|302)$ ]]; then
  print_status 0 "Registration successful" ""
else
  print_status 1 "Registration failed. Status: $STATUS" "$(echo "$REGISTER_RESPONSE" | sed '$d')"
fi
echo ""

# Step 7: Login as new user (form data)
echo -e "${BLUE}Step 7: Logging in as new user${NC}"
LOGIN_PAGE=$(curl -s -c "$COOKIE_JAR" "$BASE_URL/login")
CSRF_TOKEN=$(extract_csrf_token "$LOGIN_PAGE")
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -d "username=$NEW_TEST_EMAIL&password=password123&_csrf=$CSRF_TOKEN" \
  "$BASE_URL/login")
STATUS=$(echo "$LOGIN_RESPONSE" | tail -n1)
if [[ "$STATUS" =~ ^(200|302)$ ]]; then
  print_status 0 "New user login successful" ""
else
  print_status 1 "New user login failed. Status: $STATUS" "$(echo "$LOGIN_RESPONSE" | sed '$d')"
fi
echo ""

# Refresh CSRF token after new user login using a protected page
echo -e "${BLUE}Refreshing CSRF token after new user login${NC}"
USER_DASHBOARD=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/user")
new_token=$(extract_csrf_token "$USER_DASHBOARD")
if [ -n "$new_token" ]; then
  CSRF_TOKEN="$new_token"
  echo -e "${GREEN}New CSRF Token: $CSRF_TOKEN${NC}"
else
  echo -e "${RED}Warning: Could not refresh CSRF token after new user login${NC}"
fi
echo ""

# Step 8: Test user endpoints (GET requests)
test_endpoint "User Dashboard" "GET" "$BASE_URL/user" "User dashboard should be accessible"
test_endpoint "User Profile" "GET" "$BASE_URL/user/perfil" "User profile should be accessible"

# Step 9: Try accessing admin endpoints (should fail for a regular user)
echo -e "${BLUE}Step 9: Testing access control - Regular user trying to access admin endpoints${NC}"
ADMIN_ACCESS_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/admin")
STATUS=$(echo "$ADMIN_ACCESS_RESPONSE" | tail -n1)
if [[ "$STATUS" =~ ^(403|404)$ ]]; then
  print_status 0 "Access control working - Regular user cannot access admin pages" ""
else
  print_status 1 "Access control issue - Regular user could access admin pages" "$(echo "$ADMIN_ACCESS_RESPONSE" | sed '$d')"
fi
echo ""

# Step 10: Clean up - Delete the test users (login as admin first)
echo -e "${BLUE}Step 10: Clean up - Deleting test users (login as admin first)${NC}"
LOGIN_PAGE=$(curl -s -c "$COOKIE_JAR" "$BASE_URL/login")
CSRF_TOKEN=$(extract_csrf_token "$LOGIN_PAGE")
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -d "username=$ADMIN_EMAIL&password=$ADMIN_PASSWORD&_csrf=$CSRF_TOKEN" \
  "$BASE_URL/login")
STATUS=$(echo "$LOGIN_RESPONSE" | tail -n1)
if [[ "$STATUS" =~ ^(200|302)$ ]]; then
  print_status 0 "Admin login (for cleanup) successful" ""

  # Get user data
  USER_DATA=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/admin/usuarios")
  echo "User data: $USER_DATA"

  # Find user IDs for our test users
  TEST_USER_ID=$(echo "$USER_DATA" | grep -o "\"email\":\"$TEST_USER_EMAIL\",\"nombre\":\"[^\"]*\",\"rol\":\"[^\"]*\",\"id\":[0-9]*" | grep -o 'id:[0-9]*' | grep -o '[0-9]*')
  NEW_USER_ID=$(echo "$USER_DATA" | grep -o "\"email\":\"$NEW_TEST_EMAIL\",\"nombre\":\"[^\"]*\",\"rol\":\"[^\"]*\",\"id\":[0-9]*" | grep -o 'id:[0-9]*' | grep -o '[0-9]*')

  # Delete test user if found
  if [ ! -z "$TEST_USER_ID" ]; then
    echo -e "${BLUE}Deleting test user with ID $TEST_USER_ID${NC}"
    DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE -b "$COOKIE_JAR" "$BASE_URL/api/admin/usuarios/$TEST_USER_ID")
    STATUS=$(echo "$DELETE_RESPONSE" | tail -n1)
    if [[ "$STATUS" =~ ^(200|204|302)$ ]]; then
      print_status 0 "Test user deleted successfully" ""
    else
      print_status 1 "Failed to delete test user" "$(echo "$DELETE_RESPONSE" | sed '$d')"
    fi
  fi

  if [ ! -z "$NEW_USER_ID" ]; then
    echo -e "${BLUE}Deleting new user with ID $NEW_USER_ID${NC}"
    DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE -b "$COOKIE_JAR" "$BASE_URL/api/admin/usuarios/$NEW_USER_ID")
    STATUS=$(echo "$DELETE_RESPONSE" | tail -n1)
    if [[ "$STATUS" =~ ^(200|204|302)$ ]]; then
      print_status 0 "New user deleted successfully" ""
    else
      print_status 1 "Failed to delete new user" "$(echo "$DELETE_RESPONSE" | sed '$d')"
    fi
  fi
else
  print_status 1 "Admin login for cleanup failed" ""
fi

# Clean up cookie jar
rm "$COOKIE_JAR"
echo -e "${GREEN}Test completed. Cookie jar removed.${NC}"

# Print test summary
echo ""
echo -e "${BLUE}Test Summary:${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
