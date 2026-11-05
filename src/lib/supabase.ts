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

// Read items independently so a purchase-tracking request cannot hide the list's items.
export const loadWishItems = async (listId: string, includePurchases: boolean): Promise<{
  items: WishItem[]
  purchaseError: boolean
}> => {
  const { data, error } = await supabase
    .from('wish_items')
    .select('*')
    .eq('wish_list_id', listId)
    .order('priority', { ascending: true })

  if (error) throw error
  const items = (data || []).map(item => ({ ...item, is_bought: false })) as WishItem[]
  if (!includePurchases || items.length === 0) return { items, purchaseError: false }

  const { data: purchases, error: purchaseError } = await supabase
    .from('wish_item_purchases')
    .select('item_id, is_bought')
    .in('item_id', items.map(item => item.id))

  if (purchaseError) return { items, purchaseError: true }
  const boughtById = new Map((purchases || []).map(purchase => [purchase.item_id, purchase.is_bought]))
  return {
    items: items.map(item => ({ ...item, is_bought: boughtById.get(item.id) ?? false })),
    purchaseError: false,
  }
}
