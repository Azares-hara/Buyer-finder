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
  California: ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose", "Albany", "Alondra Park", "Alhambra", "Aliso Viejo", "Fresno", "Bakersfield", "Riverside", "Santa Ana", "Oakland", "Long Beach", "Anaheim"],
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
      html: `... your email body ...`
    });

    pitchesSent++;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Email failed to send" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
