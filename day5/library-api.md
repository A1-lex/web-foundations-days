# Library API Design: Books

A REST API for a library's `books` resource. All requests and responses use JSON.

## Book object

```json
{
  "id": 7,
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1958,
  "isbn": "9780385474542",
  "available": true
}
```

## Endpoints

### 1. List all books
- **Method:** GET
- **Path:** `/books`
- **Description:** Returns every book in the library.
- **Request body:** none
- **Success status:** 200 OK

### 2. Get one book
- **Method:** GET
- **Path:** `/books/{id}`
- **Description:** Returns the book with the given id.
- **Request body:** none
- **Success status:** 200 OK

### 3. List books by an author
- **Method:** GET
- **Path:** `/books?author=Chinua%20Achebe`
- **Description:** Returns only the books written by the author given in the `author` query parameter.
- **Request body:** none
- **Success status:** 200 OK (an empty array `[]` if the author has no books)

### 4. Create a book
- **Method:** POST
- **Path:** `/books`
- **Description:** Adds a new book and returns it with its new id.
- **Request body:**
```json
  {
    "title": "Weep Not, Child",
    "author": "Ngugi wa Thiong'o",
    "year": 1964,
    "isbn": "9780435908300"
  }
```
- **Success status:** 201 Created

### 5. Update a book (full replace)
- **Method:** PUT
- **Path:** `/books/{id}`
- **Description:** Replaces all the fields of an existing book.
- **Request body:**
```json
  {
    "title": "Weep Not, Child",
    "author": "Ngugi wa Thiong'o",
    "year": 1964,
    "isbn": "9780435908300",
    "available": false
  }
```
- **Success status:** 200 OK

### 6. Update part of a book
- **Method:** PATCH
- **Path:** `/books/{id}`
- **Description:** Changes only the fields sent, for example marking a book as borrowed.
- **Request body:**
```json
  { "available": false }
```
- **Success status:** 200 OK

### 7. Delete a book
- **Method:** DELETE
- **Path:** `/books/{id}`
- **Description:** Removes the book from the library.
- **Request body:** none
- **Success status:** 204 No Content

## Error codes

### 400 Bad Request
- The request is invalid and the server cannot process it.
- **Example:** `POST /books` with an empty title, or with `"year": "nineteen sixty-four"` instead of a number.
- **Example response:**
```json
  { "error": "Title is required." }
```

### 404 Not Found
- The requested book does not exist.
- **Example:** `GET /books/9999` when no book has the id 9999. The same applies to `PUT`, `PATCH` and `DELETE` on an id that does not exist.
- **Example response:**
```json
  { "error": "Book 9999 not found." }
```
