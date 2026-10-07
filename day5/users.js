// ---------- Select elements ----------
const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

const API_URL = "https://jsonplaceholder.typicode.com/users";

// ---------- Data ----------
let users = [];

// ---------- Render ----------
function renderUsers(list) {
  usersList.textContent = "";

  if (list.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No users match your filter.";
    usersList.append(li);
    return;
  }

  for (const user of list) {
    const li = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const email = document.createElement("div");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("div");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("div");
    company.textContent = `Company: ${user.company.name}`;

    li.append(name, email, city, company);
    usersList.append(li);
  }
}

// ---------- Load ----------
async function loadUsers() {
  loadButton.disabled = true;
  statusMessage.textContent = "Loading users...";
  usersList.textContent = "";

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    users = await response.json();
    filterInput.value = "";
    renderUsers(users);
    statusMessage.textContent = `Loaded ${users.length} users.`;
  } catch (error) {
    users = [];
    statusMessage.textContent = `Error: could not load users (${error.message}).`;
  } finally {
    loadButton.disabled = false;
  }
}

// ---------- Filter (no new request) ----------
function filterUsers() {
  if (users.length === 0) {
    return;
  }
  const search = filterInput.value.trim().toLowerCase();
  const matches = users.filter((user) =>
    user.name.toLowerCase().includes(search)
  );
  renderUsers(matches);
}

// ---------- Events ----------
loadButton.addEventListener("click", loadUsers);
filterInput.addEventListener("input", filterUsers);

