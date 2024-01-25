export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          company_name: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          company_name?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          company_name?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          id: number
          user_id: string
          title: string
          tags: string[]
          user_text: string | null
          ai_generated_text: string | null
          ai_generated_image_url: string | null
          entry_date: string
          mood_indicator: string | null
          weather: string | null
          location: string | null
          word_count: number | null
          privacy_level: string | null
          daily_quote: string | null
          entry_type: string | null
          bookmark_flag: boolean
          status: string | null
          image_url: string | null
          audio_url: string | null
          time_spent: string | null
        }
        Insert: {
          id?: number
          user_id?: string
          title?: string
          tags?: string[]
          user_text?: string | null
          ai_generated_text?: string | null
          ai_generated_image_url?: string | null
          entry_date?: string
          mood_indicator?: string | null
          weather?: string | null
          location?: string | null
          word_count?: number | null
          privacy_level?: string | null
          daily_quote?: string | null
          entry_type?: string | null
          bookmark_flag?: boolean
          status?: string | null
          image_url?: string | null
          audio_url?: string | null
          time_spent?: string | null
        }
        Update: {
          id: number
          user_id: string
          title: string
          tags: string[]
          user_text: string | null
          ai_generated_text: string | null
          ai_generated_image_url: string | null
          entry_date: string
          mood_indicator: string | null
          weather: string | null
          location: string | null
          word_count: number | null
          privacy_level: string | null
          daily_quote: string | null
          entry_type: string | null
          bookmark_flag: boolean
          status: string | null
          image_url: string | null
          audio_url: string | null
          time_spent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
