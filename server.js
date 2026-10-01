require("dotenv").config();
const express = require("express");
const path = require("path");
const { Resend } = require("resend");

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);
let events = [];
app.use(express.json());


app.post("/api/inbound-email", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    //Verify the webhook is genuinely from Resend
    const event = resend.webhooks.verify({
      payload: req.body.toString("utf8"),
      headers: {
        id: req.headers["svix-id"],
        timestamp: req.headers["svix-timestamp"],
        signature: req.headers["svix-signature"],
      },
      secret: process.env.RESEND_WEBHOOK_SECRET,
    });

    if (event.type !== "email.received") return res.sendStatus(200);

    //fetch the actual email body
    const { data: email, error } = await resend.emails.receiving.get(event.data.email_id);
    if (error) throw new Error(error.message);
    
    const attachments = [];
    if (event.data.attachments?.length) {
      const { data: attList } = await resend.emails.receiving.attachments.list({
        emailId: event.data.email_id,
      });
      for (const att of attList?.data || []) {
        const r = await fetch(att.download_url); 
        const buf = Buffer.from(await r.arrayBuffer());
        attachments.push({ filename: att.filename, content: buf.toString("base64") });
      }
    }

    //Forward to real inbox.
    await resend.emails.send({
      from: "Out There Exports <export@outthereexports.xyz>",
      to: ["exportindia2026us@gmail.com"],
      reply_to: event.data.from,
      subject: `Fwd: ${event.data.subject}`,
      html: email.html,
      text: email.text,
      attachments,
      headers: {
        "In-Reply-To": event.data.message_id, // keeps threading in Gmail
      },
    });

    events.push({ type: "forwarded", from: event.data.from, subject: event.data.subject, at: new Date().toISOString() });
    res.sendStatus(200);
  } catch (err) {
    console.error("Inbound webhook error:", err);
    res.sendStatus(500);
  }
    let replies = [];

    replies.unshift({
      from: event.data.from,
      to: event.data.to,
      subject: event.data.subject,
      text: email.text,
      html: email.html,
      date: event.created_at || new Date().toISOString(),
      messageId: event.data.message_id,
});

app.get("/api/replies", (req, res) => {
  if (req.headers["x-dashboard-token"] !== process.env.DASHBOARD_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json(replies);
});



app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
//all static files
app.use(express.static(__dirname));


//cities by state
const citiesByState = {
  Alabama: ["Birmingham", "Montgomery", "Mobile", "Huntsville", "Tuscaloosa"],
  Alaska: ["Anchorage", "Fairbanks", "Juneau", "Sitka", "Ketchikan"],
  Arizona: ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale"],
  California: ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose"],
  Florida: ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg"],
  "New York": ["New York City", "Buffalo", "Rochester", "Albany", "Yonkers"],
  Texas: ["Austin", "Houston", "Dallas", "San Antonio", "Fort Worth"],
  Washington: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue"]
};



//Calling Google Places API
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



//Find buyers in multiple states in cities
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

//Pitching email via Resend
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
      html: `
<p><b>Authentic Handmade Himalayan Singing Bowls<br>
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label</b></p>

<p>Dear ${buyerName} Team,</p>

<p>We were looking into wellness businesses in ${country} and recently came across ${company}.<br>
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
  <li>✔ Authentic handmade craftsmanship</li>
  <li>✔ Great for meditation, yoga, sound healing & wellness retail</li>
  <li>✔ OEM & Private Label options</li>
  <li>✔ Worldwide shipping with dedicated export support</li>
</ul>

<p>We believe our products would make a great addition to ${company}’s current collection and resonate strongly with your customers in ${country}.</p>

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

<p>Thank you for your valuable time. We look forward to building a successful and long-term partnership with ${company}.</p>
 `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Email failed to send" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
