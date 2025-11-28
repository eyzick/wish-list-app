import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface ListFolder {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface WishList {
  id: string
  name: string
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
  is_bought: boolean
  starred: boolean
  priority: number
  created_at: string
  updated_at: string
}
