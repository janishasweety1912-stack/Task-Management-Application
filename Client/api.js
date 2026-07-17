const BASE_URL = "https://task-management-application-p1ew.onrender.com";

async function registerUser(userData) {
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
    });

    return response.json();
}

async function loginUser(userData) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
    });

    return response.json();
}

async function getTasks(token) {
    const response = await fetch(`${BASE_URL}/tasks`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return response.json();
}

async function createTask(task, token) {
    const response = await fetch(`${BASE_URL}/tasks`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(task)
    });

    return response.json();
}

async function updateTask(id, task, token) {
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(task)
    });

    return response.json();
}

async function deleteTaskAPI(id, token) {
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return response.json();
}