require("dotenv").config();

console.log("API KEY:", process.env.GOOGLE_API_KEY);

async function findBuyers(item, city) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.rating",
    },
    body: JSON.stringify({
      textQuery: `${item} stores in ${city}`,
      maxResultCount: 10,
    }),
  });

  const data = await response.json();
  return (data.places || []).map((p) => ({
    name: p.displayName?.text || "Unknown",
    address: p.formattedAddress || "",
    website: p.websiteUri || "",
    rating: p.rating || null,
  }));
}

module.exports = findBuyers;