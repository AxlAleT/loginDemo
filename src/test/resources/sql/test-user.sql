-- This script creates a test user for integration tests
-- The password is 'Password123!' encoded with BCrypt

INSERT INTO usuarios (id, email, password, name, role)
VALUES (999, 'test@example.com', '$2a$12$jJJYMSzUU5aXamHNl.nsfOU1DqJSpeW2wzbWdgdaMiv3TMEzYb9AG', 'testuser', 'ROLE_USER');

-- Add any necessary role assignments if you have roles in your application
