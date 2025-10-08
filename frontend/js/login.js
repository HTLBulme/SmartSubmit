// frontend/js/login.js

const API_URL = "https://smartsubmit-backend.onrender.com"; // Replace with your actual backend URL

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const passwort = document.getElementById("password").value.trim();

  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, passwort }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      localStorage.setItem("userEmail", data.data.user.email);
      localStorage.setItem("userName", data.data.user.vorname);
      window.location.href = "startsite.html";
    } else {
      alert(data.message || "Login failed.");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Server not reachable.");
  }
});
