require("dotenv").config();
const express = require("express");
const path = require("path");
const { Resend } = require("resend");

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

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
    res.json(allBuyers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

//Pitching email via Resend
app.post("/api/send-email", express.json(), async (req, res) => {
  const { to, buyerName, sellerName, item, country, company } = req.body;

  if (!to || !to.includes("@")) {
    return res.status(400).json({ error: "Valid buyer email required" });
  }

  try {
    await resend.emails.send({
      from: process.env.SENDER_EMAIL,
      to,
      subject: `Home decor wholesale inquiry — ${item}`,
      text: `
Authentic Handmade Himalayan Singing Bowls
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label

Dear ${buyerName} Team,

While researching businesses in ${country}, we came across ${company} and were impressed by your commitment to quality wellness products.

We are a Nepal-based manufacturer and exporter of authentic handmade Himalayan Singing Bowls crafted by skilled artisans using traditional techniques.

Our Product Range
Handmade Himalayan Singing Bowls
Full Moon Singing Bowls
Antique Finish Singing Bowls
Chakra Singing Bowl Sets
Meditation & Sound Healing Bowls
Tingsha Cymbals & Meditation Accessories
Custom Logo & Private Label Manufacturing

Choose the Collection That Fits Your Business
✨ Premium Collection
Individually handcrafted with superior finish and exceptional sound quality.

NO MINIMUM ORDER QUANTITY
Order from a single bowl to large wholesale quantities.

📦 Standard Collection
Perfect for wholesalers and distributors seeking bulk procurement.

Minimum Order Quantity
200 Pieces
Competitive pricing and consistent quality for high-volume orders.

Why Partner With Us?
✔️ Direct Manufacturer from Nepal
✔️ Authentic Handmade Craftsmanship
✔️ OEM & Private Label Services
✔️ Worldwide Shipping
✔️ Dedicated Export Support

Our latest catalogue is attached. Reply to this email for wholesale pricing, samples, shipping quotations, and customization options.

Kind Regards,
${sellerName}
Sales Executive
${process.env.COMPANY_NAME}
📧 ${process.env.SENDER_EMAIL}
📱 ${process.env.SENDER_PHONE}

Thank you for your valuable time. We look forward to building a successful and long-term partnership with ${company}.
      `,
      attachments: [
        {
          filename: "poster.pdf",
          path: path.join(__dirname, "Singing bowl poster.pdf")
        },
        {
          filename: "catalogue.pdf",
          path: path.join(__dirname, "Singing bowl ppt.pdf")
        }
      ]
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Email failed to send" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
