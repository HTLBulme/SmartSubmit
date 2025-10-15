// frontend/js/register.js

const API_URL = "https://smartsubmit-backend.onrender.com"; // Replace with your actual backend URL

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const vorname = document.getElementById("vorname").value.trim();
  const nachname = document.getElementById("nachname").value.trim();
  const email = document.getElementById("email").value.trim();
  const passwort = document.getElementById("password").value.trim();
  const rolleId = parseInt(document.getElementById("rolle").value);

  try {
    const response = await fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vorname, nachname, email, passwort, rolleId }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert("Registration successful!");
      window.location.href = "login.html";
    } else {
      alert(data.message || "Registration failed.");
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("Server not reachable.");
  }
});
