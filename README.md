# Expense & Split — Karri Sons

A modern family expense tracker built with **Next.js (JavaScript)**. The app stores data in a local JSON file and supports family profiles, expense CRUD, equal splits, automatic settlement calculations, search/filtering, and in-app notifications.

## Features

- Modern responsive dashboard
- Add, edit and delete expenses
- Add and remove family profiles
- Equal expense splitting among selected members
- Automatic **who owes whom** settlement calculation
- Category spending insights
- Search and filter expenses
- In-app activity notifications
- Local JSON persistence in `data/database.json`
- Mobile responsive design

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Production

```bash
npm run build
npm start
```

## JSON storage note

This project intentionally uses `data/database.json`, as requested. This is suitable for local use or a traditional Node.js server with a persistent filesystem.

If you deploy to a serverless platform such as Vercel, runtime filesystem writes are not guaranteed to persist. For permanent cloud hosting later, replace `lib/db.js` with Supabase, PostgreSQL, Firebase, or another database while keeping the existing UI and API shape.

## Main data file

`data/database.json`

You can manually edit the profiles, expenses, and notifications in this file while the app is stopped.
