import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Confirmation emails return with a session in the URL fragment.
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
})

export interface ListFolder {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface WishList {
  id: string
  name: string
  owner_id: string | null
  is_public: boolean
  is_christmas: boolean
  folder_id: string | null
  created_at: string
  updated_at: string
}

export interface WishItem {
  id: string
  wish_list_id: string
  name: string
  link: string | null
  details: string | null
  price: number | null
  is_bought: boolean
  starred: boolean
  priority: number
  created_at: string
  updated_at: string
}

// Purchase rows are omitted by RLS for the list owner.
export const withPurchaseStatus = (rows: any[]): WishItem[] => rows.map(row => {
  const purchase = Array.isArray(row.wish_item_purchases)
    ? row.wish_item_purchases[0] : row.wish_item_purchases
  const { wish_item_purchases, ...item } = row
  return { ...item, is_bought: purchase?.is_bought ?? false } as WishItem
})
