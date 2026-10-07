
const fs = require("fs");
const PITCHES_FILE = "./pitches.json";

function loadPitches() {
  try {
    return JSON.parse(fs.readFileSync(PITCHES_FILE, "utf8"));
  } catch {
    return [];
  }
}

function savePitch(pitch) {
  const pitches = loadPitches();
  pitches.unshift(pitch);
  fs.writeFileSync(PITCHES_FILE, JSON.stringify(pitches, null, 2));
}

require("dotenv").config();
const express = require("express");
const path = require("path");
const { Resend } = require("resend");

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

let events = [];
let replies = [];
let pitchesSent = 0; 

app.use(express.json());

//innbound email webhook
app.post("/api/inbound-email", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const event = resend.webhooks.verify({
      payload: req.body.toString("utf8"),
      headers: {
        id: req.headers["svix-id"],
        timestamp: req.headers["svix-timestamp"],
        signature: req.headers["svix-signature"],
      },
      secret: process.env.RESEND_WEBHOOK_SECRET,
    });

    if (event.type !== "email.received") {
      return res.sendStatus(200);
    }

    let email;
    try {
      const { data, error } = await resend.emails.receiving.get(event.data.email_id);
      if (error) throw new Error(error.message);
      email = data;
    } catch (err) {
      console.error("Failed to fetch email body:", err);
      return res.sendStatus(200);
    }

    const attachments = [];
    if (event.data.attachments?.length) {
      try {
        const { data: attList } = await resend.emails.receiving.attachments.list({
          emailId: event.data.email_id,
        });
        for (const att of attList?.data || []) {
          try {
            const r = await fetch(att.download_url);
            const buf = Buffer.from(await r.arrayBuffer());
            attachments.push({ filename: att.filename, content: buf.toString("base64") });
          } catch (err) {
            console.error("Attachment fetch failed:", att.filename, err);
          }
        }
      } catch (err) {
        console.error("Attachment list failed:", err);
      }
    }

    try {
      await resend.emails.send({
        from: "Out There Exports <export@outthereexports.xyz>",
        to: ["exportindia2026us@gmail.com"],
        reply_to: event.data.from,
        subject: `Fwd: ${event.data.subject}`,
        html: email.html,
        text: email.text,
        attachments,
        headers: {
          "In-Reply-To": event.data.message_id,
          "References": event.data.message_id,
        },
      });
    } catch (err) {
      console.error("Forwarding failed:", err);
    }

    events.push({ type: "forwarded", from: event.data.from, subject: event.data.subject, at: new Date().toISOString() });
    replies.unshift({
      from: event.data.from,
      to: event.data.to,
      subject: event.data.subject,
      text: email.text,
      html: email.html,
      date: event.created_at || new Date().toISOString(),
      messageId: event.data.message_id,
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("Inbound webhook verification error:", err);
    res.sendStatus(200);
  }
});

//replies endpoint
app.get("/api/replies", (req, res) => {
  if (req.headers["x-dashboard-token"] !== process.env.DASHBOARD_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json(replies);
});

//Pitch count endpoint
app.get("/api/pitches-count", (req, res) => {
  if (req.headers["x-dashboard-token"] !== process.env.DASHBOARD_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ count: pitchesSent });
});

//frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.use(express.static(__dirname));

//Cities by state
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

//Google Places API
async function findBuyers(item, city) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.rating",
    },
    body: JSON.stringify({ textQuery: `${item} stores in ${city}`, maxResultCount: 10 }),
  });

  if (!response.ok) throw new Error(`Google API error: ${response.status}`);
  const data = await response.json();
  return (data.places || []).map((p) => ({
    name: p.displayName?.text || "Unknown",
    address: p.formattedAddress || "",
    website: p.websiteUri || "",
    rating: p.rating || null,
  }));
}


