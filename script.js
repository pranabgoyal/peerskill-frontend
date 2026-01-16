// Peer-to-Peer Skill Exchange - Consolidated Frontend Script

// ================= CONSTANTS & GLOBALS =================
const AVATARS = [
  { img: "profile_pictures/Clove_icon.webp", sound: "avatar_sounds/Clove.mpeg" },
  { img: "profile_pictures/Iso_icon.webp", sound: "avatar_sounds/Iso.mpeg" },
  { img: "profile_pictures/Omen_icon.webp", sound: "avatar_sounds/Omen.mpeg" },
  { img: "profile_pictures/Phoenix_icon.webp", sound: "avatar_sounds/Phoenix.mpeg" },
  { img: "profile_pictures/Raze_icon.webp", sound: "avatar_sounds/Raze.mpeg" },
  { img: "profile_pictures/Reyna_icon.webp", sound: "avatar_sounds/Reyna.mpeg" },
  { img: "profile_pictures/bot.png", sound: "avatar_sounds/Bot.mp3" }
]

let currentAudio = null

// ================= MAIN ENTRY POINT =================
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = window.API_BASE_URL || "http://localhost:5000"

  // 1. Shared Init (Theme, Auth UI Check)
  setupThemeToggle()
  setupLogout()
  checkAuthState()

  // 2. Page Specific Init
  const page = detectPage()

  if (page === 'dashboard') {
    initDashboard(API_BASE_URL)
  } else if (page === 'admin') {
    initAdmin(API_BASE_URL)
  } else if (page === 'login') {
    initLogin(API_BASE_URL)
  } else if (page === 'signup') {
    initSignup(API_BASE_URL)
  } else if (page === 'edit-profile') {
    initEditProfile(API_BASE_URL)
  }

  // 3. Global Notification Polling (only if logged in)
  if (localStorage.getItem("userEmail")) {
    startNotificationPolling(localStorage.getItem("userEmail"))
  }
})

// ================= HELPER UTILS =================
function detectPage() {
  if (document.querySelector(".admin-container")) return 'admin'
  if (document.getElementById("dashName")) return 'dashboard'
  if (document.getElementById("loginForm")) return 'login'
  if (document.getElementById("signupForm")) return 'signup'
  if (document.querySelector("form[data-edit-profile]")) return 'edit-profile'
  return 'other'
}

function setupThemeToggle() {
  const savedTheme = localStorage.getItem("psx_theme")
  if (savedTheme === "dark") document.body.classList.add("dark")

  const toggle = document.querySelector(".theme-toggle")
  if (toggle) {
    toggle.addEventListener("click", () => {
      document.body.classList.toggle("dark")
      localStorage.setItem("psx_theme", document.body.classList.contains("dark") ? "dark" : "light")
    })
  }
}

function setupLogout() {
  const logoutBtn = document.querySelector(".logout-link")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault()
      if (confirm("Are you sure you want to logout?")) {
        localStorage.clear()
        window.location.href = "login.html"
      }
    })
  }
}

function checkAuthState() {
  const email = localStorage.getItem("userEmail")
  const isAdmin = localStorage.getItem("isAdmin") === "true"

  if (email || isAdmin) {
    // Hide Auth Links
    document.querySelectorAll(".nav a[href='login.html'], .nav a[href='signup.html']").forEach(el => el.style.display = 'none')

    // Update Hero actions
    const heroBtn = document.querySelector(".hero-actions")
    if (heroBtn) heroBtn.innerHTML = `<a href="${isAdmin ? 'admin.html' : 'dashboard.html'}" class="btn btn-primary">Go to Dashboard</a>`

    const ctaBtn = document.querySelector(".cta-final .btn")
    if (ctaBtn) {
      ctaBtn.href = isAdmin ? 'admin.html' : 'dashboard.html'
      ctaBtn.textContent = "Go to Your Dashboard"
    }
  }
}

function playSound(path) {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
  }
  currentAudio = new Audio(path)
  currentAudio.volume = 0.75
  currentAudio.play().catch(e => console.log("Audio play failed:", e))
}

function setupAvatarSelection(gridId, inputId, defaultVal) {
  const grid = document.getElementById(gridId)
  const input = document.getElementById(inputId)
  if (!grid || !input) return

  grid.innerHTML = ""
  if (!input.value && defaultVal) input.value = defaultVal

  AVATARS.forEach(item => {
    const img = document.createElement("img")
    img.src = item.img
    img.className = "avatar-option"
    if (input.value === item.img) img.classList.add("selected")

    img.onclick = () => {
      document.querySelectorAll(`#${gridId} .avatar-option`).forEach(el => el.classList.remove("selected"))
      img.classList.add("selected")
      input.value = item.img
      playSound(item.sound)
    }
    grid.appendChild(img)
  })
}

