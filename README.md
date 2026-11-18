# Notes App

A simple, modern, and user-friendly Notes App that allows users to create, manage, and organize their notes in one place. Users can add new notes, edit existing notes, view saved notes, and delete notes whenever needed.

The application uses **MySQL** to store notes permanently, making them available even after restarting the server.

## Features

- **Add Notes:** Create new notes with titles and content.
- **View Notes:** Display all saved notes.
- **Edit Notes:** Update existing notes whenever required.
- **Delete Notes:** Remove notes that are no longer needed.
- **Persistent Storage:** Store notes in a MySQL database.
- **User-Friendly Interface:** Simple and clean design for easy note management.

## Technologies Used

| **Technology** | **Purpose** |
|---|---|
| HTML | Structure of the application |
| CSS | Styling and user interface |
| JavaScript | Frontend functionality |
| Node.js | Backend runtime |
| Express.js | Server and API development |
| MySQL | Database for storing notes |

## Project Structure

All files are maintained in a single folder.

```text
Notes-App/
│
├── index.html
├── style.css
├── script.js
├── server.js
├── package.json
├── package-lock.json
└── README.md
```

## Database

**Database Name:** `notes_db`

**Table Name:** `notes`

| **Column** | **Description** |
|---|---|
| id | Unique note ID |
| title | Title of the note |
| content | Note content |
| created_at | Note creation date and time |

## Installation and Setup

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Open the Project Folder

```bash
cd Notes-App
```

### 3. Create the MySQL Database

Open MySQL Workbench and execute:

```sql
CREATE DATABASE notes_db;
```

### 4. Configure Environment Variables

Create or update the `.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=notes_db
PORT=3000
```

Replace `your_mysql_password` with your own MySQL password.

### 5. Install Dependencies

```bash
npm install
```

### 6. Start the Application

```bash
npm start
```

### 7. Open in Browser

Visit:

```text
http://localhost:3000
```

## API Endpoints

| **Method** | **Endpoint** | **Description** |
|---|---|---|
| GET | `/api/notes` | Retrieve all notes |
| POST | `/api/notes` | Add a new note |
| PUT | `/api/notes/:id` | Update an existing note |
| DELETE | `/api/notes/:id` | Delete a note |

## How It Works

1. The user interacts with the Notes App through the frontend.
2. JavaScript sends requests to the Express.js backend.
3. The backend processes the requests and communicates with MySQL.
4. MySQL stores and retrieves the notes.
5. The updated notes are displayed on the website.

## Learning Outcomes

- Understanding frontend and backend integration.
- Building REST API endpoints using Express.js.
- Connecting a Node.js application to MySQL.
- Performing CRUD operations.
- Handling asynchronous JavaScript requests.
- Managing persistent data using a relational database.

## Project Type

Mini Project
