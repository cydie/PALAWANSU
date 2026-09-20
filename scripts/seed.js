import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Client } from 'pg';

function loadEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i > 0) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

loadEnv();

const client = new Client({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'palawansu_deficiency',
});

await client.connect();

const accounts = [
  {
    username: 'admin',
    email: 'admin@palsu-rizal.edu.ph',
    first_name: 'System',
    last_name: 'Administrator',
    role: 'Admin',
    password: 'Admin@123',
    student_number: null,
  },
  {
    username: 'registrar',
    email: 'registrar@palsu-rizal.edu.ph',
    first_name: 'Campus',
    last_name: 'Registrar',
    role: 'Registrar',
    password: 'Registrar@123',
    student_number: null,
  },
  {
    username: 'student',
    email: 'student@palsu-rizal.edu.ph',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    role: 'Freshman',
    password: 'Student@123',
    student_number: '2026-0001',
  },
];

for (const s of accounts) {
  const hash = await bcrypt.hash(s.password, 12);
  const found = await client.query('SELECT user_id FROM users WHERE username = $1 LIMIT 1', [s.username]);
  if (found.rowCount) {
    await client.query(
      "UPDATE users SET password = $1, email = $2, role = $3, status = 'Active', first_name = $4, last_name = $5, student_number = $6 WHERE user_id = $7",
      [hash, s.email, s.role, s.first_name, s.last_name, s.student_number, found.rows[0].user_id]
    );
    console.log(`Updated ${s.username}`);
  } else {
    await client.query(
      `INSERT INTO users (student_number, first_name, last_name, email, username, password, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active')`,
      [s.student_number, s.first_name, s.last_name, s.email, s.username, hash, s.role]
    );
    console.log(`Created ${s.username}`);
  }
}

const types = [
  ['Form 137', 'Permanent Student Record required for enrollment or transfer.', 'Form 137 / Permanent Record'],
  ['Form 138', 'Student Report Card from previous school year.', 'Form 138 / Report Card'],
  ['PSA Birth Certificate', 'Official PSA birth certificate copy.', 'PSA Birth Certificate'],
  ['Good Moral Certificate', 'Certificate of good moral character from previous school.', 'Good Moral Certificate'],
  ['Transcript of Records', 'Official TOR for transferees and graduating students.', 'Transcript of Records'],
  ['Clearance', 'School clearance for graduation processing.', 'Clearance Form'],
];

for (const t of types) {
  const exists = await client.query('SELECT deficiency_id FROM deficiency_types WHERE deficiency_name = $1', [t[0]]);
  if (!exists.rowCount) {
    await client.query(
      'INSERT INTO deficiency_types (deficiency_name, description, required_document) VALUES ($1,$2,$3)',
      t
    );
    console.log(`Added deficiency type: ${t[0]}`);
  }
}

const student = await client.query("SELECT user_id FROM users WHERE username = 'student' LIMIT 1");
const form137 = await client.query("SELECT deficiency_id FROM deficiency_types WHERE deficiency_name = 'Form 137' LIMIT 1");
if (student.rowCount && form137.rowCount) {
  const already = await client.query(
    'SELECT student_deficiency_id FROM student_deficiencies WHERE user_id = $1 AND deficiency_id = $2 LIMIT 1',
    [student.rows[0].user_id, form137.rows[0].deficiency_id]
  );
  if (!already.rowCount) {
    await client.query(
      `INSERT INTO student_deficiencies (user_id, deficiency_id, remarks, status, assigned_date)
       VALUES ($1, $2, $3, 'Pending', CURRENT_DATE)`,
      [student.rows[0].user_id, form137.rows[0].deficiency_id, 'Submit your Form 137 for enrollment.']
    );
    console.log('Assigned Form 137 to student');
  }
}

await client.end();
console.log('\nSeed complete. Three user accounts:');
console.log('Admin      admin      / Admin@123');
console.log('Registrar  registrar  / Registrar@123');
console.log('Student    student    / Student@123');
console.log('Open: http://localhost:3000/login');
