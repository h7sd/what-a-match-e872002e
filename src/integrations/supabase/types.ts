export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          profile_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          profile_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_integrations: {
        Row: {
          avatar: string | null
          created_at: string
          discord_id: string | null
          discriminator: string | null
          id: string
          show_on_profile: boolean | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          discord_id?: string | null
          discriminator?: string | null
          id?: string
          show_on_profile?: boolean | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          discord_id?: string | null
          discriminator?: string | null
          id?: string
          show_on_profile?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          id: number
          profile_id: string
          viewed_at: string
          viewer_country: string | null
          viewer_ip_hash: string | null
        }
        Insert: {
          id?: never
          profile_id: string
          viewed_at?: string
          viewer_country?: string | null
          viewer_ip_hash?: string | null
        }
        Update: {
          id?: never
          profile_id?: string
          viewed_at?: string
          viewer_country?: string | null
          viewer_ip_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accent_color: string | null
          avatar_url: string | null
          background_color: string | null
          background_url: string | null
          bio: string | null
          card_color: string | null
          created_at: string
          display_name: string | null
          effects_config: Json | null
          id: string
          music_url: string | null
          updated_at: string
          user_id: string
          username: string
          views_count: number | null
        }
        Insert: {
          accent_color?: string | null
          avatar_url?: string | null
          background_color?: string | null
          background_url?: string | null
          bio?: string | null
          card_color?: string | null
          created_at?: string
          display_name?: string | null
          effects_config?: Json | null
          id?: string
          music_url?: string | null
          updated_at?: string
          user_id: string
          username: string
          views_count?: number | null
        }
        Update: {
          accent_color?: string | null
          avatar_url?: string | null
          background_color?: string | null
          background_url?: string | null
          bio?: string | null
          card_color?: string | null
          created_at?: string
          display_name?: string | null
          effects_config?: Json | null
          id?: string
          music_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          views_count?: number | null
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          display_order: number | null
          icon: string | null
          id: string
          is_visible: boolean | null
          platform: string
          profile_id: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_visible?: boolean | null
          platform: string
          profile_id: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_visible?: boolean | null
          platform?: string
          profile_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spotify_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          show_on_profile: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          show_on_profile?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          show_on_profile?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_profile_owner: { Args: { profile_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
