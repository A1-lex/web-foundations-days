-- School database (SQLite)
 
PRAGMA foreign_keys = ON;

-- Drop in reverse order so the script can be re-run
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- Tables 
CREATE TABLE students (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  id      INTEGER PRIMARY KEY,
  title   TEXT NOT NULL,
  credits INTEGER NOT NULL
);

CREATE TABLE enrolments (
  id         INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  course_id  INTEGER NOT NULL,
  grade      INTEGER CHECK (grade BETWEEN 0 AND 100),
  FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE RESTRICT,
  FOREIGN KEY (course_id)  REFERENCES courses (id)  ON DELETE RESTRICT,
  UNIQUE (student_id, course_id)  -- same student cannot enrol on the same course twice
);

-- Sample data 
INSERT INTO students (id, name, email) VALUES
  (1, 'Amina Otieno',   'amina@example.com'),
  (2, 'Brian Kamau',    'brian@example.com'),
  (3, 'Cynthia Mwangi', 'cynthia@example.com'),
  (4, 'David Njoroge',  'david@example.com');

INSERT INTO courses (id, title, credits) VALUES
  (1, 'Web Foundations', 3),
  (2, 'Databases',       4),
  (3, 'Python Basics',   3);

INSERT INTO enrolments (id, student_id, course_id, grade) VALUES
  (1, 1, 1, 85),
  (2, 1, 2, 78),
  (3, 2, 1, 92),
  (4, 3, 1, 67),
  (5, 3, 2, 74),
  (6, 3, 3, 88);

-- Queries

-- Query 1: all courses for one student (by name)
SELECT courses.title, enrolments.grade
FROM students
JOIN enrolments ON enrolments.student_id = students.id
JOIN courses    ON courses.id = enrolments.course_id
WHERE students.name = 'Amina Otieno';

-- Query 2: all students on one course
SELECT students.name, students.email, enrolments.grade
FROM courses
JOIN enrolments ON enrolments.course_id = courses.id
JOIN students   ON students.id = enrolments.student_id
WHERE courses.title = 'Web Foundations';

-- Query 3: the number of students per course (LEFT JOIN keeps empty courses at 0)
SELECT courses.title, COUNT(enrolments.id) AS student_count
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.id
GROUP BY courses.id, courses.title;

-- Query 4: students who have no enrolments
SELECT students.name, students.email
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.id
WHERE enrolments.id IS NULL;

-- Query 5: update one enrolment's grade (Amina, Databases: 78 -> 82)
UPDATE enrolments
SET grade = 82
WHERE student_id = (SELECT id FROM students WHERE name = 'Amina Otieno')
  AND course_id  = (SELECT id FROM courses  WHERE title = 'Databases');

-- Check the update worked
SELECT students.name, courses.title, enrolments.grade
FROM enrolments
JOIN students ON students.id = enrolments.student_id
JOIN courses  ON courses.id = enrolments.course_id
WHERE students.name = 'Amina Otieno';

-- Safe way to remove a student with enrolments:
-- 1. Copy their enrolments into an archive table so the grades are kept.
-- 2. Delete their rows from enrolments.
-- 3. Delete the student row.
-- RESTRICT blocks step 3 until step 2 is done, so nothing is lost by accident.
