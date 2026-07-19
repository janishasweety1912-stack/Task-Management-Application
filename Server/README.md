TASK MANAGEMENT APPLICATION (TaskFlow)

A feature-rich task management web application with user authentication, productivity tools, and real-time tracking — built with vanilla HTML, CSS, and JavaScript.

---

🌐 LIVE DEMO

Frontend: task-management-application-jhiglqafx.vercel.app
Backend API: https://task-management-application-p1ew.onrender.com

---

✨ FEATURES

✅ Task Management
Add, edit, delete, and complete tasks
Undo delete with a 5-second snackbar
Drag & drop to reorder tasks
Bulk select and delete multiple tasks
Export tasks to CSV

🗂️ Organisation
Categories: Work, Personal, Shopping, Important
Priority Levels: Low, Medium, High
Due Dates: with overdue and due-today highlights
Filters: by category, status (All / Active / Completed), and search

👤 User Accounts
Register and login with email & password
JWT-based authentication
Edit profile (update username)
Logout

⏱️ Productivity Tools
Pomodoro Timer — 25/5/15 minute modes, start/pause/reset
Time Tracking — log minutes spent per task, view total time report
Focus Mode — hides sidebars for distraction-free work
Quick Notes — persistent notepad saved to localStorage

📊 Analytics & Insights
Live progress ring (% tasks completed)
Task stats: Total / Done / Remaining
Analytics modal with category breakdown
Daily report
Calendar widget with task indicators
Due Today & Recent Activity widgets

🏆 Gamification
Streak tracking — daily completion streak
Achievements/Badges — First Step, Getting Started, Half Century, On Fire, Perfectionist
Confetti celebration when a badge is earned

🎨 UI & Experience
Dark / Light theme toggle (persisted)
Keyboard shortcuts (see below)
Sound effects on complete and delete
Toast notifications
Floating quick-add button
Greeting based on time of day

⌨️ Keyboard Shortcuts
Shortcut	Action
Ctrl + N	Focus task input (new task)
Ctrl + F	Focus search bar
Ctrl + A	Select all tasks
Delete	Delete selected tasks
Esc	Close modal / clear selection / exit focus mode
Enter	Add task (from input field)

---

Task-Management-Application/
│
├── Client/                   # Frontend (hosted on Vercel)
│   ├── index.html            # Main app page
│   ├── login.html            # Login & Register page
│   ├── script.js             # Core app logic (tasks, UI, timer, etc.)
│   ├── api.js                # API helper functions (fetch wrappers)
│   ├── login.js              # Login/register form logic
│   └── style.css             # Stylesheet
│
└── Server/                   # Backend (hosted on Render)
    ├── server.js             # Entry point — Express app setup
    ├── config/
    │   └── db.js             # MongoDB connection
    ├── models/
    │   ├── User.js           # User schema (Mongoose)
    │   └── Task.js           # Task schema (Mongoose)
    ├── controllers/
    │   ├── authController.js # Register & login logic
    │   └── taskController.js # CRUD task logic
    ├── routes/
    │   ├── authRoutes.js     # /api/auth routes
    │   └── taskRoutes.js     # /api/tasks routes
    ├── middleware/
    │   └── authMiddleware.js # JWT verification middleware
    └── package.json          # Server dependencies

---

🔌 API REFERENCE
Base URL: https://task-management-application-p1ew.onrender.com

---

Auth

Method	Endpoint	     Description

POST	/auth/register	 Register a new user
POST	/auth/login	     Login and receive a JWT token

---

Tasks (requires Authorization: Bearer <token> header)

Method	Endpoint	Description

GET	    /tasks	    Get all tasks for the logged-in user
POST	/tasks	    Create a new task
PUT	    /tasks/:id	Update a task
DELETE	/tasks/:id	Delete a task

---

Task Object
{
  "title": "Buy groceries",
  "priority": "Medium",
  "category": "shopping",
  "dueDate": "2026-07-25"
}

---

🛠️ TECH STACK

Layer	    Technology

Frontend	HTML5, CSS3, Vanilla JavaScript
Backend	    Node.js, Express
Database	MongoDB (Mongoose)
Auth	    JWT (JSON Web Tokens)
Hosting	    Render (backend)
Icons	    Font Awesome

---

📝 KNOWN NOTES

Tasks and settings (theme, notes, badges, streak) are stored in localStorage in addition to the database.
Time tracking data is stored in localStorage only — it is not synced to the server.
Recurring tasks are managed client-side.