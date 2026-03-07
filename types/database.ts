export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          phone: string | null
          email: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          phone?: string | null
          email?: string | null
          avatar_url?: string | null
        }
        Update: {
          username?: string | null
          phone?: string | null
          email?: string | null
          avatar_url?: string | null
        }
      }
      houses: {
        Row: {
          id: string
          user_id: string
          name: string
          price: number
          price_per_sqm: number
          layout: string
          area: number
          district: string
          floor: string
          orientation: string
          decoration: string
          age: number
          status: string
          tags: string[]
          last_viewing: string | null
          is_favorite: boolean
          cover_image: string
          custom_fields: Record<string, string | number>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          price?: number
          price_per_sqm?: number
          layout?: string
          area?: number
          district?: string
          floor?: string
          orientation?: string
          decoration?: string
          age?: number
          status?: string
          tags?: string[]
          last_viewing?: string | null
          is_favorite?: boolean
          cover_image?: string
          custom_fields?: Record<string, string | number>
        }
        Update: {
          name?: string
          price?: number
          price_per_sqm?: number
          layout?: string
          area?: number
          district?: string
          floor?: string
          orientation?: string
          decoration?: string
          age?: number
          status?: string
          tags?: string[]
          last_viewing?: string | null
          is_favorite?: boolean
          cover_image?: string
          custom_fields?: Record<string, string | number>
        }
      }
      viewing_records: {
        Row: {
          id: string
          property_id: string
          visit_number: number
          date: string
          notes: string
          photos: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          visit_number?: number
          date?: string
          notes?: string
          photos?: string[]
        }
        Update: {
          visit_number?: number
          date?: string
          notes?: string
          photos?: string[]
        }
      }
      ai_analyses: {
        Row: {
          id: string
          property_id: string
          pros: string[]
          cons: string[]
          suitable_for: string[]
          negotiation_tips: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          pros?: string[]
          cons?: string[]
          suitable_for?: string[]
          negotiation_tips?: string[]
        }
        Update: {
          pros?: string[]
          cons?: string[]
          suitable_for?: string[]
          negotiation_tips?: string[]
        }
      }
      column_configs: {
        Row: {
          id: string
          user_id: string
          columns: unknown
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          columns?: unknown
        }
        Update: {
          columns?: unknown
        }
      }
    }
  }
}
