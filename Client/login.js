// Redirect if already logged in
if (localStorage.getItem("token")) {
    window.location.href = "index.html";
}

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !email || !password) {
        showLoginError("Please fill all fields!");
        return false;
    }

    if (password.length < 4) {
        showLoginError("Password must be at least 4 characters!");
        return false;
    }

    try {
        // Try Login
        const response = await loginUser({
            email,
            password
        });
        alert("Login Successful!");
        if (!response.token) {
            const registerResponse = await registerUser({
                username,
                email,
                password
            });

            if (registerResponse.message !== "User registered successfully") {
                showLoginError(registerResponse.message);
                return false;
            }

            // Login again
            const loginAgain = await loginUser({
                email,
                password
            });

            if (!loginAgain.token) {
                showLoginError("Login failed.");
                return false;
            }

            finishLogin(loginAgain);

        } else {
            finishLogin(response);
        }

    } catch (err) {
        console.error(err);
        showLoginError("Server error. Please try again.");
    }

    return false;
}

function finishLogin(response) {

    localStorage.setItem("token", response.token);
    localStorage.setItem(
        "taskflowUser",
        JSON.stringify(response.user)
    );

    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#8b5cf6", "#f472b6", "#10b981", "#f59e0b"]
    });

    setTimeout(() => {
        showLoginSuccess(
            "Welcome " + response.user.username + "! 🎉"
        );
    }, 1000);

    setTimeout(() => {
        window.location.href = "index.html";
    }, 2000);
}

function showLoginError(message) {
    var error = document.getElementById("loginError");

    if (error) {
        error.textContent = message;
        error.style.display = "block";

        setTimeout(function () {
            error.style.display = "none";
        }, 3000);
    }
}

function showLoginSuccess(message) {
    var error = document.getElementById("loginError");

    if (error) {
        error.style.background = "#dcfce7";
        error.style.color = "#16a34a";
        error.textContent = message;
        error.style.display = "block";
    }
}