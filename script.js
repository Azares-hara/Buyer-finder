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

//city dropdown
const citiesByState = {
  Alabama: ["Birmingham", "Montgomery", "Mobile", "Huntsville", "Tuscaloosa"],
  Alaska: ["Anchorage", "Fairbanks", "Juneau", "Sitka", "Ketchikan"],
  Arizona: ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale"],
  California: ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose", "Albany", "Alondra Park", "Alhambra", "Aliso Viejo","Adelanto", "Agoura Hills", "Alameda", "Alamo", "Alpine", "Alta Sierra", "Alum Rock", "American Canyon", "Anderson", "Antioch", "Apple Valley", "Aptos", "Arcadia", "Arcata", "Arden-Arcade", "Arroyo Grande", "Fresno", "Bakersfield", "Riverside", "Santa Ana", "Oakland", "Long Beach", "Anaheim", "Bay Point", "Baywood-Los Osos", "Beaumont", "Capitola"],
  Florida: ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg"],
  "New York": ["New York City", "Buffalo", "Rochester", "Albany", "Yonkers"],
  Texas: ["Austin", "Houston", "Dallas", "San Antonio", "Fort Worth"],
  Washington: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue"]
};

document.getElementById("state").addEventListener("change", function() {
  const state = this.value;
  const citySelect = document.getElementById("city");
  citySelect.innerHTML = '<option value="">Select a city</option>';
  if (citiesByState[state]) {
    citiesByState[state].forEach(city => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      citySelect.appendChild(opt);
    });
  }
});


function stars(rating) {
  if (rating == null) return "Not rated yet";
  const full = Math.round(rating);
  return '<span class="stars">' + '<i class="fa-solid fa-star"></i>'.repeat(full) + "</span> " + rating.toFixed(1);
}

async function search() {
  const item = document.getElementById("item").value.trim();
  const state = document.getElementById("state").value;
  const city = document.getElementById("city").value;
  const status = document.getElementById("status");
  const results = document.getElementById("results");

  if (!item || !state || !city) {
    status.textContent = "Please enter what you sell, select a state, and choose a city.";
    return;
  }

  status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching for buyers...';
  results.innerHTML = "";
  buyers = [];

  try {
    const res = await fetch(
      "https://buyer-finder-pyoa.onrender.com/api/find-buyers?item=" +
        encodeURIComponent(item) +
        "&city=" +
        encodeURIComponent(city + " " + state)
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
    status.textContent = "Something went wrong. Is the server running?";
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

  const company = buyers[i].name;
  const country = buyers[i].address.split(",").pop().trim();
  const website = buyers[i].website || "";
  const category = item;

  btn.disabled = true;
  msg.className = "msg";
  msg.textContent = "Sending...";

  try {
    const res = await fetch("https://buyer-finder-pyoa.onrender.com/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        buyerName: buyers[i].name,
        sellerName: "Agatha S",
        item,
        company,
        country,
        website,
        category
      }),
    });

    const result = await res.json();
    if (result.success) {
      msg.className = "msg ok";
      msg.textContent = "Email sent!";
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
