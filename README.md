# Expense & Split — Karri Sons

A mobile-friendly family expense tracker built with Next.js. Add, edit, and delete expenses; enter any category; split costs equally; and record payments when a member settles up. Balances and the payment history update immediately.

## Deploy to Vercel with JSON storage

Vercel deployments are read-only. `data/database.json` is the initial data bundled with the app; it **cannot be edited by a running Vercel deployment**. The deployed app writes one JSON file, `karri-sons/database.json`, to a **Private Vercel Blob** store instead. This is file/object storage, not a database. Every device using the site reads the same file.

1. In the Vercel project, open **Storage** and create a **Blob** store with **Private** access.
2. Connect the store to this project for **Production** (and Preview if you use it). Vercel adds the storage credentials automatically. Keep the store private.
3. Redeploy the latest commit after connecting the store. The first successful edit creates `karri-sons/database.json` from `data/database.json`.
4. Open the site on two devices and verify a newly added expense appears after refreshing the second device.

If the store is missing, the app displays a setup error instead of pretending an edit was saved. Do not put a Blob token in the repository or in client-side code.

**Access:** The app does not have user accounts. Anyone who can access the site can see and change the family data. Apply access protection before sharing the URL publicly.

## How settlements work

Each expense is split equally among the selected members. The overview shows the net payments needed to settle the family balance. Tap **Mark paid** only after the payer actually pays the recipient; this records a payment and recalculates balances. **Undo** removes a mistaken payment record. Editing or deleting an expense does not delete past payments; the balance recalculates using the remaining expenses and payments.

## Run locally

```bash
npm install
npm run dev
```

Local development reads and writes `data/database.json`. Open http://localhost:3000. To test against Blob storage, deploy to Vercel with the store connected.

## Build

```bash
npm run build
```
