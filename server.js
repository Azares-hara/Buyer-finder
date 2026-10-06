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
  California: ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose", "Albany", "Alondra Park", "Alhambra", "Aliso Viejo","Adelanto", "Agoura Hills", "Alameda", "Alamo", "Alpine", "Alta Sierra", "Alum Rock", "American Canyon", "Anderson", "Antioch", "Apple Valley", "Aptos", "Arcadia", "Arcata", "Arden-Arcade", "Arroyo Grande", "Atascadero", "Atherton", "August", "Fresno", "Bakersfield", "Banning", "Bell", "Bell Gardens", "Bellflower", "Belmont", "Benicia", "Berkeley", "Bermuda Dunes", "Beverly Hills", "Blackhawk-Camino Tassajara", "Bloomington", "Blythe", "Bonadelle Ranchos-Madera Ranchos", "Bostonia", "Boyes Hot Springs", "Brawley", "Brentwood", "Buena Park", "Burbank", "Burlingame", "California City", "Camarillo", "Campbell", "Canyon Lake", "Carlsbad", "Carpinteria", "Carson", "Casa de Oro-Mount Helix", "Castro Valley", "Coachella", "Coalinga", "Colton", "Commerce", "Concord", "Corcoran", "Corona", "Country Club", "Cudahy", "Delhi", "Desert Hot Springs", "Downey", "Dublin", "Riverside", "Santa Ana", "Oakland", "Long Beach", "Anaheim", "Bay Point", "Baywood-Los Osos", "Beaumont", "Capitola"],
  Florida: ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg"],
  "New York": ["New York City", "Buffalo", "Rochester", "Albany", "Yonkers"],
  Texas: ["Austin", "Houston", "Dallas", "San Antonio", "Fort Worth"],
  Washington: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue"]
};
Object.values(citiesByState).forEach(cities => {
cities.sort((a, b) => a.localeCompare(b));
});
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
      subject: `Home decor wholesale inquiry — ${item}`,
      html: `<p><b>Authentic Handmade Himalayan Singing Bowls<br>
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label</b></p>

<p>Dear ${buyerName} Team,</p>

<p>We were looking into wellness businesses in the ${country} and recently came across ${company}.<br>
Having browsed your website (${website}), we noticed your keen interest and strong focus on ${category} and we were impressed with your commitment to quality and customer experience.</p>

<p>We are a Nepal-based manufacturer and exporter of authentic handmade Himalayan Singing Bowls crafted by skilled artisans using traditional techniques.</p>

<p>We offer a range of products:</p>
<ul>
  <li>Handmade Himalayan Singing Bowls</li>
  <li>Full Moon Singing Bowls</li>
  <li>Antique Finish Singing Bowls</li>
  <li>Chakra Singing Bowl Sets</li>
  <li>Sound Healing Bowls & Meditation</li>
  <li>Tingsha Cymbals & Meditation Tools</li>
  <li>Private Label & Custom Logo Manufacturing</li>
</ul>

<p>Why Our Bowls Fit Your Store</p>
<ul>
  <li>Authentic handmade craftsmanship</li>
  <li>Great for meditation, yoga, sound healing & wellness retail</li>
  <li>OEM & Private Label options</li>
  <li>Worldwide shipping with dedicated export support</li>
</ul>

<p>We believe our products would make a great addition to ${company}’s current collection and resonate strongly with your customers in the ${country}.</p>

<p>Please find our attachments enclosed. We would be happy to share wholesale pricing, samples, and customization options.</p>
<p>
<a href="https://drive.google.com/uc?export=download&id=15eZxHUjFMz0H-NrpRZWQkgScGRxqUGrR">Singing bowl poster (PDF)</a><br>
<a href="https://drive.google.com/uc?export=download&id=1pGJ-LaV5smg1ePTLSHDRbsWuX0KqXmyY">Singing bowl presentation (PDF)</a>
</p>

<p>Kind Regards,<br>
${sellerName}<br>
Sales Executive<br>
${process.env.COMPANY_NAME}<br>
📧 exportindia2026us@gmail.com<br>
📱 ${process.env.SENDER_PHONE}</p>

<p>Thank you for your valuable time. We look forward to building a successful and long-term partnership with ${company}.</p>`
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
  subject: `Home decor wholesale inquiry — ${item}`
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

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
