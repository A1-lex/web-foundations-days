// ---------- Starting data ----------
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const CATEGORIES = ["personal", "work", "study"];

// Helper: trim, collapse repeated spaces, lower-case
function normalize(text) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

// ---------- 1. searchNotes ----------
function searchNotes(word) {
  const search = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(search));
}

// ---------- 2. longestNote ----------
function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// ---------- 3. countByCategory ----------
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    if (counts[note.category] === undefined) {
      counts[note.category] = 1;
    } else {
      counts[note.category]++;
    }
  }
  return counts;
}

// ---------- 4. getSummary ----------
function getSummary() {
  const total = notes.length;
  if (total === 0) {
    return "0 notes.";
  }
  const counts = countByCategory();
  const word = total === 1 ? "note" : "notes";
  const parts = CATEGORIES.filter((cat) => counts[cat] > 0).map(
    (cat) => `${counts[cat]} ${cat}`
  );
  return `${total} ${word}: ${parts.join(", ")}.`;
}

// ---------- 5. isDuplicate ----------
function isDuplicate(text) {
  const target = normalize(text);
  return notes.some((note) => normalize(note.text) === target);
}

// ---------- 6. addNote ----------
function addNote(text, category) {
  const cleaned = typeof text === "string" ? text.trim().replace(/\s+/g, " ") : "";

  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log(`Not added: text must be 1-200 characters (got ${cleaned.length}).`);
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log(`Not added: "${cleaned}" already exists.`);
    return false;
  }
  if (!CATEGORIES.includes(category)) {
    console.log(`Not added: "${category}" is not a valid category (use personal, work or study).`);
    return false;
  }

  const nextId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: cleaned, category: category });
  return true;
}

// =====================================================
// TESTS
// =====================================================
const originalNotes = notes; // so we can temporarily swap the array for edge cases

console.log("--- searchNotes ---");
console.log(searchNotes("JAVASCRIPT")); // [ { id: 4, text: "Revise JavaScript arrays", category: "study" } ]  (ignores case)
console.log(searchNotes("the").length); // 2  (notes 2 and 3)
console.log(searchNotes("zebra")); // []  (no results)

console.log("--- longestNote ---");
console.log(longestNote()); // { id: 3, text: "Email the project report to Grace", category: "work" }
notes = [];
console.log(longestNote()); // null  (empty array)
notes = originalNotes;

console.log("--- countByCategory ---");
console.log(countByCategory()); // { personal: 2, study: 2, work: 1 }  (order follows first appearance)
notes = [];
console.log(countByCategory()); // {}  (empty array)
notes = originalNotes;

console.log("--- getSummary ---");
console.log(getSummary()); // "5 notes: 2 personal, 1 work, 2 study."
notes = [originalNotes[0]];
console.log(getSummary()); // "1 note: 1 personal."  (singular)
notes = [];
console.log(getSummary()); // "0 notes."  (empty array)
notes = originalNotes;

console.log("--- isDuplicate ---");
console.log(isDuplicate("buy milk and bread")); // true  (ignores case)
console.log(isDuplicate("  CALL    MUM  ")); // true  (ignores case and extra spaces)
console.log(isDuplicate("Call dad")); // false

console.log("--- addNote ---");
console.log(addNote("Plan weekend trip", "work")); // true  (valid note added)
console.log(getSummary()); // "6 notes: 2 personal, 2 work, 2 study."
console.log(addNote("  buy MILK and   bread ", "personal")); // logs "Not added: ... already exists." then false
console.log(addNote("", "work")); // logs "Not added: text must be 1-200 characters (got 0)." then false
console.log(addNote("   ", "work")); // logs "Not added: text must be 1-200 characters (got 0)." then false  (spaces only)
console.log(addNote("a".repeat(201), "work")); // logs "Not added: text must be 1-200 characters (got 201)." then false
console.log(addNote("Go for a run", "fitness")); // logs "Not added: "fitness" is not a valid category ..." then false
console.log(notes.length); // 6  (only the one valid note was added)