function setupTagSystem(containerId, inputId, tagsArray = null) {
  const container = document.getElementById(containerId)
  const input = document.getElementById(inputId)
  if (!container || !input) return

  const createTagUI = (text) => {
    const div = document.createElement("div")
    div.className = "tag"
    div.innerHTML = `${text} <span onclick="this.parentElement.remove()">×</span>` // Simplified remove
    return div
  }

  const addTag = (val) => {
    const cleanVal = val.trim()
    if (!cleanVal) return
    let exists = false
    container.querySelectorAll(".tag").forEach(t => {
      if (t.innerText.replace("×", "").trim().toLowerCase() === cleanVal.toLowerCase()) exists = true
    })
    if (exists) return
    container.insertBefore(createTagUI(cleanVal), input)
    if (tagsArray) tagsArray.push(cleanVal)
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault(); addTag(input.value); input.value = ""
    } else if (e.key === "Backspace" && !input.value) {
      if (container.querySelectorAll(".tag").length > 0) container.querySelector(".tag:last-of-type").remove()
    }
  })
  input.addEventListener("blur", () => { addTag(input.value); input.value = "" })

  return addTag
}

// ================= HELPER PROTOCOL =================
// Wrapper for Fetch to include Token and handle Expiry
function authFetch(url, options = {}) {
  const token = localStorage.getItem("token")
  const headers = options.headers || { "Content-Type": "application/json" }
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(url, { ...options, headers }).then(res => {
    // Auto-Logout on 401/403 (Invalid or Expired Token)
    if (res.status === 401 || res.status === 403) {
      // Clear Auth Data ONLY (Preserve Theme)
      localStorage.removeItem("token")
      localStorage.removeItem("userEmail")
      localStorage.removeItem("isAdmin")

      window.location.href = "login.html"
      return Promise.reject("Session Expired")
    }
    return res
  })
}

// ================= PAGE MODULES =================

function initDashboard(API_BASE_URL) {
  const userEmail = localStorage.getItem("userEmail")
  if (!userEmail) return window.location.href = "login.html"

  loadDashboardProfile(userEmail, API_BASE_URL)
  loadRecommendations(userEmail, API_BASE_URL)

  // Random Peers
  if (document.getElementById("randomPeersList")) fetchRandomPeers(userEmail, API_BASE_URL)

  // Community Requests
  if (document.getElementById("communityRequestsList")) loadCommunityRequests(API_BASE_URL)

  // Leaderboard
  if (document.getElementById("leaderboardList")) loadLeaderboard(API_BASE_URL)

  // Upcoming Sessions
  if (document.getElementById("upcomingList")) loadSessions(userEmail, API_BASE_URL)

  // Raise Token
  const raiseBtn = document.getElementById("raiseTokenBtn")
  if (raiseBtn) {
    raiseBtn.addEventListener("click", () => {
      const skill = document.getElementById("tokenInput").value
      if (!skill) return alert("Enter a skill")
      authFetch(`${API_BASE_URL}/request-skill`, {
        method: "POST", body: JSON.stringify({ email: userEmail, skill })
      }).then(res => res.json()).then(d => {
        if (d.status === 'ok') { alert("Request Posted!"); document.getElementById("tokenInput").value = "" }
        else alert("Failed")
      })
    })
  }

  // Search
  setupSearch(userEmail, API_BASE_URL)
}

function initAdmin(API_BASE_URL) {
  if (localStorage.getItem("isAdmin") !== "true") return window.location.href = "login.html"

  loadAdminUsers(API_BASE_URL)
  fetchAdminRequests(API_BASE_URL)
  fetchAdminSessions(API_BASE_URL)

  // Global scope for Admin ONCLICK
  window.updatePoints = (email, id) => {
    const pts = document.getElementById(`points-${id}`).value
    authFetch(`${API_BASE_URL}/admin/update-points`, {
      method: "POST", body: JSON.stringify({ email, points: pts })
    }).then(r => r.json()).then(d => d.status === 'ok' ? alert("Points Updated") : alert("Error"))
  }

  window.deleteUser = (email) => {
    if (confirm(`Delete ${email}?`)) {
      authFetch(`${API_BASE_URL}/admin/user`, {
        method: "DELETE", body: JSON.stringify({ email })
      }).then(r => r.json()).then(d => d.status === 'ok' ? location.reload() : alert("Error"))
    }
  }
}

