# Buyer-finder
Help find buyers for sellers and send emails for potential contracts.

# DecorFind — Home Decor Buyer Finder

A website that helps home decor makers and small sellers in the **United States** find potential wholesale buyers — boutiques, gift shops, and interior design studios — and pitch them via email in one click.


## Features

- **Search buyers by product + state** — e.g. "candles in Texas" returns real stores across the state's major cities (from Google Places API)
- **Multi-city search** — each state query goes through its major cities for wider coverage.
- **Buyer details** — store name, ratings, full address, and website link
- **One-click pitch emails** — pasting the buyer's contact email (from their website) and sending a pre-written wholesale inquiry through the Resend email API
- **Live feedback** — loading spinner, per-buyer send status (sending / sent / failed)
- **Responsive design** — mobile slide-in menu, layouts adapt for 1024px / 900px / 640px

<img width="1704" height="751" alt="image" src="https://github.com/user-attachments/assets/395f0896-985a-4a65-a653-3ddc2b7a25bd" />

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- A Google Cloud account with the **Places API** enabled
- A [Resend](https://resend.com/) account (free tier: 100 emails/day)

### Installation

```bash
git clone https://github.com/Azares-hara/Buyer-finder.git
cd decorfind
npm install
```

### Run

```bash
node server.js
```

Open **http://localhost:3000** 


###Limits and future improvements

**Email Discovery Integration**  
Adding logic to buyer websites for published contact emails (e.g., parsing “Contact” or “About” pages).
Challenge: Many sites hide emails, therefore, this would need careful handling.

**Contact Form Automation** 
Instead of relying only on email addresses, will integrate a way to auto‑fill and submit contact forms directly from the app. This would expand reach to stores that don’t list emails.

**Find through LinkedIn**
Connect to LinkedIn APIs or wholesale directories to find verified buyer contacts and decision‑makers.


## License

MIT
