let currentUser = null;
let notes = [];
let editingId = null;

const $ = id => document.getElementById(id);

// API CONNECTION
async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

// MESSAGE
function toast(message) {
    const box = $("toast");
    box.textContent = message;
    box.classList.add("show");

    setTimeout(() => {
        box.classList.remove("show");
    }, 2500);
}

// LOGIN / REGISTER TABS
$("loginTab").onclick = () => showAuth("login");
$("registerTab").onclick = () => showAuth("register");

function showAuth(mode) {
    $("loginBox").classList.toggle("hidden", mode !== "login");
    $("registerBox").classList.toggle("hidden", mode !== "register");

    $("loginTab").classList.toggle("active", mode === "login");
    $("registerTab").classList.toggle("active", mode === "register");

    $("authMessage").textContent = "";
}

function showDashboard() {
    $("authPage").classList.add("hidden");
    $("appPage").classList.remove("hidden");

    $("profileName").textContent = currentUser.name;
    $("profileEmail").textContent = currentUser.email;
    $("avatar").textContent = currentUser.name[0].toUpperCase();

    loadNotes();
}

// REGISTER
$("registerForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    try {
        const data = await api("/api/register", {
            method: "POST",
            body: JSON.stringify({
                name: $("registerName").value,
                email: $("registerEmail").value,
                password: $("registerPassword").value
            })
        });

        currentUser = data.user;
        showDashboard();

    } catch (error) {
        $("authMessage").textContent = error.message;
    }
});

// LOGIN
$("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    try {
        const data = await api("/api/login", {
            method: "POST",
            body: JSON.stringify({
                email: $("loginEmail").value,
                password: $("loginPassword").value
            })
        });

        currentUser = data.user;
        showDashboard();

    } catch (error) {
        $("authMessage").textContent = error.message;
    }
});

// LOGOUT
$("logoutButton").onclick = async function() {
    try {
        await api("/api/logout", { method: "POST" });
    } catch (error) {
        console.error(error);
    }

    currentUser = null;
    notes = [];

    $("appPage").classList.add("hidden");
    $("authPage").classList.remove("hidden");
    showAuth("login");
};

// NAVIGATION
document.querySelectorAll(".nav[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-goto]").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.goto);
    });
});

function openPage(page) {
    document.querySelectorAll(".content-page").forEach(section => {
        section.classList.remove("active");
    });

    document.querySelectorAll(".nav[data-page]").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    $(page + "Page").classList.add("active");

    const names = {
        home: "Overview",
        all: "All Notes",
        favourites: "Favourites",
        private: "Private Notes",
        trash: "Trash"
    };

    $("pageTitle").textContent = names[page];
    renderNotes();
}

// FETCH NOTES
async function loadNotes() {
    try {
        const data = await api("/api/notes");
        notes = data.notes;
        renderNotes();
    } catch (error) {
        toast(error.message);
    }
}

// SAFE TEXT DISPLAY
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// NOTE CARD
function createCard(note) {
    const colours = [
        "#a695e9",
        "#e6a2b8",
        "#e1bb72",
        "#86b7aa",
        "#91a9db"
    ];

    const accent = colours[Number(note.id) % colours.length];

    let actions = "";

    if (Number(note.is_deleted)) {
        actions = `
            <button onclick="restoreNote(${note.id})">Restore</button>
            <button onclick="permanentDelete(${note.id})">Delete forever</button>
        `;
    } else {
        actions = `
            <button onclick="editNote(${note.id})">Edit</button>
            <button onclick="moveToTrash(${note.id})">Delete</button>
        `;
    }

    const date = new Date(note.updated_at).toLocaleDateString();

    return `
        <article class="note-card" style="--accent:${accent}">
            <div class="note-top">
                <span class="category">${escapeHTML(note.category)}</span>

                <span class="note-flags">
                    ${Number(note.is_pinned) ? "📌 " : ""}
                    ${Number(note.is_favourite) ? "♥" : ""}
                    ${Number(note.is_private) ? "🔒" : ""}
                </span>
            </div>

            <h3>${escapeHTML(note.title)}</h3>

            <p>${escapeHTML(note.content)}</p>

            <div class="note-footer">
                <span>${date}</span>
                <div class="note-actions">${actions}</div>
            </div>
        </article>
    `;
}

// DISPLAY NOTES
function displayGrid(id, list, heading, message) {
    if (!list.length) {
        $(id).innerHTML = `
            <div class="empty">
                <h3>${heading}</h3>
                ${message}
            </div>
        `;
        return;
    }

    $(id).innerHTML = list.map(createCard).join("");
}

function renderNotes() {
    if (!currentUser) return;

    const active = notes.filter(note => !Number(note.is_deleted));
    const deleted = notes.filter(note => Number(note.is_deleted));

    $("totalCount").textContent = active.length;

    $("favouriteCount").textContent =
        active.filter(note => Number(note.is_favourite)).length;

    $("pinnedCount").textContent =
        active.filter(note => Number(note.is_pinned)).length;

    const recent = [...active]
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 3);

    displayGrid(
        "recentNotes",
        recent,
        "Your page is waiting",
        "Create your first note."
    );

    displayGrid(
        "allNotes",
        getFilteredNotes(),
        "No notes found",
        "Try another search or create a note."
    );

    displayGrid(
        "favouriteNotes",
        active.filter(note => Number(note.is_favourite)),
        "No favourites yet",
        "Mark a note as a favourite to see it here."
    );

    displayGrid(
        "privateNotes",
        active.filter(note => Number(note.is_private)),
        "Your private space is empty",
        "Create a private note."
    );

    displayGrid(
        "trashNotes",
        deleted,
        "Trash is empty",
        "Deleted notes will appear here."
    );
}

