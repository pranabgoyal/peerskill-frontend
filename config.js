// CONFIGURATION FILE
// ==================

// Automatic Environment Detection
// If running on localhost/127.0.0.1, use Local Backend.
// Otherwise (Vercel/Netlify), use Render Backend.

let API_BASE_URL = "http://localhost:5000"; // Default to Local

if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    // REPLACE THIS with your actual Render Backend URL after you deploy it!
    API_BASE_URL = "https://peerskill-backend.onrender.com";
}

// Global Export
window.API_BASE_URL = API_BASE_URL;

console.log(`%c [PeerSkill] Environment: ${window.location.hostname} | API: ${API_BASE_URL} `, "background: #222; color: #bada55");