app.get("/api/find-buyers", async (req, res) => {
  const { item } = req.query;
  const state = req.query.state || req.query.city;
  if (!item || !state) return res.status(400).json({ error: "Missing item or state" });

  try {
    const cities = citiesByState[state] || [state];
    let allBuyers = [];

    for (const city of cities) {
      const buyers = await findBuyers(item, `${city} ${state}`);
      allBuyers.push(...buyers);
    }
    const unique = [...new Map(allBuyers.map(b => [b.name, b])).values()];
    res.json(unique);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

function buildPitchEmail({
  buyerName,
  sellerName,
  item,
  country,
  company,
  website,
  category
}) {
  return `
<p><b>Authentic Handmade Himalayan Singing Bowls<br>
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label</b></p>

<p>Dear ${buyerName || company} Team,</p>

<p>
We recently came across ${company} while researching businesses in ${country} that offer unique products and experiences to their customers.<br>
After exploring your website (${website || "N/A"}), we were impressed by the quality of your offerings and your commitment to serving your community with carefully selected products and services.
</p>

<p>
We are a Nepal-based manufacturer and exporter of authentic handmade Himalayan Singing Bowls crafted by skilled artisans using traditional techniques.
</p>

<p>We offer a range of products:</p>

<ul>
  <li>Handmade Himalayan Singing Bowls</li>
  <li>Full Moon Singing Bowls</li>
  <li>Antique Finish Singing Bowls</li>
  <li>Chakra Singing Bowl Sets</li>
  <li>Sound Healing Bowls & Meditation Tools</li>
  <li>Tingsha Cymbals & Meditation Accessories</li>
  <li>Private Label & Custom Logo Manufacturing</li>
</ul>

<p><b>Why Our Bowls Fit Your Store</b></p>

<ul>
  <li>Authentic handmade craftsmanship</li>
  <li>Ideal for meditation, yoga, sound healing and wellness retail</li>
  <li>OEM & Private Label options</li>
  <li>Worldwide shipping with dedicated export support</li>
</ul>

<p>
We believe our products would be a valuable addition to ${company}'s collection and resonate strongly with your customers.
</p>

<p>
We would be happy to share wholesale pricing, samples, and customization options.
</p>

<p>
<a href="https://drive.google.com/uc?export=download&id=15eZxHUjFMz0H-NrpRZWQkgScGRxqUGrR">
Download Singing Bowl Poster (PDF)
</a>
<br><br>
<a href="https://drive.google.com/uc?export=download&id=1pGJ-LaV5smg1ePTLSHDRbsWuX0KqXmyY">
Download Singing Bowl Presentation (PDF)
</a>
</p>

<p>
Kind Regards,<br>
${sellerName}<br>
Sales Executive<br>
${process.env.COMPANY_NAME}<br>
📧 exportindia2026us@gmail.com<br>
📱 ${process.env.SENDER_PHONE}
</p>

<p>
Thank you for your valuable time. We look forward to building a successful and long-term partnership with ${company}.
</p>
`;
}



app.post("/api/send-email", express.json(), async (req, res) => {
  const { to, buyerName, sellerName, item, country, company, website, category } = req.body;

  if (!to || !to.includes("@")) {
    return res.status(400).json({ error: "Valid buyer email required" });
  }

  try {
    await resend.emails.send({
      from: process.env.SENDER_EMAIL,
      to,
      reply_to: "export@outthereexports.xyz",
      subject: `Wholesale Product Supply Opportunity`,
      html: buildPitchEmail({ buyerName, sellerName, item, country, company, website, category })
    });
    savePitch({
  sentAt: new Date().toISOString(),
  buyerName,
  company,
  email: to,
  item,
  country,
  website,
  category,
  sellerName,
  subject: `Wholesale Product Supply Opportunity`
});
    pitchesSent++;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Email failed to send" });
  }
});

app.get("/api/pitches", (req, res) => {
if (req.headers["x-dashboard-token"] !== process.env.DASHBOARD_TOKEN) {
return res.status(401).json({ error: "Unauthorized" });
}
 
res.json(loadPitches());
});


//Bulk send
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.post("/api/send-email-bulk", express.json(), async (req, res) => {
  const { pitches } = req.body;
  if (!Array.isArray(pitches) || !pitches.length) {
    return res.status(400).json({ error: "pitches array required" });
  }
  if (pitches.length > 100) {
    return res.status(400).json({ error: "Max 100 emails per bulk send (Resend daily limit)" });
  }

  const alreadySent = new Set(loadPitches().map((p) => (p.email || "").toLowerCase()));
  const results = [];

  for (const p of pitches) {
    const to = (p.to || "").trim();
    const emailKey = to.toLowerCase();

    if (!to.includes("@")) {
      results.push({ status: "failed", error: "Invalid email" });
      continue;
    }
    if (alreadySent.has(emailKey)) {
      results.push({ status: "skipped", error: "Already pitched" });
      continue;
    }

    try {
      await resend.emails.send({
        from: process.env.SENDER_EMAIL,
        to,
        reply_to: "export@outthereexports.xyz",
        subject: `Home decor wholesale inquiry — ${p.item}`,
        html: buildPitchEmail(p),
      });
      savePitch({
        sentAt: new Date().toISOString(),
        buyerName: p.buyerName,
        company: p.company,
        email: to,
        item: p.item,
        country: p.country,
        website: p.website,
        category: p.category,
        sellerName: p.sellerName,
        subject: `Home decor wholesale inquiry — ${p.item}`,
        bulk: true,
      });
      alreadySent.add(emailKey);
      pitchesSent++;
      results.push({ status: "sent" });
    } catch (err) {
      console.error("Bulk send failed for", to, err);
      results.push({ status: "failed", error: "Email failed to send" });
    }

    await sleep(600);
  }

  res.json({
    results,
    summary: {
      sent: results.filter((r) => r.status === "sent").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
    },
  });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
