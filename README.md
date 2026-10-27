# COCOARENA - Coconut Merchants Billing Platform

A modern, responsive billing and accounting management web platform for coconut merchants, supporting multiple traders:
- **VISHNUDATTA COCONUT**
- **SRI KRISHNA COCONUTS**
- **SRI KRISHNA TRADERS**

---

## Project Structure

```
VISHNUDATTA/
├── frontend/                     # Client-side web assets
│   ├── assets/
│   │   ├── images/              # Logos, Konaseema plantation photography
│   │   └── js/                  # docx.umd.js, html2pdf.bundle.min.js
│   ├── index.html               # Sign In / Landing Page
│   ├── dashboard.html           # Full Multi-Trader Coconut Billing Dashboard
│   ├── register.html            # User Registration Page
│   ├── styles.css               # Core design tokens, typography, auth styles
│   ├── dashboard.css            # Billing table styles, print sheets, templates
│   ├── app.js                   # Authentication & language switching
│   ├── dashboard.js             # Billing engine, calculations, PDF/DOCX exports
│   ├── register.js              # Registration & validation logic
│   ├── lang.js                  # English & Telugu bilingual translations
│   └── api-config.js            # Dynamic API endpoint resolver
│
├── backend/                      # Server-side logic & persistence
│   ├── data/
│   │   ├── bills.json           # Stored bills database
│   │   └── users.json           # Registered users database
│   └── server.js                # Node.js HTTP server & API endpoints
│
└── package.json                 # Project configuration & start scripts
```

---

## Running Locally

To run the web platform on your computer:

```bash
npm start
```

Or directly with Node:

```bash
node backend/server.js
```

Open your browser and navigate to:
**[http://localhost:3000/](http://localhost:3000/)**

---

## Features
- **Multi-Trader Billing**: Switch between Vishnudatta Coconut, Sri Krishna Coconuts, and Sri Krishna Traders with dedicated header badges and customized bill designs.
- **Bilingual Interface**: Seamless toggle between English and Telugu (తెలుగు).
- **Export & Print**: One-click download for PDF and DOCX bills, print-optimized preview sheets.
- **Responsive Layout**: Designed for both desktop widescreen monitors and mobile screens.
- **Zero NPM Dependencies**: Built using standard HTML, CSS, JavaScript, and Node.js built-in modules for maximum performance and portability.
