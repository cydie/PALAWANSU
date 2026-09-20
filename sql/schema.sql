-- PalawanSU–Rizal Student Deficiency Monitoring System
-- PostgreSQL schema

DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS report_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS document_reviews CASCADE;
DROP TABLE IF EXISTS uploaded_documents CASCADE;
DROP TABLE IF EXISTS student_deficiencies CASCADE;
DROP TABLE IF EXISTS deficiency_types CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  student_number VARCHAR(50) NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Registrar', 'Freshman', 'Transferee', 'Graduating')),
  profile_image VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deficiency_types (
  deficiency_id SERIAL PRIMARY KEY,
  deficiency_name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  required_document VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_deficiencies (
  student_deficiency_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  deficiency_id INTEGER NOT NULL REFERENCES deficiency_types(deficiency_id) ON DELETE RESTRICT,
  remarks TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Completed')),
  assigned_date DATE NOT NULL,
  completion_date DATE NULL
);

CREATE TABLE uploaded_documents (
  document_id SERIAL PRIMARY KEY,
  student_deficiency_id INTEGER NOT NULL REFERENCES student_deficiencies(student_deficiency_id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  remarks TEXT NULL,
  review_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (review_status IN ('Pending', 'Under Review', 'Approved', 'Rejected')),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_reviews (
  review_id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES uploaded_documents(document_id) ON DELETE CASCADE,
  reviewed_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  review_action VARCHAR(20) NOT NULL CHECK (review_action IN ('Approved', 'Rejected', 'Under Review')),
  review_remarks TEXT NULL,
  reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  sender_id INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL,
  receiver_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  notification_type VARCHAR(20) NOT NULL DEFAULT 'System'
    CHECK (notification_type IN ('SMS', 'Email', 'System')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Unread' CHECK (status IN ('Unread', 'Read')),
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE report_logs (
  report_id SERIAL PRIMARY KEY,
  generated_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  report_type VARCHAR(40) NOT NULL
    CHECK (report_type IN ('Deficiency Report', 'Completion Report', 'Notification Report')),
  date_from DATE NULL,
  date_to DATE NULL,
  classification VARCHAR(20) NOT NULL DEFAULT 'All'
    CHECK (classification IN ('All', 'Freshman', 'Transferee', 'Graduating')),
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_logs (
  log_id SERIAL PRIMARY KEY,
  user_id INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  log_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Placeholder staff rows; run sql/seed.php to set real password hashes
INSERT INTO users (student_number, first_name, last_name, middle_name, email, username, password, role, status) VALUES
(NULL, 'System', 'Administrator', NULL, 'admin@palsu-rizal.edu.ph', 'admin',
 'RUN_SEED_PHP', 'Admin', 'Active'),
(NULL, 'Campus', 'Registrar', NULL, 'registrar@palsu-rizal.edu.ph', 'registrar',
 'RUN_SEED_PHP', 'Registrar', 'Active');

INSERT INTO deficiency_types (deficiency_name, description, required_document) VALUES
('Form 137', 'Permanent Student Record required for enrollment or transfer.', 'Form 137 / Permanent Record'),
('Form 138', 'Student Report Card from previous school year.', 'Form 138 / Report Card'),
('PSA Birth Certificate', 'Official PSA birth certificate copy.', 'PSA Birth Certificate'),
('Good Moral Certificate', 'Certificate of good moral character from previous school.', 'Good Moral Certificate'),
('Transcript of Records', 'Official TOR for transferees and graduating students.', 'Transcript of Records'),
('Clearance', 'School clearance for graduation processing.', 'Clearance Form');
