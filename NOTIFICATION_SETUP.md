# Automatic notifications setup

The project now supports two notification channels after a **new expense** is saved:

1. **Browser push — free** using standard Web Push / VAPID.
2. **WhatsApp — optional** using Meta's official WhatsApp Cloud API and an approved utility template.

## What each family member receives

The message is calculated from the same ledger used by the dashboard and includes:

- New expense title and amount
- Who paid
- That member's share in the new expense
- Total amount that member has paid so far
- Total split/share assigned to that member so far
- Current net balance: amount to pay, receive, or settled
- Exact current settlement relationship such as `You owe Kusuma ₹500` or `Sai owes you ₹300`
- Link to `https://karri-sons-expenses.vercel.app/`

## 1. Enable free browser push

### Generate VAPID keys once

Run:

```bash
npm run vapid
```

Copy the three values printed by the command into **Vercel → Project → Settings → Environment Variables**:

```text
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=https://karri-sons-expenses.vercel.app/
NEXT_PUBLIC_APP_URL=https://karri-sons-expenses.vercel.app/
```

Redeploy after adding the variables.

### Register each person's device once

On each family member's own phone/browser:

1. Open `https://karri-sons-expenses.vercel.app/`
2. Open **Family members**.
3. On that person's profile, tap **Enable alerts on this device**.
4. Allow browser notifications.

That device is then attached to that family member. Future expenses are sent automatically; nobody has to press Send.

> iPhone/iPad: Web Push is supported for Home Screen web apps. Add the site to the Home Screen first, launch it from there, then enable notifications.

## 2. Optional WhatsApp automation

The code uses the official WhatsApp Cloud API. Add the member's WhatsApp number by editing their profile and turn on **Send automatic WhatsApp updates**.

Create an approved utility template in Meta with this body and nine text variables:

```text
Hi {{1}}, a new expense {{2}} of ₹{{3}} was added.
Paid by: {{4}}
Your share: ₹{{5}}
Total paid by you: ₹{{6}}
Your total split: ₹{{7}}
Current balance: {{8}}
Check details: {{9}}
```

Suggested template name:

```text
family_expense_update
```

Then add these Vercel variables:

```text
WHATSAPP_GRAPH_VERSION=v26.0
WHATSAPP_ACCESS_TOKEN=your_permanent_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_TEMPLATE_NAME=family_expense_update
WHATSAPP_TEMPLATE_LANGUAGE=en
```

Redeploy.

### WhatsApp cost note

Automatic business-initiated WhatsApp notifications are not guaranteed to be free. Meta's Business Platform uses per-message pricing for delivered business messages. Keep browser push enabled as the zero-messaging-cost notification channel.

## Important security note

The website currently has no login/authentication. Anyone with the URL can view and modify the family data. Before sharing it outside the family, add authentication or Vercel Deployment Protection.
