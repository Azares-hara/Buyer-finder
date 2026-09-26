const findBuyers = require("./findBuyers");

findBuyers("home decor", "New York").then((buyers) => {
  buyers.forEach((b) => console.log(`${b.name} | ${b.address} | ${b.website}`));
});

