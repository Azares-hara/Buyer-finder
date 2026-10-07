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
  California: ["Adelanto", "Agoura Hills", "Alameda", "Alamo", "Albany", "Alhambra", "Aliso Viejo", "Alondra Park", "Alpine", "Alta Sierra", "Altadena", "Alum Rock", "American Canyon", "Anaheim", "Anderson", "Antioch", "Apple Valley", "Aptos", "Arcadia", "Arcata", "Arden-Arcade", "Arroyo Grande", "Artesia", "Arvin", "Ashland", "Atascadero", "Atherton", "Atwater", "Auburn", "August", "Avenal", "Avocado Heights", "Azusa", "Bakersfield", "Baldwin Park", "Banning", "Barstow", "Bay Point", "Baywood-Los Osos", "Beaumont", "Bell", "Bell Gardens", "Bellflower", "Belmont", "Benicia", "Berkeley", "Bermuda Dunes", "Beverly Hills", "Blackhawk-Camino Tassajara", "Bloomington", "Blythe", "Bonadelle Ranchos-Madera Ranchos", "Bonita", "Bostonia", "Boyes Hot Springs", "Brawley", "Brea", "Brentwood", "Buena Park", "Burbank", "Burlingame", "Calabasas", "Calexico", "California City", "Calimesa", "Calipatria", "Camarillo", "Cambria", "Cameron Park", "Camp Pendleton North", "Camp Pendleton South", "Campbell", "Canyon Lake", "Capitola", "Carlsbad", "Carmichael", "Carpinteria", "Carson", "Casa de Oro-Mount Helix", "Castro Valley", "Castroville", "Cathedral City", "Ceres", "Cerritos", "Charter Oak", "Cherryland", "Chico", "Chino", "Chino Hills", "Chowchilla", "Chula Vista", "Citrus", "Citrus Heights", "Claremont", "Clayton", "Clearlake", "Cloverdale", "Clovis", "Coachella", "Coalinga", "Colton", "Commerce", "Compton", "Concord", "Corcoran", "Corning", "Corona", "Coronado", "Corte Madera", "Costa Mesa", "Cotati", "Coto de Caza", "Country Club", "Covina", "Crestline", "Cudahy", "Culver City", "Cupertino", "Cypress", "Daly City", "Dana Point", "Danville", "Davis", "Del Aire", "Delano", "Delhi", "Desert Hot Springs", "Diamond Bar", "Dinuba", "Discovery Bay", "Dixon", "Downey", "Duarte", "Dublin", "Earlimart", "East Compton", "East Foothills", "East Hemet", "East La Mirada", "East Los Angeles", "East Palo Alto", "East Pasadena", "East Porterville", "East San Gabriel", "El Cajon", "El Centro", "El Cerrito", "El Dorado Hills", "El Monte", "El Paso de Robles", "El Rio", "El Segundo", "El Sobrante", "Elk Grove", "Emeryville", "Encinitas", "Escondido", "Eureka", "Exeter", "Fair Oaks", "Fairfax", "Fairfield", "Fairview", "Fallbrook", "Farmersville", "Fillmore", "Florence-Graham", "Florin", "Folsom", "Fontana", "Foothill Farms", "Foothill Ranch", "Fort Bragg", "Fortuna", "Foster City", "Fountain Valley", "Fremont", "Fresno", "Fullerton", "Galt", "Garden Acres", "Garden Grove", "Gardena", "Gilroy", "Glen Avon", "Glendale", "Glendora", "Gold River", "Golden Hills", "Goleta", "Gonzales", "Grand Terrace", "Granite Bay", "Grass Valley", "Greenfield", "Grover Beach", "Hacienda Heights", "Half Moon Bay", "Hanford", "Hawaiian Gardens", "Hawthorne", "Hayward", "Healdsburg", "Hemet", "Hercules", "Hermosa Beach", "Hesperia", "Highland", "Hillsborough", "Hollister", "Home Gardens", "Huntington Beach", "Huntington Park", "Huron", "Imperial", "Imperial Beach", "Indio", "Inglewood", "Interlaken", "Ione", "Irvine", "Isla Vista", "Kentfield", "Kerman", "King City", "Kingsburg", "La Canada Flintridge", "La Crescenta-Montrose", "La Habra", "La Mesa", "La Mirada", "La Palma", "La Presa", "La Puente", "La Quinta", "La Riviera", "La Verne", "Ladera Heights", "Lafayette", "Laguna", "Laguna Beach", "Laguna Hills", "Laguna Niguel", "Laguna West-Lakeside", "Laguna Woods", "Lake Arrowhead", "Lake Elsinore", "Lake Forest", "Lake Los Angeles", "Lakeside", "Lakewood", "Lamont", "Lancaster", "Larkfield-Wikiup", "Larkspur", "Lathrop", "Lawndale", "Lemon Grove", "Lemoore", "Lennox", "Lincoln", "Linda", "Lindsay", "Live Oak", "Livermore", "Livingston", "Lodi", "Loma Linda", "Lomita", "Lompoc", "Long Beach", "Loomis", "Los Alamitos", "Los Altos", "Los Altos Hills", "Los Angeles", "Los Banos", "Los Gatos", "Lucas Valley-Marinwood", "Lynwood", "Madera", "Madera Acres", "Magalia", "Malibu", "Mammoth Lakes", "Manhattan Beach", "Manteca", "Marina", "Marina del Rey", "Martinez", "Marysville", "Maywood", "McFarland", "McKinleyville", "Mendota", "Menlo Park", "Mentone", "Merced", "Mill Valley", "Millbrae", "Milpitas", "Mira Loma", "Mira Monte", "Mission Viejo", "Modesto", "Monrovia", "Montclair", "Montebello", "Montecito", "Monterey", "Monterey Park", "Moorpark", "Moraga", "Moreno Valley", "Morgan Hill", "Morro Bay", "Mountain View", "Murrieta", "Muscoy", "Napa", "National City", "Newark", "Newman", "Newport Beach", "Nipomo", "Norco", "North Auburn", "North Fair Oaks", "North Highlands", "Norwalk", "Novato", "Oakdale", "Oakland", "Oakley", "Oceano", "Oceanside", "Oildale", "Ojai", "Olivehurst", "Ontario", "Opal Cliffs", "Orange", "Orange Cove", "Orangevale", "Orcutt", "Orinda", "Orland", "Orosi", "Oroville", "Oroville East", "Oxnard", "Pacific Grove", "Pacifica", "Palm Desert", "Palm Springs", "Palmdale", "Palo Alto", "Palos Verdes Estates", "Paradise", "Paramount", "Parkway-South Sacramento", "Parlier", "Pasadena", "Patterson", "Pedley", "Perris", "Petaluma", "Pico Rivera", "Piedmont", "Pinole", "Pismo Beach", "Pittsburg", "Placentia", "Placerville", "Pleasant Hill", "Pleasanton", "Pomona", "Port Hueneme", "Porterville", "Portola Hills", "Poway", "Prunedale", "Quartz Hill", "Ramona", "Rancho Cordova", "Rancho Cucamonga", "Rancho Mirage", "Rancho Palos Verdes", "Rancho San Diego", "Rancho Santa Margarita", "Red Bluff", "Redding", "Redlands", "Redondo Beach", "Redwood City", "Reedley", "Rialto", "Richmond", "Ridgecrest", "Rio del Mar", "Rio Linda", "Ripon", "Riverbank", "Riverside", "Rocklin", "Rodeo", "Rohnert Park", "Rolling Hills Estates", "Rosamond", "Rosedale", "Roseland", "Rosemead", "Rosemont", "Roseville", "Rossmoor", "Rowland Heights", "Rubidoux", "Sacramento", "Salida", "Salinas", "San Anselmo", "San Bernardino", "San Bruno", "San Buenaventura", "San Carlos", "San Clemente", "San Diego", "San Diego Country Estates", "San Dimas", "San Fernando", "San Francisco", "San Gabriel", "San Jacinto", "San Jose", "San Juan Capistrano", "San Leandro", "San Lorenzo", "San Luis Obispo", "San Marcos", "San Marino", "San Mateo", "San Pablo", "San Rafael", "San Ramon", "Sanger", "Santa Ana", "Santa Barbara", "Santa Clara", "Santa Clarita", "Santa Cruz", "Santa Fe Springs", "Santa Maria", "Santa Monica", "Santa Paula", "Santa Rosa", "Santee", "Saratoga", "Sausalito", "Scotts Valley", "Seal Beach", "Seaside", "Sebastopol", "Selma", "Shafter", "Shasta Lake", "Sierra Madre", "Signal Hill", "Simi Valley", "Solana Beach", "Soledad", "Sonoma", "South El Monte", "South Gate", "South Lake Tahoe", "South Oroville", "South Pasadena", "South San Francisco", "South San Gabriel", "South San Jose Hills", "South Whittier", "South Yuba City", "Spring Valley", "Stanford", "Stanton", "Stockton", "Suisun City", "Sun City", "Sunnyvale", "Susanville", "Taft", "Tamalpais-Homestead Valley", "Tehachapi", "Temecula", "Temple City", "Thermalito", "Thousand Oaks", "Tiburon", "Torrance", "Tracy", "Truckee", "Tulare", "Turlock", "Tustin", "Tustin Foothills", "Twentynine Palms", "Twentynine Palms Base", "Ukiah", "Union City", "Upland", "Vacaville", "Valinda", "Valle Vista", "Vallejo", "Valley Center", "Vandenberg AFB", "Victorville", "View Park-Windsor Hills", "Vincent", "Vineyard", "Visalia", "Vista", "Walnut", "Walnut Creek", "Walnut Park", "Wasco", "Waterford", "Watsonville", "West Athens", "West Carson", "West Covina", "West Hollywood", "West Modesto", "West Puente Valley", "West Sacramento", "West Whittier-Los Nietos", "Westlake Village", "Westminster", "Westmont", "Whittier", "Wildomar", "Willowbrook", "Willows", "Windsor", "Winter Gardens", "Winters", "Winton", "Woodcrest", "Woodlake", "Woodland", "Yorba Linda", "Yreka", "Yuba City", "Yucaipa", "Yucca Valley"],
  Florida: ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg"],
  "New York": ["New York City", "Buffalo", "Rochester", "Albany", "Yonkers"],
  Texas: ["Austin", "Houston", "Dallas", "San Antonio", "Fort Worth"],
  Washington: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue"]
};
Object.values(citiesByState).forEach(cities => {
cities.sort((a, b) => a.localeCompare(b));
});

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
  // Bulk-send bar injected once, above the results
  document.getElementById("results").innerHTML =
    `<div class="bulk-bar">
       <label><input type="checkbox" id="select-all" onchange="toggleAll(this.checked)" /> Select all</label>
       <button class="send-btn" id="bulk-btn" onclick="sendSelected()">Send Selected (0)</button>
       <span class="msg" id="bulk-msg"></span>
     </div>` +
    buyers
    .map(
      (b, i) => `
      <div class="buyer">
        <div class="buyer-head">
          <input type="checkbox" class="pick" id="pick-${i}" onchange="updateBulkCount()" />
          <div>
            <h3>${b.name}</h3>
            <div>${stars(b.rating)}</div>
          </div>
        </div>
        <p class="address"><i class="fa-solid fa-location-dot"></i> ${b.address}</p>
        ${
          b.website
            ? `<a class="site-link" href="${b.website}" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> Website</a>`
            : "<span></span>"
        }
        <div class="email-row">
          <input id="email-${i}" type="email" placeholder="Buyer email (from their site)" value="${b.email || ""}" oninput="buyers[${i}].email = this.value.trim()" />
          <button class="send-btn" id="btn-${i}" onclick="sendEmail(${i})">Send Pitch</button>
        </div>
        <p class="msg" id="msg-${i}"></p>
      </div>`
    )
    .join("");
}