// SEARCH AND SORT
$("searchInput").addEventListener("input", () => {
    displayGrid(
        "allNotes",
        getFilteredNotes(),
        "No notes found",
        "Try another search."
    );
});

$("sortSelect").addEventListener("change", () => {
    displayGrid(
        "allNotes",
        getFilteredNotes(),
        "No notes found",
        "Create a note to get started."
    );
});

function getFilteredNotes() {
    let list = notes.filter(note => !Number(note.is_deleted));

    const query = $("searchInput").value.toLowerCase().trim();

    if (query) {
        list = list.filter(note =>
            (note.title + " " + note.content + " " + note.category)
                .toLowerCase()
                .includes(query)
        );
    }

    const sort = $("sortSelect").value;

    if (sort === "az") {
        list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "oldest") {
        list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
        list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }

    return list;
}

// OPEN NOTE EDITOR
$("topAddButton").onclick = () => openEditor();
$("heroAddButton").onclick = () => openEditor();
$("allAddButton").onclick = () => openEditor();
$("privateAddButton").onclick = () => openEditor(null, true);

function openEditor(note = null, makePrivate = false) {
    editingId = note ? note.id : null;

    $("modalTitle").textContent = note ? "Edit your note" : "Create a note";

    $("noteTitle").value = note ? note.title : "";
    $("noteContent").value = note ? note.content : "";
    $("noteCategory").value = note ? note.category : "Personal";

    $("privateCheck").checked = note
        ? Boolean(Number(note.is_private))
        : makePrivate;

    $("pinCheck").checked = note
        ? Boolean(Number(note.is_pinned))
        : false;

    $("favouriteCheck").checked = note
        ? Boolean(Number(note.is_favourite))
        : false;

    $("noteModal").classList.add("show");
    $("noteTitle").focus();
}

// CLOSE EDITOR
function closeEditor() {
    $("noteModal").classList.remove("show");
    $("noteForm").reset();
    editingId = null;
}

$("closeModal").onclick = closeEditor;
$("cancelModal").onclick = closeEditor;

// SAVE OR UPDATE
$("noteForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const noteData = {
        title: $("noteTitle").value.trim(),
        content: $("noteContent").value.trim(),
        category: $("noteCategory").value,
        is_private: $("privateCheck").checked,
        is_pinned: $("pinCheck").checked,
        is_favourite: $("favouriteCheck").checked
    };

    if (!noteData.title || !noteData.content) {
        toast("Enter both a title and content.");
        return;
    }

    try {
        if (editingId) {
            await api("/api/notes/" + editingId, {
                method: "PUT",
                body: JSON.stringify(noteData)
            });

            toast("Note updated!");
        } else {
            await api("/api/notes", {
                method: "POST",
                body: JSON.stringify(noteData)
            });

            toast("Note saved!");
        }

        closeEditor();
        await loadNotes();

    } catch (error) {
        toast(error.message);
    }
});

// EDIT
function editNote(id) {
    const note = notes.find(note => Number(note.id) === Number(id));

    if (note) {
        openEditor(note);
    }
}

// MOVE TO TRASH
async function moveToTrash(id) {
    if (!confirm("Move this note to trash?")) return;

    try {
        await api(`/api/notes/${id}/trash`, {
            method: "PATCH"
        });

        toast("Moved to trash.");
        await loadNotes();

    } catch (error) {
        toast(error.message);
    }
}

// RESTORE
async function restoreNote(id) {
    try {
        await api(`/api/notes/${id}/restore`, {
            method: "PATCH"
        });

        toast("Note restored.");
        await loadNotes();

    } catch (error) {
        toast(error.message);
    }
}

// PERMANENT DELETE
async function permanentDelete(id) {
    if (!confirm("Permanently delete this note?")) return;

    try {
        await api(`/api/notes/${id}`, {
            method: "DELETE"
        });

        toast("Note permanently deleted.");
        await loadNotes();

    } catch (error) {
        toast(error.message);
    }
}

// DARK MODE
$("themeButton").onclick = () => {
    document.body.classList.toggle("dark");

    localStorage.setItem(
        "notelyTheme",
        document.body.classList.contains("dark") ? "dark" : "light"
    );
};

if (localStorage.getItem("notelyTheme") === "dark") {
    document.body.classList.add("dark");
}

// START APPLICATION
async function initializeApp() {
    try {
        const data = await api("/api/me");

        if (data.user) {
            currentUser = data.user;
            showDashboard();
        } else {
            $("authPage").classList.remove("hidden");
            $("appPage").classList.add("hidden");
        }
    } catch (error) {
        $("authPage").classList.remove("hidden");
        $("appPage").classList.add("hidden");
        $("authMessage").textContent = "Cannot connect to the server.";
    }
}

initializeApp();