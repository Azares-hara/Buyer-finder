
const fs = require("fs");
const PITCHES_FILE = "./pitches.json";

const UNSUB_FILE = "./unsubscribed.txt";

function loadUnsubscribed() {
  if (!fs.existsSync(UNSUB_FILE)) {
    return new Set();
  }

  return new Set(
    fs
      .readFileSync(UNSUB_FILE, "utf8")
      .split("\n")
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isUnsubscribed(email) {
  return loadUnsubscribed().has(email.toLowerCase());
}

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

//unsubscribe
app.post("/unsubscribe", express.urlencoded({ extended: false }), (req, res) => {
  const email = (req.body.List_Unsubscribe || "")
    .replace(/^mailto:/, "")
    .trim()
    .toLowerCase();

  if (email) {
    fs.appendFileSync(UNSUB_FILE, email + "\n");
  }

  res.status(200).send("Unsubscribed");
});

//Browser fallback
app.get("/unsubscribe", (req, res) => {
  const email = (req.query.email || "")
    .trim()
    .toLowerCase();

  if (email) {
    fs.appendFileSync(UNSUB_FILE, email + "\n");
  }

  res.send("You've been unsubscribed. Sorry to see you go!");
});

let events = [];
let replies = [];
//let pitchesSent = 0;

res.json({ count: loadPitches().length });

const DAILY_SEND_LIMIT = Number(process.env.DAILY_SEND_LIMIT || 25);
const PITCH_SUBJECT = "Handcrafted Singing Bowls \u2013 Wholesale Opportunity";

function sentToday() {
  const today = new Date().toISOString().slice(0, 10);
  return loadPitches().filter((p) => (p.sentAt || "").slice(0, 10) === today).length;
}

function dailyLimitRemaining() {
  return Math.max(0, DAILY_SEND_LIMIT - sentToday());
}

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
        from: "Out There Exports <export@mail.outthereexports.xyz>",
        to: ["agaciazara765@gmail.com"],
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
  res.json({count: loadPitches().length });
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



//retail search focus
//Retail signals:
const RETAIL_WORDS = ["store", "shop", "boutique", "market", "emporium", "imports",
  "import", "trading", "gift", "gifts", "crystal", "crystals", "metaphysical",
  "spiritual", "gems", "gemstone", "supply", "supplies", "distributor", "wholesale",
  "warehouse", "co.", "company", "outfitters", "apothecary"];

//Service signals:businesses that only use a few bowls
const SERVICE_WORDS = ["therapy", "therapist", "healing center", "healing arts",
  "sound healing", "spa", "massage", "clinic", "counseling", "counselling",
  "reiki", "wellness center", "wellness centre", "studio", "retreat",
  "acupuncture", "chiropractic", "meditation cent", "hypnosis", "school",
  "institute", "sessions", "practitioner"];

function scoreSeller(place) {
  const name = (place.displayName?.text || "").toLowerCase();
  let score = 0;
  for (const w of RETAIL_WORDS) if (name.includes(w)) score += 2;
  for (const w of SERVICE_WORDS) if (name.includes(w)) score -= 3;


  const types = place.types || [];
  if (types.includes("store")) score += 3;
  if (types.some((t) => ["spa", "physiotherapist", "doctor"].includes(t))) score -= 3;

  return score;
}

async function searchPlaces(query) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.rating,places.types",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 10 }),
  });
  const data = await response.json();
  return data.places || [];
}


async function findSellers(item, city) {
  const queries = [
    `${item} store in ${city}`,
    `${item} shop in ${city}`,
    `metaphysical store in ${city}`,
    `crystal shop in ${city}`,
    `spiritual gifts store in ${city}`,
    `yoga shop in ${city}`,
  ];

  const all = [];
  for (const q of queries) {
    try {
      all.push(...(await searchPlaces(q)));
    } catch (err) {
      console.error("Places query failed:", q, err.message);
    }
  }

  const unique = [...new Map(all.map((p) => [p.displayName?.text || p.websiteUri, p])).values()];

  return unique
    .map((p) => {
      const score = scoreSeller(p);
      const likelySeller = score >= 2;
      return {
        name: p.displayName?.text || "Unknown",
        address: p.formattedAddress || "",
        website: p.websiteUri || "",
        rating: p.rating || null,
        sellerScore: score,
        likelySeller,
        sellerTag: likelySeller ? "\u{1F6CD} Likely retailer" : "\u{1F9D8} Likely service provider",
      };
    })
    .sort((a, b) => b.sellerScore - a.sellerScore);
}

