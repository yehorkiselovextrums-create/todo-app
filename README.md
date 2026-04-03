# Todo App

Full-stack todo application with Node.js, Express, and PostgreSQL.

## Features
- Create, read, update, and delete todos
- Mark todos as complete/incomplete
- Real-time UI updates
- Responsive design
- PostgreSQL database persistence
- RESTful API

## API Endpoints

### GET /api/todos
Fetch all todos.

### POST /api/todos
Create a new todo. Request body: {"title": "...", "description": "..."}

### PUT /api/todos/:id
Update a todo.

### DELETE /api/todos/:id
Delete a todo.

## Installation

1. npm install
2. Set up PostgreSQL
3. Configure .env file
4. npm start

## Deployment

Deploy to Railway with PostgreSQL support.