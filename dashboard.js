const TOKEN_KEY = "df_dashboard_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function saveToken() {
  const t = document.getElementById("token-input").value.trim();
  localStorage.setItem(TOKEN_KEY, t);
  load();
}

function esc(s) {
  return (s || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

async function load() {
  const token = getToken();
  const status = document.getElementById("status-line");
  const list = document.getElementById("reply-list");
  

  if (!token) {
    status.textContent = "Enter your dashboard token to view replies.";
    list.innerHTML = "";
    return;
  }

  try {
    // Replies
    const res = await fetch("/api/replies", { headers: { "x-dashboard-token": token } });
    if (res.status === 401) {
      status.textContent = "Invalid token. Check DASHBOARD_TOKEN in Render env vars.";
      list.innerHTML = "";
      return;
    }
    const replies = await res.json();
    document.getElementById("reply-count").textContent = replies.length;

    // Pitch count
    const pitchRes = await fetch("/api/pitches-count", { headers: { "x-dashboard-token": token } });
    const pitchesRes = await fetch("/api/pitches", {headers: { "x-dashboard-token": token }});
    const pitchData = await pitchRes.json();
    const pitches = await pitchesRes.json();
    console.log(pitches);
    document.getElementById("pitch-count").textContent = pitchData.count;

    
    const pitchList = document.getElementById("pitch-list");
 
    pitchList.innerHTML = pitches.map(p => `
<div class="reply-card">
<div class="from">${esc(p.company)}</div>
<div class="meta">
${esc(p.email)} ·
${new Date(p.sentAt).toLocaleString()}
</div>
<div class="subject">
${esc(p.subject)}
</div>
<div class="body">
Item: ${esc(p.item)}
</div>
</div>
`).join("");
    // Render replies
    if (!replies.length) {
      status.textContent = "No replies yet. They will appear here within seconds of a buyer responding.";
      list.innerHTML = "";
      return;
    }

    status.textContent = "Last updated " + new Date().toLocaleTimeString();
    list.innerHTML = replies.map((r, i) => `
      <div class="reply-card">
        <div class="from"><i class="fa-solid fa-user"></i> ${esc(r.from)}</div>
        <div class="meta">To: ${esc(Array.isArray(r.to) ? r.to.join(", ") : r.to)} &middot; ${new Date(r.date).toLocaleString()}</div>
        <div class="subject">${esc(r.subject)}</div>
        <div class="body" id="body-${i}">${esc(r.text || "(no text content)")}</div>
        <div class="reply-actions">
          ${r.html ? `<button class="html-btn" onclick="showHtml(${i})">Show formatted</button>` : ""}
          <button onclick="replyTo('${esc(r.from)}')"><i class="fa-solid fa-reply"></i> Reply</button>
        </div>
      </div>`).join("");
  } catch {
    status.textContent = "Could not reach the server. Is it running?";
  }
}

function showHtml(i) {
  fetch("/api/replies", { headers: { "x-dashboard-token": getToken() } })
    .then(r => r.json())
    .then(replies => {
      const el = document.getElementById("body-" + i);
      if (el && replies[i] && replies[i].html) el.innerHTML = replies[i].html;
    });
}

function replyTo(from) {
  window.open("https://mail.google.com/mail/?view=cm&to=" + encodeURIComponent(from), "_blank");
}

// Restore token input on load
document.getElementById("token-input").value = getToken();

// Refresh every 20 seconds
setInterval(load, 20000);
load();
