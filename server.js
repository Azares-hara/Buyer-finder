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

We were looking into wellness businesses in ${country} and recently came across ${company}.
Having browsed your website (${website}), we noticed your keen interest and strong focus on ${category} and we were impressed with your commitment to quality and customer experience. 
We are a Nepal-based manufacturer and exporter of authentic handmade Himalayan Singing Bowls crafted by skilled artisans using traditional techniques and your brand’s aesthetic goes beautifully with our handcrafted Himalayan singing bowls
made by skilled artisans in Nepal using traditional methods

We offer a range of products.
Himalayan Singing Bowls Made By Hand
Singing Bowls, Full Moon
Vintage Finished Singing Bowls
Why Our Bowls are Right for Your Store
Sound Healing Bowls & Meditation
Tingsha Cymbals & Meditation Tool
Private Label & Custom Logo Manufacturing

Why Our Bowls Fit Your Store
✔ Handcrafted with authenticity
✔ Great for meditation, yoga, sound healing & wellness retail
✔ OEM & Private Label options for your trademark or brand identity
✔ Worldwide shipping with dedicated export support

We believe our products would make a great addition to ${company}’s current collection and would resonate strongly with your customers in ${country}.

Please find our attachments enclosed. We would be happy to share wholesale pricing, samples, and customization options.

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
          path: "https://drive.google.com/uc?export=download&id=15eZxHUjFMz0H-NrpRZWQkgScGRxqUGrR"
        },
        {
          filename: "catalogue.pdf",
          path: "https://drive.google.com/uc?export=download&id=1pGJ-LaV5smg1ePTLSHDRbsWuX0KqXmyY"
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
