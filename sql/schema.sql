-- PalawanSU–Rizal Student Deficiency Monitoring System
-- PostgreSQL schema

DROP TABLE IF EXISTS smtp_settings CASCADE;
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
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Pending')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deficiency_types (
  deficiency_id SERIAL PRIMARY KEY,
  deficiency_name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  required_document VARCHAR(150) NOT NULL,
  applies_to VARCHAR(100) NOT NULL DEFAULT 'All',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX users_student_number_unique
  ON users (student_number)
  WHERE student_number IS NOT NULL AND student_number <> '';

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

CREATE UNIQUE INDEX student_deficiencies_open_unique
  ON student_deficiencies (user_id, deficiency_id)
  WHERE status IN ('Pending','Under Review','Rejected');

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

-- Singleton SMTP config for deficiency / registrar email notifications
CREATE TABLE smtp_settings (
  settings_id INTEGER PRIMARY KEY DEFAULT 1 CHECK (settings_id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  host VARCHAR(255) NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 587,
  encryption VARCHAR(20) NOT NULL DEFAULT 'tls'
    CHECK (encryption IN ('none', 'tls', 'ssl')),
  username VARCHAR(255) NOT NULL DEFAULT '',
  password VARCHAR(255) NOT NULL DEFAULT '',
  from_email VARCHAR(150) NOT NULL DEFAULT '',
  from_name VARCHAR(150) NOT NULL DEFAULT 'PSU Rizal Registrar',
  reply_to VARCHAR(150) NOT NULL DEFAULT '',
  updated_by INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO smtp_settings (settings_id, enabled, host, port, encryption, from_name)
VALUES (1, FALSE, '', 587, 'tls', 'PSU Rizal · Office of the Registrar');

-- Placeholder staff rows; run sql/seed.php to set real password hashes
INSERT INTO users (student_number, first_name, last_name, middle_name, email, username, password, role, status) VALUES
(NULL, 'System', 'Administrator', NULL, 'admin.rizal@psu.palawan.edu.ph', 'admin',
 'RUN_SEED_PHP', 'Admin', 'Active'),
(NULL, 'Campus', 'Registrar', NULL, 'registrar.rizal@psu.palawan.edu.ph', 'registrar',
 'RUN_SEED_PHP', 'Registrar', 'Active');

INSERT INTO deficiency_types (deficiency_name, description, required_document, applies_to) VALUES
('Form 137', 'Permanent Student Record from previous school — required for enrollment at Palawan State University – Rizal Campus.', 'Form 137 / Permanent Record', 'Freshman,Transferee'),
('Form 138', 'Report card / SF9 from the last school year attended.', 'Form 138 / Report Card (SF9)', 'Freshman,Transferee'),
('PSA Birth Certificate', 'PSA-authenticated birth certificate (original or certified true copy).', 'PSA Birth Certificate', 'All'),
('Good Moral Certificate', 'Certificate of good moral character issued by the previous school.', 'Certificate of Good Moral Character', 'Freshman,Transferee'),
('Transcript of Records', 'Official TOR for transferees and graduating students (PSU or previous HEI).', 'Transcript of Records (TOR)', 'Transferee,Graduating'),
('Clearance', 'Campus clearance required before graduation / credential release at PSU Rizal.', 'Student Clearance Form', 'Graduating'),
('ID Picture', 'Recent 2×2 ID photo with white background for campus records.', '2×2 ID Picture', 'All'),
('Medical Certificate', 'Medical fitness certificate for enrollment / campus activities.', 'Medical Certificate', 'All');
