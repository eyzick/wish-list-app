# Wish Lists

React, TypeScript, and Supabase wish lists for a small group. Every member signs in with their own email and password. Lists can be public to signed-in members or private to their owner. Only the owner can edit a list or its items. Items can have optional prices and be viewed from low to high. Members can see purchase tracking on other people's public lists, while the owner cannot see it, including in Supabase API responses. Admins can delete lists, folders, and items.

## Set up Supabase

1. For a new Supabase project, run `supabase-schema.sql` in the SQL editor. If the earlier wish-list schema is already installed, run `supabase-signup-upgrade.sql`, then `supabase-list-visibility.sql`. Run each applicable script once.
2. In **Authentication → Sign In / Providers**, enable email/password and **Allow new users to sign up**. Email confirmation is optional. If enabled, add `http://localhost:3001`, `http://127.0.0.1:3001`, and the deployed app URL to **Authentication → URL Configuration → Redirect URLs** so confirmation links return to the app.
3. Set `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in a local `.env.local` and as GitHub Actions secrets for deployment. Run `npm ci` and `npm start` locally.
4. Open the app and choose **Create account**. Each person creates their own account. The first account becomes an admin and can delete lists, folders, and items. Later accounts are regular members. If email confirmation is enabled, opening the confirmation link signs the person in automatically in the browser that opens it. Browser sessions are separate, so confirming in another browser does not sign in the original browser tab.

Use only the public Supabase anon key in React environment variables. The old `REACT_APP_ADMIN_PASSWORD` is no longer used. With open sign-up, anyone who has the app URL can create an account and view public wish lists.

## How purchase privacy works

Purchase status lives in `wish_item_purchases`, separate from item names, prices, and links. Row Level Security only lets a signed-in member read or update that status when a public list belongs to someone else. The list owner can still view and edit their items, but cannot see purchase buttons or totals. Private lists and their items are visible only to their owner. Existing lists remain public after the upgrade.

Database policies limit list and item deletion to admins. Any signed-in member can create their own list; only its owner can edit the list, add items, or edit and reorder its items, whether it is public or private.

Open lists refresh when the app regains focus and every 30 seconds while visible. Use **Refresh** to check immediately for another person's new items. If an item request fails, the app shows an error instead of an empty-list message.

## Prices and sorting

Item prices are optional USD amounts with up to two decimal places. In a list, choose **Price: low to high** from **Sort items** to see priced items in ascending order; items without a price appear last. Choose **Priority** to return to the saved manual order. Dragging and priority controls are available only in Priority view.
