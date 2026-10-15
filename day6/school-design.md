# School Database Design

## Tables

### students
Stores one row per student: an `id` (primary key), a `name` and an `email`. The email is `NOT NULL` and `UNIQUE`, so two students cannot share an address.

### courses
Stores one row per course: an `id` (primary key), a `title` and the number of `credits`. Each course is stored once, however many students take it.

### enrolments
Stores the fact that a student is enrolled on a course. It has its own `id`, a `student_id` and a `course_id` (both foreign keys, both `NOT NULL`), and a `grade` between 0 and 100. The grade is allowed to be empty because a student has no grade until they are marked. A `UNIQUE (student_id, course_id)` rule stops the same student enrolling on the same course twice.

## Relationships

- **students to enrolments is one-to-many.** One student can have many enrolments, but each enrolment belongs to exactly one student.
- **courses to enrolments is one-to-many.** One course can have many enrolments, but each enrolment belongs to exactly one course.
- **students to courses is many-to-many.** One student takes many courses, and one course has many students.

A many-to-many relationship needs a join table because a single column cannot hold a list of values. Putting a list of course ids in the `students` table would make it hard to search, update and keep correct. The `enrolments` table solves this by turning each pairing into its own row, using two foreign keys. It also gives the grade a natural home, because the grade belongs to the pairing of a student and a course, not to either one alone.

## Index I would add

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments (course_id);
```

**Reason:** "all students on one course" and "number of students per course" both look up enrolments by `course_id`. Without an index the database must scan every row of `enrolments`, which gets slow as the school grows. The `UNIQUE (student_id, course_id)` rule already creates an index that helps lookups by student, so `course_id` is the one that is missing. The cost is slightly slower inserts and a little extra storage, which is a good trade for a table that is read far more often than it is written.

## SQL or NoSQL?

I would choose SQL for this system. School data is highly structured and full of relationships: students, courses and enrolments link to each other, and the questions people ask involve joining them, such as who is on a course or who has no enrolments. A relational database answers these with simple joins and enforces the rules for me: unique emails, no double enrolments and no enrolment pointing at a student who does not exist. Transactions also keep changes safe, for example if a student is moved between courses and both steps must succeed together. A document database would suit data with a flexible shape that is mostly read as one whole record, but here the shape is fixed and the relationships matter more, so SQL is the better fit.

## Deletion rules

Both foreign keys in `enrolments` use `ON DELETE RESTRICT`. A student or course that still has enrolments cannot be deleted. This protects academic records: removing a student or a course should never silently erase the grades attached to it. To remove someone, the school must first decide what happens to their enrolments, for example by archiving them. `ON DELETE CASCADE` would be shorter to write, but it would wipe historical transcripts in a single statement, so I rejected it for this system.

## Schema summary

The full script is in `school.sql`. These are the three tables:

```sql
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
  UNIQUE (student_id, course_id)
);
```


## Deletion rules

Both foreign keys in `enrolments` use `ON DELETE RESTRICT`. A student or course that still has enrolments cannot be deleted. This protects academic records: removing a student or a course should never silently erase the grades attached to it. To remove someone, the school must first decide what happens to their enrolments, for example by archiving them. `ON DELETE CASCADE` would be shorter to write, but it would wipe historical transcripts in a single statement, so I rejected it for this system.

## Schema summary

The full script is in `school.sql`. These are the three tables:

```sql
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
  UNIQUE (student_id, course_id)
);
```