async function sendEmail(i) {
  const to = (document.getElementById(`email-${i}`).value || "").trim();
  buyers[i].email = to;
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


// -- Bulk sending --
function selectedIndexes() {
  return buyers
    .map((b, i) => (document.getElementById(`pick-${i}`)?.checked ? i : -1))
    .filter((i) => i !== -1);
}

function updateBulkCount() {
  const btn = document.getElementById("bulk-btn");
  if (btn) btn.textContent = `Send Selected (${selectedIndexes().length})`;
}

function toggleAll(checked) {
  buyers.forEach((_, i) => {
    const cb = document.getElementById(`pick-${i}`);
    if (cb) cb.checked = checked;
  });
  updateBulkCount();
}

function buildPayload(i) {
  const b = buyers[i];
  return {
    to: (b.email || "").trim(),
    buyerName: b.name,
    sellerName: "Agatha S",
    item: document.getElementById("item").value.trim(),
    company: b.name,
    country: (b.address || "").split(",").pop().trim(),
    website: b.website || "",
    category: document.getElementById("item").value.trim(),
  };
}

async function sendSelected() {
  const idxs = selectedIndexes();
  const bulkMsg = document.getElementById("bulk-msg");
  const btn = document.getElementById("bulk-btn");

  if (!idxs.length) {
    bulkMsg.className = "msg err";
    bulkMsg.textContent = "Tick at least one buyer first.";
    return;
  }

  // Validate emails up front
  const bad = idxs.filter((i) => !buildPayload(i).to.includes("@"));
  if (bad.length) {
    bulkMsg.className = "msg err";
    bulkMsg.textContent = `${bad.length} selected buyer(s) are missing a valid email — fill those in first.`;
    return;
  }

  btn.disabled = true;
  bulkMsg.className = "msg";
  bulkMsg.textContent = `Sending 0 of ${idxs.length}...`;

  try {
    const res = await fetch("https://buyer-finder-pyoa.onrender.com/api/send-email-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pitches: idxs.map(buildPayload) }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Bulk send failed");

    // Mark each card with its individual result
    data.results.forEach((r, k) => {
      const msg = document.getElementById(`msg-${idxs[k]}`);
      if (!msg) return;
      if (r.status === "sent") {
        msg.className = "msg ok";
        msg.textContent = "Email sent!";
      } else {
        msg.className = "msg err";
        msg.textContent = r.status === "skipped" ? "Already pitched earlier — skipped." : (r.error || "Failed to send.");
      }
    });

    bulkMsg.className = "msg ok";
    bulkMsg.textContent = `Done — ${data.summary.sent} sent, ${data.summary.skipped} skipped (already pitched), ${data.summary.failed} failed.`;
  } catch (err) {
    bulkMsg.className = "msg err";
    bulkMsg.textContent = err.message || "Server error — try again.";
  } finally {
    btn.disabled = false;
  }
}
