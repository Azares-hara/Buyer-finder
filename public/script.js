//Mobile menu 
document.getElementById("menu-open-button").onclick = () =>
  document.body.classList.add("show-mobile-menu");
document.getElementById("menu-close-button").onclick = () =>
  document.body.classList.remove("show-mobile-menu");
document.querySelectorAll(".nav-menu .nav-link").forEach((link) => {
  link.onclick = () => document.body.classList.remove("show-mobile-menu");
});

//Buyer search and email 
let buyers = [];

function stars(rating) {
  if (rating == null) return "Not rated yet";
  const full = Math.round(rating);
  return '<span class="stars">' + '<i class="fa-solid fa-star"></i>'.repeat(full) + "</span> " + rating.toFixed(1);
}

async function search() {
  const item = document.getElementById("item").value.trim();
  const state = document.getElementById("state").value;
  const status = document.getElementById("status");
  const results = document.getElementById("results");

  if (!item || !state) {
    status.textContent = "Please enter what you sell and select a state.";
    return;
  }

  status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching for buyers...';
  results.innerHTML = "";
  buyers = [];

  try {
    const res = await fetch(
      `/api/find-buyers?item=${encodeURIComponent(item)}&city=${encodeURIComponent(state)}`
    );
    if (!res.ok) throw new Error();
    buyers = await res.json();

    if (!buyers.length) {
      status.textContent = "No buyers found — try a different product or state.";
      return;
    }
    status.textContent = `Found ${buyers.length} potential buyers:`;
    render();
  } catch {
    status.textContent = "Something went wrong. Is the server running? (node server.js)";
  }
}

function render() {
  document.getElementById("results").innerHTML = buyers
    .map(
      (b, i) => `
      <div class="buyer">
        <div>
          <h3>${b.name}</h3>
          <div>${stars(b.rating)}</div>
        </div>
        <p class="address"><i class="fa-solid fa-location-dot"></i> ${b.address}</p>
        ${
          b.website
            ? `<a class="site-link" href="${b.website}" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> Website</a>`
            : "<span></span>"
        }
        <div class="email-row">
          <input id="email-${i}" type="email" placeholder="Buyer email (from their site)" />
          <button class="send-btn" id="btn-${i}" onclick="sendEmail(${i})">Send Pitch</button>
        </div>
        <p class="msg" id="msg-${i}"></p>
      </div>`
    )
    .join("");
}

async function sendEmail(i) {
  const to = document.getElementById(`email-${i}`).value.trim();
  const msg = document.getElementById(`msg-${i}`);
  const btn = document.getElementById(`btn-${i}`);
  const item = document.getElementById("item").value.trim();

  if (!to.includes("@")) {
    msg.className = "msg err";
    msg.textContent = "Enter a valid email first.";
    return;
  }

  btn.disabled = true;
  msg.className = "msg";
  msg.textContent = "Sending...";
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, buyerName: buyers[i].name, sellerName: "A Home Decor Seller", item }),
    });
    const result = await res.json();
    if (result.success) {
      msg.className = "msg ok";
      msg.textContent = "Email sent! Check spam folder too.";
    } else {
      msg.className = "msg err";
      msg.textContent = result.error || "Failed to send.";
      btn.disabled = false;
    }
  } catch {
    msg.className = "msg err";
    msg.textContent = "Server error — try again.";
    btn.disabled = false;
  }
}