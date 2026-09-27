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
  const { to, buyerName, sellerName, item } = req.body;
  if (!to || !to.includes("@")) return res.status(400).json({ error: "Valid buyer email required" });

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev", 
      to,
      subject: `Home decor wholesale inquiry — ${item}`,
      text: `Hi ${buyerName} team,

Greetings, I am a home decor seller and I would love to discuss supplying ${item} to your store. If you would consider then please email me through or check our the website. Thank you!

Best regards,
${sellerName}`,
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Email failed to send" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
