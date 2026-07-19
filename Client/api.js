const BASE_URL = "https://task-management-application-p1ew.onrender.com/api";

async function registerUser(userData) {
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
}

async function loginUser(userData) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
}

async function getTasks(token) {
    const response = await fetch(`${BASE_URL}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
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
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
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
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
}

async function deleteTaskAPI(id, token) {
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
}