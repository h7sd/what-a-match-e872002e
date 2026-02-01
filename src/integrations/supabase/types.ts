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
      alias_requests: {
        Row: {
          created_at: string
          id: string
          requested_alias: string
          requester_id: string
          responded_at: string | null
          response_token: string | null
          status: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_alias: string
          requester_id: string
          responded_at?: string | null
          response_token?: string | null
          status?: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_alias?: string
          requester_id?: string
          responded_at?: string | null
          response_token?: string | null
          status?: string
          target_user_id?: string
        }
        Relationships: []
      }
      badge_requests: {
        Row: {
          admin_edited_color: string | null
          admin_edited_description: string | null
          admin_edited_icon_url: string | null
          admin_edited_name: string | null
          badge_color: string
          badge_description: string | null
          badge_icon_url: string | null
          badge_name: string
          created_at: string
          denial_reason: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_edited_color?: string | null
          admin_edited_description?: string | null
          admin_edited_icon_url?: string | null
          admin_edited_name?: string | null
          badge_color?: string
          badge_description?: string | null
          badge_icon_url?: string | null
          badge_name: string
          created_at?: string
          denial_reason?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_edited_color?: string | null
          admin_edited_description?: string | null
          admin_edited_icon_url?: string | null
          admin_edited_name?: string | null
          badge_color?: string
          badge_description?: string | null
          badge_icon_url?: string | null
          badge_name?: string
          created_at?: string
          denial_reason?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
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
      banned_users: {
        Row: {
          appeal_deadline: string
          appeal_submitted_at: string | null
          appeal_text: string | null
          banned_at: string
          banned_by: string
          email: string | null
          id: string
          reason: string | null
          user_id: string
          username: string
        }
        Insert: {
          appeal_deadline?: string
          appeal_submitted_at?: string | null
          appeal_text?: string | null
          banned_at?: string
          banned_by: string
          email?: string | null
          id?: string
          reason?: string | null
          user_id: string
          username: string
        }
        Update: {
          appeal_deadline?: string
          appeal_submitted_at?: string | null
          appeal_text?: string | null
          banned_at?: string
          banned_by?: string
          email?: string | null
          id?: string
          reason?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
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
      discord_presence: {
        Row: {
          activity_details: string | null
          activity_large_image: string | null
          activity_name: string | null
          activity_state: string | null
          activity_type: string | null
          avatar: string | null
          discord_user_id: string
          id: string
          profile_id: string
          status: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          activity_details?: string | null
          activity_large_image?: string | null
          activity_name?: string | null
          activity_state?: string | null
          activity_type?: string | null
          avatar?: string | null
          discord_user_id: string
          id?: string
          profile_id: string
          status?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          activity_details?: string | null
          activity_large_image?: string | null
          activity_name?: string | null
          activity_state?: string | null
          activity_type?: string | null
          avatar?: string | null
          discord_user_id?: string
          id?: string
          profile_id?: string
          status?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      global_badges: {
        Row: {
          claims_count: number | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_limited: boolean | null
          max_claims: number | null
          name: string
          rarity: string | null
        }
        Insert: {
          claims_count?: number | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_limited?: boolean | null
          max_claims?: number | null
          name: string
          rarity?: string | null
        }
        Update: {
          claims_count?: number | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_limited?: boolean | null
          max_claims?: number | null
          name?: string
          rarity?: string | null
        }
        Relationships: []
      }
      link_clicks: {
        Row: {
          clicked_at: string
          id: string
          link_id: string
          viewer_country: string | null
          viewer_ip_hash: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          link_id: string
          viewer_country?: string | null
          viewer_ip_hash?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          link_id?: string
          viewer_country?: string | null
          viewer_ip_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "social_links"
            referencedColumns: ["id"]
          },
        ]
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
          alias_changed_at: string | null
          alias_username: string | null
          animated_title: boolean | null
          ascii_size: number | null
          ascii_waves: boolean | null
          audio_volume: number | null
          avatar_shape: string | null
          avatar_url: string | null
          background_color: string | null
          background_effect: string | null
          background_url: string | null
          background_video_url: string | null
          bio: string | null
          card_border_color: string | null
          card_border_enabled: boolean | null
          card_border_width: number | null
          card_color: string | null
          card_style: string | null
          created_at: string
          custom_cursor_url: string | null
          discord_avatar_decoration: boolean | null
          discord_badge_color: string | null
          discord_card_opacity: number | null
          discord_card_style: string | null
          discord_show_badge: boolean | null
          discord_user_id: string | null
          display_name: string | null
          effects_config: Json | null
          email_verified: boolean | null
          enable_profile_gradient: boolean | null
          glow_badges: boolean | null
          glow_socials: boolean | null
          glow_username: boolean | null
          icon_color: string | null
          icon_links_opacity: number | null
          icon_only_links: boolean | null
          id: string
          is_premium: boolean | null
          layout_style: string | null
          location: string | null
          monochrome_icons: boolean | null
          music_url: string | null
          name_font: string | null
          occupation: string | null
          og_description: string | null
          og_icon_url: string | null
          og_image_url: string | null
          og_title: string | null
          og_title_animation: string | null
          paypal_order_id: string | null
          premium_purchased_at: string | null
          profile_blur: number | null
          profile_opacity: number | null
          show_avatar: boolean | null
          show_badges: boolean | null
          show_description: boolean | null
          show_display_name: boolean | null
          show_links: boolean | null
          show_username: boolean | null
          show_views: boolean | null
          show_volume_control: boolean | null
          start_screen_animation: string | null
          start_screen_bg_color: string | null
          start_screen_color: string | null
          start_screen_enabled: boolean | null
          start_screen_font: string | null
          start_screen_text: string | null
          swap_bio_colors: boolean | null
          text_color: string | null
          text_font: string | null
          transparent_badges: boolean | null
          uid_number: number
          updated_at: string
          use_discord_avatar: boolean | null
          user_id: string
          username: string
          views_count: number | null
        }
        Insert: {
          accent_color?: string | null
          alias_changed_at?: string | null
          alias_username?: string | null
          animated_title?: boolean | null
          ascii_size?: number | null
          ascii_waves?: boolean | null
          audio_volume?: number | null
          avatar_shape?: string | null
          avatar_url?: string | null
          background_color?: string | null
          background_effect?: string | null
          background_url?: string | null
          background_video_url?: string | null
          bio?: string | null
          card_border_color?: string | null
          card_border_enabled?: boolean | null
          card_border_width?: number | null
          card_color?: string | null
          card_style?: string | null
          created_at?: string
          custom_cursor_url?: string | null
          discord_avatar_decoration?: boolean | null
          discord_badge_color?: string | null
          discord_card_opacity?: number | null
          discord_card_style?: string | null
          discord_show_badge?: boolean | null
          discord_user_id?: string | null
          display_name?: string | null
          effects_config?: Json | null
          email_verified?: boolean | null
          enable_profile_gradient?: boolean | null
          glow_badges?: boolean | null
          glow_socials?: boolean | null
          glow_username?: boolean | null
          icon_color?: string | null
          icon_links_opacity?: number | null
          icon_only_links?: boolean | null
          id?: string
          is_premium?: boolean | null
          layout_style?: string | null
          location?: string | null
          monochrome_icons?: boolean | null
          music_url?: string | null
          name_font?: string | null
          occupation?: string | null
          og_description?: string | null
          og_icon_url?: string | null
          og_image_url?: string | null
          og_title?: string | null
          og_title_animation?: string | null
          paypal_order_id?: string | null
          premium_purchased_at?: string | null
          profile_blur?: number | null
          profile_opacity?: number | null
          show_avatar?: boolean | null
          show_badges?: boolean | null
          show_description?: boolean | null
          show_display_name?: boolean | null
          show_links?: boolean | null
          show_username?: boolean | null
          show_views?: boolean | null
          show_volume_control?: boolean | null
          start_screen_animation?: string | null
          start_screen_bg_color?: string | null
          start_screen_color?: string | null
          start_screen_enabled?: boolean | null
          start_screen_font?: string | null
          start_screen_text?: string | null
          swap_bio_colors?: boolean | null
          text_color?: string | null
          text_font?: string | null
          transparent_badges?: boolean | null
          uid_number?: number
          updated_at?: string
          use_discord_avatar?: boolean | null
          user_id: string
          username: string
          views_count?: number | null
        }
        Update: {
          accent_color?: string | null
          alias_changed_at?: string | null
          alias_username?: string | null
          animated_title?: boolean | null
          ascii_size?: number | null
          ascii_waves?: boolean | null
          audio_volume?: number | null
          avatar_shape?: string | null
          avatar_url?: string | null
          background_color?: string | null
          background_effect?: string | null
          background_url?: string | null
          background_video_url?: string | null
          bio?: string | null
          card_border_color?: string | null
          card_border_enabled?: boolean | null
          card_border_width?: number | null
          card_color?: string | null
          card_style?: string | null
          created_at?: string
          custom_cursor_url?: string | null
          discord_avatar_decoration?: boolean | null
          discord_badge_color?: string | null
          discord_card_opacity?: number | null
          discord_card_style?: string | null
          discord_show_badge?: boolean | null
          discord_user_id?: string | null
          display_name?: string | null
          effects_config?: Json | null
          email_verified?: boolean | null
          enable_profile_gradient?: boolean | null
          glow_badges?: boolean | null
          glow_socials?: boolean | null
          glow_username?: boolean | null
          icon_color?: string | null
          icon_links_opacity?: number | null
          icon_only_links?: boolean | null
          id?: string
          is_premium?: boolean | null
          layout_style?: string | null
          location?: string | null
          monochrome_icons?: boolean | null
          music_url?: string | null
          name_font?: string | null
          occupation?: string | null
          og_description?: string | null
          og_icon_url?: string | null
          og_image_url?: string | null
          og_title?: string | null
          og_title_animation?: string | null
          paypal_order_id?: string | null
          premium_purchased_at?: string | null
          profile_blur?: number | null
          profile_opacity?: number | null
          show_avatar?: boolean | null
          show_badges?: boolean | null
          show_description?: boolean | null
          show_display_name?: boolean | null
          show_links?: boolean | null
          show_username?: boolean | null
          show_views?: boolean | null
          show_volume_control?: boolean | null
          start_screen_animation?: string | null
          start_screen_bg_color?: string | null
          start_screen_color?: string | null
          start_screen_enabled?: boolean | null
          start_screen_font?: string | null
          start_screen_text?: string | null
          swap_bio_colors?: boolean | null
          text_color?: string | null
          text_font?: string | null
          transparent_badges?: boolean | null
          uid_number?: number
          updated_at?: string
          use_discord_avatar?: boolean | null
          user_id?: string
          username?: string
          views_count?: number | null
        }
        Relationships: []
      }
      promo_code_uses: {
        Row: {
          code_id: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_percentage: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          type: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percentage?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          type?: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percentage?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          type?: string
          uses_count?: number
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          created_at: string
          currency: string
          email: string
          id: string
          invoice_number: string
          order_id: string
          payment_method: string
          status: string
          user_id: string
          username: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          email: string
          id?: string
          invoice_number: string
          order_id: string
          payment_method?: string
          status?: string
          user_id: string
          username: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          email?: string
          id?: string
          invoice_number?: string
          order_id?: string
          payment_method?: string
          status?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          click_count: number | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_visible: boolean | null
          platform: string
          profile_id: string
          style: string | null
          title: string | null
          url: string
        }
        Insert: {
          click_count?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_visible?: boolean | null
          platform: string
          profile_id: string
          style?: string | null
          title?: string | null
          url: string
        }
        Update: {
          click_count?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_visible?: boolean | null
          platform?: string
          profile_id?: string
          style?: string | null
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
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          claimed_at: string
          id: string
          is_enabled: boolean | null
          is_locked: boolean | null
          user_id: string
        }
        Insert: {
          badge_id: string
          claimed_at?: string
          id?: string
          is_enabled?: boolean | null
          is_locked?: boolean | null
          user_id: string
        }
        Update: {
          badge_id?: string
          claimed_at?: string
          id?: string
          is_enabled?: boolean | null
          is_locked?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "global_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          type: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          type: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          type?: string
          used_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_record_view: {
        Args: { p_ip_hash: string; p_profile_id: string }
        Returns: boolean
      }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_link_click_count: {
        Args: { p_link_id: string }
        Returns: undefined
      }
      is_profile_owner: { Args: { profile_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