function initLogin(API_BASE_URL) {
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault()
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    fetch(`${API_BASE_URL}/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password })
    }).then(res => res.json()).then(data => {
      if (data.status === "ok") {
        // STORE TOKEN
        if (data.token) localStorage.setItem("token", data.token)

        if (data.role === "admin") { localStorage.setItem("isAdmin", "true"); window.location.href = "admin.html" }
        else { localStorage.setItem("userEmail", data.email); window.location.href = "dashboard.html" }
      } else alert("Login failed")
    }).catch(e => alert("Login Error: " + e.message))
  })
}

function initSignup(API_BASE_URL) {
  setupAvatarSelection("signupAvatarGrid", "selectedAvatar", "profile_pictures/bot.png")
  setupTagSystem("teach-container", "teach-input")
  setupTagSystem("learn-container", "learn-input")

  // Play Bot sound
  setTimeout(() => playSound("avatar_sounds/Bot.mp3"), 500)

  document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault()
    // Gather Data
    const formData = {
      name: document.getElementById("name").value,
      email: e.target.elements["email"].value,
      contact: e.target.elements["contact"].value,
      password: e.target.elements["password"].value,
      studyYear: e.target.elements["studyYear"].value,
      branch: e.target.elements["branch"].value,
      avatar: document.getElementById("selectedAvatar").value,
      teach: Array.from(document.querySelectorAll("#teach-container .tag")).map(t => t.innerText.replace("×", "").trim()),
      learn: Array.from(document.querySelectorAll("#learn-container .tag")).map(t => t.innerText.replace("×", "").trim())
    }

    if (formData.teach.length === 0 || formData.learn.length === 0) return alert("Add skills!")

    fetch(`${API_BASE_URL}/signup`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData)
    }).then(async res => {
      if (res.ok) { localStorage.setItem("userEmail", formData.email); window.location.href = "dashboard.html" }
      else alert(await res.text())
    }).catch(() => alert("Signup Failed"))
  })
}

function initEditProfile(API_BASE_URL) {
  const userEmail = localStorage.getItem("userEmail")
  if (!userEmail) return window.location.href = "login.html"

  const addTeach = setupTagSystem("teach-container", "teach-input")
  const addLearn = setupTagSystem("learn-container", "learn-input")

  // Load Data
  authFetch(`${API_BASE_URL}/me`, { method: "POST", body: JSON.stringify({ email: userEmail }) })
    .then(res => res.json()).then(user => {
      if (user.error) return alert("Error loading profile")
      document.getElementById("editName").value = user.name || ""
      document.getElementById("editEmail").value = user.email || ""
      document.getElementById("editContact").value = user.contact || ""
      if (user.studyYear) document.getElementById("editYear").value = user.studyYear
      if (user.branch) document.getElementById("editBranch").value = user.branch

      if (user.teach) user.teach.forEach(t => addTeach(t))
      if (user.learn) user.learn.forEach(t => addLearn(t))

      setupAvatarSelection("editAvatarGrid", "selectedAvatar", user.avatar)
      if (user.avatar) {
        const sound = AVATARS.find(a => a.img === user.avatar)?.sound
        if (sound) setTimeout(() => playSound(sound), 500)
      }
    })

  document.querySelector("form[data-edit-profile]").addEventListener("submit", (e) => {
    e.preventDefault()
    const formData = {
      email: document.getElementById("editEmail").value,
      name: document.getElementById("editName").value,
      contact: document.getElementById("editContact").value,
      studyYear: document.getElementById("editYear").value,
      branch: document.getElementById("editBranch").value,
      avatar: document.getElementById("selectedAvatar").value,
      teach: Array.from(document.querySelectorAll("#teach-container .tag")).map(t => t.innerText.replace("×", "").trim()),
      learn: Array.from(document.querySelectorAll("#learn-container .tag")).map(t => t.innerText.replace("×", "").trim())
    }
    authFetch(`${API_BASE_URL}/update-profile`, {
      method: "POST", body: JSON.stringify(formData)
    }).then(r => r.json()).then(d => d.status === 'ok' ? window.location.href = "dashboard.html" : alert("Update Failed"))
  })
}

// ================= FETCH & LOGIC FUNCTIONS =================

function loadDashboardProfile(email, baseUrl) {
  authFetch(`${baseUrl}/me`, { method: "POST", body: JSON.stringify({ email }) })
    .then(r => r.json()).then(user => {
      if (user.error) return
      document.getElementById("dashName").textContent = user.name
      document.getElementById("dashMeta").textContent = `${user.studyYear || 'Student'} • ${user.branch || ''}`

      // Avatar
      const avatar = user.avatar || "profile_pictures/bot.png"
      let img = document.getElementById("dashAvatar")
      if (!img) {
        img = document.createElement("img"); img.id = "dashAvatar"; img.className = "profile-avatar-lg"; img.src = avatar
        document.querySelector(".profile-top").insertBefore(img, document.querySelector(".profile-top > div"))
      } else img.src = avatar

      // Points
      document.querySelectorAll("#dashBigPoints, #dashSmallPoints").forEach(el => el.textContent = user.skillPoints || 0)

      // Tags
      const fillTags = (id, tags) => {
        const c = document.getElementById(id)
        if (!c) return
        c.innerHTML = ""
        if (tags && tags.length) tags.forEach(t => { const s = document.createElement("span"); s.className = "profile-tag"; s.innerText = t; c.appendChild(s) })
        else c.innerHTML = "<span class='small-muted'>No skills</span>"
      }
      fillTags("teachTags", user.teach)
      fillTags("learnTags", user.learn)
    })
}

function loadRecommendations(email, baseUrl) {
  authFetch(`${baseUrl}/recommendations`, { method: "POST", body: JSON.stringify({ email }) })
    .then(r => r.json()).then(list => {
      const c = document.getElementById("recoContainer"); if (!c) return
      c.innerHTML = ""
      if (!list.length) return c.innerHTML = "<p>No matches yet.</p>"
      list.forEach(m => {
        const d = document.createElement("div")
        d.className = "peer-reco-row"
        d.innerHTML = `
               <img src="${m.avatar || 'profile_pictures/bot.png'}" class="peer-avatar-sm">
               <div class="peer-reco-main">
                 <div style="font-weight:600">${m.name}</div>
                 <div style="font-size:0.8rem; color:#666">Teaches: ${(m.teach || []).join(", ")}</div>
                 <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px">${m.studyYear || 'Student'} • ${m.branch || 'N/A'}</div>
               </div>
               <button class="btn btn-primary" style="margin-left:auto; padding:6px 12px; font-size:0.8rem; width:auto; border-radius:8px;" onclick="openScheduleModal('${m.email}','${m.name}')">Schedule</button>
            `
        c.appendChild(d)
      })
    })
}

function fetchRandomPeers(email, baseUrl) {
  authFetch(`${baseUrl}/peers/random`, { method: "POST", body: JSON.stringify({ email }) })
    .then(r => r.json()).then(list => renderPeers(list))
}

function renderPeers(list) {
  const c = document.getElementById("randomPeersList"); if (!c) return
  c.innerHTML = ""
  if (!list.length) return c.innerHTML = "<p>No peers found.</p>"
  list.forEach(p => {
    const d = document.createElement("div"); d.className = "peer-card"
    d.innerHTML = `
           <div class="peer-main" style="display:flex;align-items:center;gap:10px;flex:1">
             <img src="${p.avatar || 'profile_pictures/bot.png'}" class="peer-avatar-sm">
             <div><div class="peer-name">${p.name} <span style="font-size:0.8em">(${p.skillPoints} pts)</span></div>
             <div class="peer-skill" style="font-size:0.8rem">Teaches: ${(p.teach || []).slice(0, 2).join(", ")}</div></div>
           </div>
           <button class="btn btn-primary" onclick="openScheduleModal('${p.email}','${p.name}')">Connect</button>
        `
    c.appendChild(d)
  })
}

function loadCommunityRequests(baseUrl) {
  authFetch(`${baseUrl}/active-requests`).then(r => r.json()).then(reqs => {
    const c = document.getElementById("communityRequestsList"); if (!c) return
    c.innerHTML = ""
    if (!reqs.length) return c.innerHTML = "<p class='small-muted'>No requests.</p>"
    reqs.forEach(r => {
      const d = document.createElement("div"); d.className = "peer-card"; d.style.minHeight = "auto"
      d.innerHTML = `
              <div style="flex:1">
                 <div><strong>${r.skill}</strong></div>
                 <div class="small-muted">Requested by ${r.name}</div>
              </div>
              <button class="btn btn-secondary" style="font-size:0.8rem" onclick="openScheduleModal('${r.email}','${r.name}')">Teach</button>
            `
      c.appendChild(d)
    })
  })
}

function loadSessions(email, baseUrl) {
  authFetch(`${baseUrl}/my-sessions`, { method: "POST", body: JSON.stringify({ email }) })
    .then(r => r.json()).then(sessions => {
      const c = document.getElementById("upcomingList"); if (!c) return
      c.innerHTML = ""
      if (!sessions.length) return c.innerHTML = "<p class='small-muted'>No sessions.</p>"
      sessions.forEach(s => {
        const d = document.createElement("div"); d.className = "session-item"
        let btn = `<a href="${s.link}" target="_blank" class="btn btn-primary session-link">Join</a>`
        d.innerHTML = `
              <div class="session-info">
                 <div class="session-time">${s.dateTime}</div>
                 <div>${s.skill}</div>
              </div>
              ${btn}
            `
        c.appendChild(d)
      })
    })
}

function loadLeaderboard(baseUrl) {
  authFetch(`${baseUrl}/peers/leaderboard`).then(r => r.json()).then(list => {
    const c = document.getElementById("leaderboardList"); if (!c) return
    c.innerHTML = ""
    list.forEach((u, i) => {
      const d = document.createElement("div"); d.className = "leaderboard-item"
      d.innerHTML = `<div class="rank-badge rank-${i + 1}">${i + 1}</div>
            <img src="${u.avatar || 'profile_pictures/bot.png'}" class="leaderboard-avatar">
            <div class="rank-info"><span class="rank-name">${u.name}</span><span class="rank-points">${u.skillPoints} Pts</span></div>`
      c.appendChild(d)
    })
  })
}

function setupSearch(email, baseUrl) {
  const input = document.getElementById("peerSearch")
  if (!input) return
  let timer
  input.addEventListener("input", (e) => {
    clearTimeout(timer)
    const q = e.target.value.trim()
    timer = setTimeout(() => {
      if (!q) return fetchRandomPeers(email, baseUrl)
      authFetch(`${baseUrl}/peers/search`, { method: "POST", body: JSON.stringify({ email, query: q }) })
        .then(r => r.json()).then(d => renderPeers(d))
    }, 300)
  })
}

function animateValue(obj, start, end, duration) {
  if (!obj) return
  let startTimestamp = null
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp
    const progress = Math.min((timestamp - startTimestamp) / duration, 1)
    obj.innerHTML = Math.floor(progress * (end - start) + start)
    if (progress < 1) window.requestAnimationFrame(step)
    else obj.innerHTML = end
  }
  window.requestAnimationFrame(step)
}

// --- ADMIN FETCHERS ---
function loadAdminUsers(baseUrl) {
  authFetch(`${baseUrl}/admin/users`).then(r => r.json()).then(users => {
    if (!Array.isArray(users)) return
    document.getElementById("totalUsers").textContent = users.length
    const tbody = document.getElementById("userTableBody"); if (!tbody) return
    tbody.innerHTML = ""
    users.forEach(u => {
      const role = (u.email === "admin@peerskill.com" || u.role === 'admin') ? "Admin" : "Student"
      const action = role === 'Admin' ? '<span class="small-muted">N/A</span>' : `
      <div style="display:flex;gap:6px;align-items:center">
        <input type="number" id="points-${u._id}" value="${u.skillPoints || 0}" class="points-input">
        <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem" onclick="updatePoints('${u.email}','${u._id}')">✓</button>
        <button class="btn btn-danger" style="padding:4px 8px;font-size:0.8rem" onclick="deleteUser('${u.email}')">✕</button>
      </div>`

      tbody.innerHTML += `
      <tr>
        <td><img src="${u.avatar || 'profile_pictures/bot.png'}" class="table-avatar"></td>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td><span class="cat-pill" style="font-size:0.75rem;padding:4px 10px">${role}</span></td>
        <td style="font-weight:600;color:#059669">${u.skillPoints || 0}</td>
        <td>${action}</td>
      </tr>`
    })
  })
}

function fetchAdminRequests(baseUrl) {
  authFetch(`${baseUrl}/admin/requests`).then(r => r.json()).then(reqs => {
    if (!Array.isArray(reqs)) return
    document.getElementById("totalRequests").innerText = reqs.length
    const tb = document.querySelector("#requestsTable tbody"); if (tb) tb.innerHTML = reqs.map(r => `
    <tr>
      <td>${new Date(r.date).toLocaleDateString()}</td>
      <td>${r.name}</td>
      <td><strong>${r.skill}</strong></td>
      <td><span class="cat-pill" style="font-size:0.75rem">${r.status}</span></td>
    </tr>`).join("")
  })
}

function fetchAdminSessions(baseUrl) {
  authFetch(`${baseUrl}/admin/sessions`).then(r => r.json()).then(s => {
    if (!Array.isArray(s)) return
    document.getElementById("totalSessions").innerText = s.length
    const tb = document.querySelector("#sessionsTable tbody"); if (tb) tb.innerHTML = s.map(x => `
    <tr>
      <td>${x.dateTime}</td>
      <td><div style="font-size:0.85rem">${x.scheduler}<br><span style="color:#666">with ${x.peer}</span></div></td>
      <td><a href="${x.link}" target="_blank" class="btn btn-primary" style="padding:4px 10px;font-size:0.75rem">Join</a></td>
    </tr>`).join("")
  })
}

// --- NOTIFICATION POLLING ---
function startNotificationPolling(email) {
  const baseUrl = window.API_BASE_URL || "http://localhost:5000"
  const poll = () => {
    // Polling uses authFetch to ensure only valid users get notifications
    const token = localStorage.getItem("token")
    if (!token) return // Don't poll if no token

    fetch(`${baseUrl}/notifications`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ email }) })
      .then(r => r.json()).then(list => {
        if (list.length) {
          list.forEach(n => showToast(n.message))
          const ids = list.map(n => n._id)
          fetch(`${baseUrl}/notifications/mark-read`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ ids }) })
        }
      })
  }
  // Setup UI container
  if (!document.querySelector(".toast-container")) {
    const d = document.createElement("div"); d.className = "toast-container"; document.body.appendChild(d)
  }
  poll(); setInterval(poll, 30000)
}

function showToast(msg) {
  const c = document.querySelector(".toast-container"); if (!c) return
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg
  c.appendChild(t)
  setTimeout(() => { t.classList.add("hide"); setTimeout(() => t.remove(), 500) }, 5000)
}

// --- GLOBAL EXPORTS FOR HTML ONCLICK ---
window.openScheduleModal = (email, name) => {
  document.getElementById("modalPeerEmail").value = email
  document.getElementById("modalPeerName").value = name
  document.getElementById("scheduleModal").classList.add("active")
}
window.closeModal = () => document.getElementById("scheduleModal").classList.remove("active")
window.confirmSchedule = confirmSchedule

// --- RATINGS EXPORTS ---
window.openRatingModal = (email, name) => {
  // Only allow rating if we have a valid session? For now, open freely but backend checks logic.
  document.getElementById("ratePeerEmail").value = email
  document.getElementById("ratePeerName").innerText = name
  document.getElementById("ratingModal").classList.add("active")
}
window.closeRatingModal = () => document.getElementById("ratingModal").classList.remove("active")
window.setRating = (n) => {
  document.getElementById("selectedRating").value = n
  document.querySelectorAll(".star").forEach((s, i) => {
    s.classList.toggle("active", i < n)
  })
}
window.submitRating = () => {
  const email = document.getElementById("ratePeerEmail").value
  const rating = document.getElementById("selectedRating").value
  if (rating == 0) return alert("Select a star rating")

  authFetch(`${window.API_BASE_URL || "http://localhost:5000"}/rate-peer`, {
    method: "POST",
    body: JSON.stringify({ targetEmail: email, rating: parseInt(rating) })
  }).then(r => r.json()).then(d => {
    if (d.status === 'ok') { alert("Rating Submitted! +10 Points to Peer."); closeRatingModal() }
    else alert(d.error || "Error")
  })
}

function confirmSchedule() {
  const baseUrl = window.API_BASE_URL || "http://localhost:5000"
  const myEmail = localStorage.getItem("userEmail")
  const peerEmail = document.getElementById("modalPeerEmail").value
  const topic = document.getElementById("modalTopic").value
  const date = document.getElementById("modalDate").value
  const time = document.getElementById("modalTime").value
  const dateTime = `${date} at ${time}`

  if (!date || !time) return alert("Pick date/time")

  authFetch(`${baseUrl}/schedule-session`, {
    method: "POST",
    body: JSON.stringify({ scheduler: myEmail, peer: peerEmail, skill: topic, dateTime })
  }).then(r => r.json()).then(d => {
    if (d.status === 'ok') { alert("Scheduled!"); closeModal(); loadSessions(myEmail, baseUrl) }
    else alert("Error")
  })
}
