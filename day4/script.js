
// ---------- Select elements ----------
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

const MAX_CHARS = 200;
const WARNING_AT = 180;

// ---------- Counters ----------
function countWords(text) {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

function updateCounts() {
  const length = noteText.value.length;

  charCount.textContent = `${length} / ${MAX_CHARS} characters`;
  wordCount.textContent = `${countWords(noteText.value)} words`;

  charCount.classList.toggle("warning", length > WARNING_AT);
  charCount.classList.toggle("over", length > MAX_CHARS);
}

// ---------- Draft ----------
function saveDraft() {
  if (noteText.value === "") {
    localStorage.removeItem("draft");
  } else {
    localStorage.setItem("draft", noteText.value);
  }
}

function clearAll() {
  noteText.value = "";
  localStorage.removeItem("draft");
  updateCounts();
  noteText.focus();
}

// ---------- Theme ----------
function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  // The label names the mode you will switch TO
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

// ---------- Events ----------
noteText.addEventListener("input", () => {
  updateCounts();
  saveDraft();
});

noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearAll();
  }
});

clearBtn.addEventListener("click", clearAll);

themeToggle.addEventListener("click", () => {
  const nowDark = !document.body.classList.contains("dark");
  const theme = nowDark ? "dark" : "light";
  applyTheme(theme);
  localStorage.setItem("theme", theme);
});

// ---------- On page load ----------
const savedDraft = localStorage.getItem("draft");
if (savedDraft !== null) {
  noteText.value = savedDraft;
}
applyTheme(localStorage.getItem("theme") || "light");
updateCounts();