app.get("/api/find-sellers", async (req, res) => {
  const { item } = req.query;
  const state = req.query.state || req.query.city;
  if (!item || !state) return res.status(400).json({ error: "Missing item or state" });

  try {
    const cities = citiesByState[state] || [state];
    let allSellers = [];
    for (const city of cities.slice(0, 3)) { 
      const sellers = await findSellers(item, `${city} ${state}`);
      allSellers.push(...sellers);
    }
    const unique = [...new Map(allSellers.map((s) => [s.name, s])).values()]
      .sort((a, b) => b.sellerScore - a.sellerScore);
    res.json(unique);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

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
<p>Hello,</p>

<p>
I hope you're doing well.
</p>

<p>
I'm reaching out on behalf of OM Enterprise. We specialize in handcrafted Himalayan Singing Bowls sourced from Nepal.
</p>

<p>
Our singing bowls are popular with wellness stores, gift shops, spiritual retailers, and home décor businesses looking for authentic handcrafted products.
</p>

<p>
We provide wholesale supply and would be happy to share our catalog and pricing for your review.
</p>

<p>
Would you be interested in exploring a potential wholesale partnership?
</p>

<p>
Looking forward to hearing from you.
</p>
<p>
Best regards,<br>
Agatha Swett<br>
OM Enterprise<br>
📧 Sales Contact: exportindia2026us@gmail.com<br>
</p>

<p>
<a href="https://catalog.outthereexports.xyz/homeint/Catalog.pdf">
View Product Catalog (PDF)
</a>
</p>
`;
}



function buildPitchText() {
  return [
    "Hello,",
    "",
    "I'm reaching out on behalf of OM Enterprise. We specialize in handcrafted Himalayan Singing Bowls sourced from Nepal.",
    "",
    "Our singing bowls are popular with wellness stores, gift shops, spiritual retailers, and home décor businesses looking for authentic handcrafted products.",
    "",
    "We provide wholesale supply and would be happy to share our catalog and pricing for your review.",
    "",
    "Would you be interested in exploring a potential wholesale partnership?",
    "",
    "Best regards,",
    "Agatha Swett",
    "OM Enterprise",
    "Sales Contact: exportindia2026us@gmail.com",
    "",
    "Product Catalog: https://catalog.outthereexports.xyz/homeint/Catalog.pdf",
  ].join("\n");
}

app.post("/api/send-email", express.json(), async (req, res) => {

  if (req.headers["x-dashboard-token"] !== process.env.DASHBOARD_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { to, buyerName, sellerName, item, country, company, website, category } = req.body;
  if (!to || !to.includes("@")) {
    return res.status(400).json({ error: "Valid buyer email required" });
  }
  if (isUnsubscribed(to)) {
    return res.status(400).json({
      error: "Unsubscribed contact"
    });
  }
  if (dailyLimitRemaining() <= 0) {
    return res.status(429).json({
      error: `Daily warmup limit reached (${DAILY_SEND_LIMIT}/day). Try again tomorrow.`,
    });
  }

  try {
    await resend.emails.send({
      from: process.env.SENDER_EMAIL,
      to,
      reply_to: "agaciazara765@gmail.com",
      subject: PITCH_SUBJECT,
      html: buildPitchEmail({ buyerName, sellerName, item, country, company, website, category }),
      text: buildPitchText(),
      headers: {
        "List-Unsubscribe":
        `<https://outthereexports.xyz/unsubscribe?email=${encodeURIComponent(to)}>, <mailto:unsubscribe@outthereexports.xyz>`,
        "List-Unsubscribe-Post":
        "List-Unsubscribe=One-Click"
      }

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
  subject: PITCH_SUBJECT,
});
   
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

  if (req.headers["x-dashboard-token"] !== process.env.DASHBOARD_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { pitches } = req.body;
  if (!Array.isArray(pitches) || !pitches.length) {
    return res.status(400).json({ error: "pitches array required" });
  }
  if (pitches.length > 100) {
    return res.status(400).json({ error: "Max 100 emails per bulk send (Resend daily limit)" });
  }

  const remaining = dailyLimitRemaining();
  if (remaining <= 0) {
    return res.status(429).json({
      error: `Limit reached (${DAILY_SEND_LIMIT}/day). Try again tomorrow.`,
    });
  }

  const alreadySent = new Set(loadPitches().map((p) => (p.email || "").toLowerCase()));
  const unsubscribed = loadUnsubscribed();
  const results = [];
  let sentThisBatch = 0;
  

  for (const p of pitches) {
    const to = (p.to || "").trim();
    const emailKey = to.toLowerCase();
    if (unsubscribed.has(emailKey)) {
      results.push({
        status: "skipped",
        error: "Unsubscribed"
      });
      continue;
    }

    if (!to.includes("@")) {
      results.push({ status: "failed", error: "Invalid email" });
      continue;
    }
    if (alreadySent.has(emailKey)) {
      results.push({ status: "skipped", error: "Already pitched" });
      continue;
    }
    if (sentThisBatch >= remaining) {
      results.push({ status: "skipped", error: "Daily warmup limit reached" });
      continue;
    }

    try {
      await resend.emails.send({
        from: process.env.SENDER_EMAIL,
        to,
        reply_to: "agaciazara765@gmail.com",
        subject: PITCH_SUBJECT,
        html: buildPitchEmail(p),
        text: buildPitchText(),
        headers: {
          "List-Unsubscribe":
          `<https://outthereexports.xyz/unsubscribe?email=${encodeURIComponent(to)}>, <mailto:unsubscribe@outthereexports.xyz>`,
          "List-Unsubscribe-Post":
          "List-Unsubscribe=One-Click"
        }
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
        subject: PITCH_SUBJECT,
        bulk: true,
      });
      alreadySent.add(emailKey);
      
      sentThisBatch++;
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
