export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      album_comments: {
        Row: {
          album_id: string
          comment_id: string
        }
        Insert: {
          album_id: string
          comment_id: string
        }
        Update: {
          album_id?: string
          comment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_comments_album_id_fkey1"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_comments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      album_photos: {
        Row: {
          album_id: string
          created_at: string | null
          description: string | null
          height: number | null
          id: string
          photo_id: string
          photo_url: string
          sort_order: number | null
          title: string | null
          width: number | null
        }
        Insert: {
          album_id: string
          created_at?: string | null
          description?: string | null
          height?: number | null
          id?: string
          photo_id: string
          photo_url: string
          sort_order?: number | null
          title?: string | null
          width?: number | null
        }
        Update: {
          album_id?: string
          created_at?: string | null
          description?: string | null
          height?: number | null
          id?: string
          photo_id?: string
          photo_url?: string
          sort_order?: number | null
          title?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "album_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_photos_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_album_photos_photo_url"
            columns: ["photo_url"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["url"]
          },
        ]
      }
      album_tags: {
        Row: {
          album_id: string
          created_at: string | null
          id: string
          tag: string
        }
        Insert: {
          album_id: string
          created_at?: string | null
          id?: string
          tag: string
        }
        Update: {
          album_id?: string
          created_at?: string | null
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_tags_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          cover_image_url: string | null
          cover_is_manual: boolean | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          is_suspended: boolean | null
          slug: string
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          cover_is_manual?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_suspended?: boolean | null
          slug: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          cover_is_manual?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_suspended?: boolean | null
          slug?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          new_email: string | null
          token_hash: string
          token_type: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          new_email?: string | null
          token_hash: string
          token_type: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          new_email?: string | null
          token_hash?: string
          token_type?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          comment_text: string
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          email_type_id: number
          opted_out: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_type_id: number
          opted_out?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_type_id?: number
          opted_out?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_preferences_email_type_id_fkey"
            columns: ["email_type_id"]
            isOneToOne: false
            referencedRelation: "email_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_types: {
        Row: {
          created_at: string
          description: string | null
          id: number
          type_key: string
          type_label: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          type_key: string
          type_label: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          type_key?: string
          type_label?: string
        }
        Relationships: []
      }
      event_announcements: {
        Row: {
          announced_at: string
          announced_by: string | null
          event_id: number
          id: string
          recipient_count: number
        }
        Insert: {
          announced_at?: string
          announced_by?: string | null
          event_id: number
          id?: string
          recipient_count: number
        }
        Update: {
          announced_at?: string
          announced_by?: string | null
          event_id?: number
          id?: string
          recipient_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_announcements_announced_by_fkey"
            columns: ["announced_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: number
          image_blurhash: string | null
          image_height: number | null
          image_url: string | null
          image_width: number | null
          location: string | null
          max_attendees: number | null
          rsvp_count: number | null
          slug: string
          time: string | null
          title: string | null
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: number
          image_blurhash?: string | null
          image_height?: number | null
          image_url?: string | null
          image_width?: number | null
          location?: string | null
          max_attendees?: number | null
          rsvp_count?: number | null
          slug: string
          time?: string | null
          title?: string | null
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: number
          image_blurhash?: string | null
          image_height?: number | null
          image_url?: string | null
          image_width?: number | null
          location?: string | null
          max_attendees?: number | null
          rsvp_count?: number | null
          slug?: string
          time?: string | null
          title?: string | null
        }
        Relationships: []
      }
      events_rsvps: {
        Row: {
          attended_at: string | null
          canceled_at: string | null
          confirmed_at: string | null
          created_at: string | null
          email: string | null
          event_id: number | null
          id: number
          ip_address: string | null
          name: string | null
          user_id: string | null
          uuid: string | null
        }
        Insert: {
          attended_at?: string | null
          canceled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          email?: string | null
          event_id?: number | null
          id?: number
          ip_address?: string | null
          name?: string | null
          user_id?: string | null
          uuid?: string | null
        }
        Update: {
          attended_at?: string | null
          canceled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          email?: string | null
          event_id?: number | null
          id?: number
          ip_address?: string | null
          name?: string | null
          user_id?: string | null
          uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_rsvps_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_comments: {
        Row: {
          comment_id: string
          photo_id: string
        }
        Insert: {
          comment_id: string
          photo_id: string
        }
        Update: {
          comment_id?: string
          photo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_comments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_tags: {
        Row: {
          id: string
          photo_id: string
          tag: string
          created_at: string | null
        }
        Insert: {
          id?: string
          photo_id: string
          tag: string
          created_at?: string | null
        }
        Update: {
          id?: string
          photo_id?: string
          tag?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_tags_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
          count: number
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          count?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          count?: number
          created_at?: string | null
        }
        Relationships: []
      }
      photos: {
        Row: {
          blurhash: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          exif_data: Json | null
          file_size: number
          height: number
          id: string
          is_public: boolean
          mime_type: string
          original_filename: string | null
          short_id: string
          sort_order: number | null
          storage_path: string
          title: string | null
          url: string
          user_id: string | null
          width: number
        }
        Insert: {
          blurhash?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          exif_data?: Json | null
          file_size: number
          height: number
          id?: string
          is_public?: boolean
          mime_type: string
          original_filename?: string | null
          short_id?: string
          sort_order?: number | null
          storage_path: string
          title?: string | null
          url: string
          user_id?: string | null
          width: number
        }
        Update: {
          blurhash?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          exif_data?: Json | null
          file_size?: number
          height?: number
          id?: string
          is_public?: boolean
          mime_type?: string
          original_filename?: string | null
          short_id?: string
          sort_order?: number | null
          storage_path?: string
          title?: string | null
          url?: string
          user_id?: string | null
          width?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          album_card_style: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          last_logged_in: string | null
          newsletter_opt_in: boolean
          nickname: string | null
          social_links: Json | null
          suspended_at: string | null
          suspended_reason: string | null
          theme: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          album_card_style?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          last_logged_in?: string | null
          newsletter_opt_in?: boolean
          nickname?: string | null
          social_links?: Json | null
          suspended_at?: string | null
          suspended_reason?: string | null
          theme?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          album_card_style?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_logged_in?: string | null
          newsletter_opt_in?: boolean
          nickname?: string | null
          social_links?: Json | null
          suspended_at?: string | null
          suspended_reason?: string | null
          theme?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      album_photos_active: {
        Row: {
          album_id: string | null
          created_at: string | null
          description: string | null
          height: number | null
          id: string | null
          photo_id: string | null
          photo_url: string | null
          sort_order: number | null
          title: string | null
          width: number | null
        }
        Relationships: [
          {
            foreignKeyName: "album_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_photos_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_album_photos_photo_url"
            columns: ["photo_url"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["url"]
          },
        ]
      }
    }
    Functions: {
      add_comment: {
        Args: {
          p_comment_text: string
          p_entity_id: string
          p_entity_type: string
        }
        Returns: string
      }
      add_photos_to_album: {
        Args: { p_album_id: string; p_photo_ids: string[] }
        Returns: number
      }
      admin_delete_album: { Args: { p_album_id: string }; Returns: boolean }
      batch_update_album_photos: {
        Args: { photo_updates: Json }
        Returns: undefined
      }
      batch_update_photos: { Args: { photo_updates: Json }; Returns: undefined }
      bulk_delete_photos: { Args: { p_photo_ids: string[] }; Returns: number }
      bulk_remove_from_album: {
        Args: { p_album_photo_ids: string[] }
        Returns: number
      }
      cleanup_expired_auth_tokens: { Args: never; Returns: undefined }
      delete_album: { Args: { p_album_id: string }; Returns: boolean }
      generate_short_id: { Args: { size?: number }; Returns: string }
      get_album_photo_count: { Args: { album_uuid: string }; Returns: number }
      get_user_album_photos_count: {
        Args: { user_uuid: string }
        Returns: number
      }
      restore_album: { Args: { p_album_id: string }; Returns: boolean }
      restore_comment: { Args: { p_comment_id: string }; Returns: boolean }
      restore_photo: { Args: { p_photo_id: string }; Returns: boolean }
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
} as const;
