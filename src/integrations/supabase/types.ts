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
      admin_discord_roles: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          role_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          role_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          role_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          type?: string
        }
        Relationships: []
      }
      admin_webhooks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          notification_type: string
          updated_at: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          notification_type?: string
          updated_at?: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          notification_type?: string
          updated_at?: string
          webhook_url?: string
        }
        Relationships: []
      }
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
      badge_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          is_active: boolean | null
          name: string
          starts_at: string
          steal_duration_hours: number | null
          target_badge_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          name: string
          starts_at?: string
          steal_duration_hours?: number | null
          target_badge_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          starts_at?: string
          steal_duration_hours?: number | null
          target_badge_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badge_events_target_badge_id_fkey"
            columns: ["target_badge_id"]
            isOneToOne: false
            referencedRelation: "global_badges"
            referencedColumns: ["id"]
          },
        ]
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
      badge_steals: {
        Row: {
          badge_id: string
          event_id: string | null
          id: string
          returned: boolean | null
          returned_at: string | null
          returns_at: string
          stolen_at: string
          thief_user_id: string
          victim_user_id: string
        }
        Insert: {
          badge_id: string
          event_id?: string | null
          id?: string
          returned?: boolean | null
          returned_at?: string | null
          returns_at: string
          stolen_at?: string
          thief_user_id: string
          victim_user_id: string
        }
        Update: {
          badge_id?: string
          event_id?: string | null
          id?: string
          returned?: boolean | null
          returned_at?: string | null
          returns_at?: string
          stolen_at?: string
          thief_user_id?: string
          victim_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_steals_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "global_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_steals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "badge_events"
            referencedColumns: ["id"]
          },
        ]
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
      friend_badges: {
        Row: {
          color: string | null
          created_at: string
          creator_id: string
          description: string | null
          display_order: number | null
          icon_url: string | null
          id: string
          is_enabled: boolean | null
          name: string
          recipient_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          recipient_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          recipient_id?: string
        }
        Relationships: []
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
      live_chat_conversations: {
        Row: {
          assigned_admin_id: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string | null
          visitor_id: string | null
          visitor_session_token: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
          visitor_session_token?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
          visitor_session_token?: string | null
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "live_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_comments: {
        Row: {
          commenter_ip_hash: string
          commenter_user_id: string | null
          created_at: string
          encrypted_content: string
          encrypted_metadata: string | null
          expires_at: string
          id: string
          is_read: boolean
          profile_id: string
        }
        Insert: {
          commenter_ip_hash: string
          commenter_user_id?: string | null
          created_at?: string
          encrypted_content: string
          encrypted_metadata?: string | null
          expires_at?: string
          id?: string
          is_read?: boolean
          profile_id: string
        }
        Update: {
          commenter_ip_hash?: string
          commenter_user_id?: string | null
          created_at?: string
          encrypted_content?: string
          encrypted_metadata?: string | null
          expires_at?: string
          id?: string
          is_read?: boolean
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_likes: {
        Row: {
          created_at: string
          encrypted_data: string | null
          id: string
          is_like: boolean
          liker_ip_hash: string
          liker_user_id: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_data?: string | null
          id?: string
          is_like?: boolean
          liker_ip_hash: string
          liker_user_id?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_data?: string | null
          id?: string
          is_like?: boolean
          liker_ip_hash?: string
          liker_user_id?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          dislikes_count: number
          display_name: string | null
          display_name_animation: string | null
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
          likes_count: number
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
          show_comments: boolean | null
          show_description: boolean | null
          show_display_name: boolean | null
          show_likes: boolean | null
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
          dislikes_count?: number
          display_name?: string | null
          display_name_animation?: string | null
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
          likes_count?: number
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
          show_comments?: boolean | null
          show_description?: boolean | null
          show_display_name?: boolean | null
          show_likes?: boolean | null
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
          dislikes_count?: number
          display_name?: string | null
          display_name_animation?: string | null
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
          likes_count?: number
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
          show_comments?: boolean | null
          show_description?: boolean | null
          show_display_name?: boolean | null
          show_likes?: boolean | null
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
          claimed_at: string | null
          claimed_by: string | null
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
          claimed_at?: string | null
          claimed_by?: string | null
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
          claimed_at?: string | null
          claimed_by?: string | null
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
          custom_color: string | null
          display_order: number | null
          id: string
          is_enabled: boolean | null
          is_locked: boolean | null
          user_id: string
        }
        Insert: {
          badge_id: string
          claimed_at?: string
          custom_color?: string | null
          display_order?: number | null
          id?: string
          is_enabled?: boolean | null
          is_locked?: boolean | null
          user_id: string
        }
        Update: {
          badge_id?: string
          claimed_at?: string
          custom_color?: string | null
          display_order?: number | null
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
      spotify_integrations_public: {
        Row: {
          created_at: string | null
          id: string | null
          show_on_profile: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          show_on_profile?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          show_on_profile?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_record_view: {
        Args: { p_ip_hash: string; p_profile_id: string }
        Returns: boolean
      }
      check_user_ban_status: {
        Args: { p_user_id: string }
        Returns: {
          can_appeal: boolean
          is_banned: boolean
        }[]
      }
      check_username_available: {
        Args: { p_username: string }
        Returns: boolean
      }
      cleanup_expired_comments: { Args: never; Returns: undefined }
      cleanup_expired_verification_codes: { Args: never; Returns: number }
      create_visitor_conversation: {
        Args: { p_visitor_id: string }
        Returns: {
          conversation_id: string
          session_token: string
        }[]
      }
      get_admin_chat_notifications: {
        Args: never
        Returns: {
          conversation_id: string
          last_message_at: string
          status: string
          unread_count: number
          visitor_display: string
        }[]
      }
      get_alias_requests_for_me: {
        Args: never
        Returns: {
          created_at: string
          id: string
          requested_alias: string
          requester_id: string
          responded_at: string
          status: string
          target_user_id: string
        }[]
      }
      get_hunt_badge_holder: {
        Args: { p_event_id: string }
        Returns: {
          user_id: string
          username: string
        }[]
      }
      get_my_sent_alias_requests: {
        Args: never
        Returns: {
          created_at: string
          id: string
          requested_alias: string
          requester_id: string
          responded_at: string
          status: string
          target_user_id: string
        }[]
      }
      get_next_available_uid: { Args: never; Returns: number }
      get_profile_badges: {
        Args: { p_profile_id: string }
        Returns: {
          color: string
          description: string
          icon_url: string
          id: string
          name: string
          rarity: string
        }[]
      }
      get_profile_badges_with_friends: {
        Args: { p_profile_id: string }
        Returns: {
          badge_type: string
          color: string
          custom_color: string
          description: string
          display_order: number
          icon_url: string
          id: string
          name: string
          rarity: string
        }[]
      }
      get_profile_comments_count: {
        Args: { p_profile_id: string }
        Returns: number
      }
      get_profile_discord_presence: {
        Args: { p_profile_id: string }
        Returns: {
          activity_details: string
          activity_large_image: string
          activity_name: string
          activity_state: string
          activity_type: string
          avatar: string
          discord_user_id: string
          status: string
          username: string
        }[]
      }
      get_profile_like_counts: {
        Args: { p_profile_id: string }
        Returns: {
          dislikes_count: number
          likes_count: number
        }[]
      }
      get_public_badges: {
        Args: never
        Returns: {
          claims_count: number
          color: string
          created_at: string
          description: string
          icon_url: string
          id: string
          is_limited: boolean
          max_claims: number
          name: string
          rarity: string
        }[]
      }
      get_public_profile: {
        Args: { p_username: string }
        Returns: {
          accent_color: string
          animated_title: boolean
          ascii_size: number
          ascii_waves: boolean
          audio_volume: number
          avatar_shape: string
          avatar_url: string
          background_color: string
          background_effect: string
          background_url: string
          background_video_url: string
          bio: string
          card_border_color: string
          card_border_enabled: boolean
          card_border_width: number
          card_color: string
          card_style: string
          created_at: string
          custom_cursor_url: string
          discord_avatar_decoration: boolean
          discord_badge_color: string
          discord_card_opacity: number
          discord_card_style: string
          discord_show_badge: boolean
          discord_user_id: string
          dislikes_count: number
          display_name: string
          display_name_animation: string
          effects_config: Json
          enable_profile_gradient: boolean
          glow_badges: boolean
          glow_socials: boolean
          glow_username: boolean
          icon_color: string
          icon_links_opacity: number
          icon_only_links: boolean
          id: string
          is_premium: boolean
          layout_style: string
          likes_count: number
          location: string
          monochrome_icons: boolean
          music_url: string
          name_font: string
          occupation: string
          og_description: string
          og_icon_url: string
          og_image_url: string
          og_title: string
          og_title_animation: string
          profile_blur: number
          profile_opacity: number
          show_avatar: boolean
          show_badges: boolean
          show_comments: boolean
          show_description: boolean
          show_display_name: boolean
          show_likes: boolean
          show_links: boolean
          show_username: boolean
          show_views: boolean
          show_volume_control: boolean
          start_screen_animation: string
          start_screen_bg_color: string
          start_screen_color: string
          start_screen_enabled: boolean
          start_screen_font: string
          start_screen_text: string
          swap_bio_colors: boolean
          text_color: string
          text_font: string
          transparent_badges: boolean
          uid_number: number
          updated_at: string
          use_discord_avatar: boolean
          username: string
          views_count: number
        }[]
      }
      get_public_profile_by_alias: {
        Args: { p_alias: string }
        Returns: {
          accent_color: string
          animated_title: boolean
          ascii_size: number
          ascii_waves: boolean
          audio_volume: number
          avatar_shape: string
          avatar_url: string
          background_color: string
          background_effect: string
          background_url: string
          background_video_url: string
          bio: string
          card_border_color: string
          card_border_enabled: boolean
          card_border_width: number
          card_color: string
          card_style: string
          created_at: string
          custom_cursor_url: string
          discord_avatar_decoration: boolean
          discord_badge_color: string
          discord_card_opacity: number
          discord_card_style: string
          discord_show_badge: boolean
          discord_user_id: string
          dislikes_count: number
          display_name: string
          display_name_animation: string
          effects_config: Json
          enable_profile_gradient: boolean
          glow_badges: boolean
          glow_socials: boolean
          glow_username: boolean
          icon_color: string
          icon_links_opacity: number
          icon_only_links: boolean
          id: string
          is_premium: boolean
          layout_style: string
          likes_count: number
          location: string
          monochrome_icons: boolean
          music_url: string
          name_font: string
          occupation: string
          og_description: string
          og_icon_url: string
          og_image_url: string
          og_title: string
          og_title_animation: string
          profile_blur: number
          profile_opacity: number
          show_avatar: boolean
          show_badges: boolean
          show_comments: boolean
          show_description: boolean
          show_display_name: boolean
          show_likes: boolean
          show_links: boolean
          show_username: boolean
          show_views: boolean
          show_volume_control: boolean
          start_screen_animation: string
          start_screen_bg_color: string
          start_screen_color: string
          start_screen_enabled: boolean
          start_screen_font: string
          start_screen_text: string
          swap_bio_colors: boolean
          text_color: string
          text_font: string
          transparent_badges: boolean
          uid_number: number
          updated_at: string
          use_discord_avatar: boolean
          username: string
          views_count: number
        }[]
      }
      get_visitor_conversation: {
        Args: { p_session_token: string }
        Returns: {
          assigned_admin_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          visitor_id: string
        }[]
      }
      get_visitor_messages: {
        Args: { p_session_token: string }
        Returns: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_type: string
        }[]
      }
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
      is_protected_uid: { Args: { uid: number }; Returns: boolean }
      return_stolen_badges: { Args: never; Returns: number }
      scheduled_security_cleanup: { Args: never; Returns: undefined }
      send_visitor_message: {
        Args: { p_message: string; p_session_token: string }
        Returns: string
      }
      steal_badge: {
        Args: {
          p_badge_name: string
          p_event_id?: string
          p_victim_username: string
        }
        Returns: {
          message: string
          stolen_badge_name: string
          success: boolean
        }[]
      }
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
