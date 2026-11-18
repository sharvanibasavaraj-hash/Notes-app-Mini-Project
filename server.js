require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const { db, initializeDatabase } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || "change-this-secret-before-deployment",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

function loginRequired(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: "Please log in first." });
    }
    next();
}

// REGISTER
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password || password.length < 8) {
            return res.status(400).json({
                message: "Enter all details. Password must have at least 8 characters."
            });
        }

        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length) {
            return res.status(409).json({
                message: "Email already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const [result] = await db.query(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            [name.trim(), email.trim().toLowerCase(), hashedPassword]
        );

        req.session.user = {
            id: result.insertId,
            name: name.trim(),
            email: email.trim().toLowerCase()
        };

        res.status(201).json({ user: req.session.user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Registration failed." });
    }
});

// LOGIN
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email.trim().toLowerCase()]
        );

        if (!users.length ||
            !(await bcrypt.compare(password, users[0].password_hash))) {
            return res.status(401).json({
                message: "Incorrect email or password."
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({ message: "Login failed." });
            }

            req.session.user = {
                id: users[0].id,
                name: users[0].name,
                email: users[0].email
            };

            res.json({ user: req.session.user });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Login failed." });
    }
});

// CHECK LOGIN
app.get("/api/me", (req, res) => {
    res.json({ user: req.session.user || null });
});

// LOGOUT
app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out." });
    });
});

// GET NOTES
app.get("/api/notes", loginRequired, async (req, res) => {
    try {
        const [notes] = await db.query(
            "SELECT * FROM notes WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC",
            [req.session.user.id]
        );

        res.json({ notes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Could not load notes." });
    }
});

// ADD NOTE
app.post("/api/notes", loginRequired, async (req, res) => {
    try {
        const {
            title, content, category,
            is_private, is_pinned, is_favourite
        } = req.body;

        if (!title?.trim() || !content?.trim()) {
            return res.status(400).json({
                message: "Title and content are required."
            });
        }

        const [result] = await db.query(
            `INSERT INTO notes
            (user_id, title, content, category, is_private, is_pinned, is_favourite)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.session.user.id,
                title.trim(),
                content.trim(),
                category || "Personal",
                !!is_private,
                !!is_pinned,
                !!is_favourite
            ]
        );

        res.status(201).json({
            message: "Note added successfully.",
            id: result.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Could not save note." });
    }
});

// UPDATE NOTE
app.put("/api/notes/:id", loginRequired, async (req, res) => {
    try {
        const {
            title, content, category,
            is_private, is_pinned, is_favourite
        } = req.body;

        if (!title?.trim() || !content?.trim()) {
            return res.status(400).json({
                message: "Title and content are required."
            });
        }

        const [result] = await db.query(
            `UPDATE notes SET
            title=?, content=?, category=?,
            is_private=?, is_pinned=?, is_favourite=?
            WHERE id=? AND user_id=? AND is_deleted=0`,
            [
                title.trim(), content.trim(), category || "Personal",
                !!is_private, !!is_pinned, !!is_favourite,
                req.params.id, req.session.user.id
            ]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Note not found." });
        }

        res.json({ message: "Note updated successfully." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Could not update note." });
    }
});

// MOVE TO TRASH
app.patch("/api/notes/:id/trash", loginRequired, async (req, res) => {
    const [result] = await db.query(
        "UPDATE notes SET is_deleted=1 WHERE id=? AND user_id=?",
        [req.params.id, req.session.user.id]
    );

    if (!result.affectedRows) {
        return res.status(404).json({ message: "Note not found." });
    }

    res.json({ message: "Moved to trash." });
});

// RESTORE NOTE
app.patch("/api/notes/:id/restore", loginRequired, async (req, res) => {
    const [result] = await db.query(
        "UPDATE notes SET is_deleted=0 WHERE id=? AND user_id=?",
        [req.params.id, req.session.user.id]
    );

    if (!result.affectedRows) {
        return res.status(404).json({ message: "Note not found." });
    }

    res.json({ message: "Note restored." });
});

// PERMANENT DELETE
app.delete("/api/notes/:id", loginRequired, async (req, res) => {
    const [result] = await db.query(
        "DELETE FROM notes WHERE id=? AND user_id=? AND is_deleted=1",
        [req.params.id, req.session.user.id]
    );

    if (!result.affectedRows) {
        return res.status(404).json({ message: "Note not found in trash." });
    }

    res.json({ message: "Note permanently deleted." });
});

// SERVE FRONTEND FROM THE SAME FOLDER
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

async function startServer() {
    try {
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`Notes App running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Database connection failed:", error.message);
    }
}

startServer();