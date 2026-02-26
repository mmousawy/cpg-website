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
            foreignKeyName: 'album_comments_album_id_fkey1'
            columns: ['album_id']
            isOneToOne: false
            referencedRelation: 'albums'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'album_comments_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
        ]
      }
      album_likes: {
        Row: {
          album_id: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          album_id: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          album_id?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'album_likes_album_id_fkey'
            columns: ['album_id']
            isOneToOne: false
            referencedRelation: 'albums'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'album_likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      album_photos: {
        Row: {
          added_by: string | null
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
          added_by?: string | null
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
          added_by?: string | null
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
            foreignKeyName: 'album_photos_added_by_fkey'
            columns: ['added_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'album_photos_album_id_fkey'
            columns: ['album_id']
            isOneToOne: false
            referencedRelation: 'albums'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'album_photos_photo_id_fkey'
            columns: ['photo_id']
            isOneToOne: false
            referencedRelation: 'photos'
            referencedColumns: ['id']
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
            foreignKeyName: 'album_tags_album_id_fkey'
            columns: ['album_id']
            isOneToOne: false
            referencedRelation: 'albums'
            referencedColumns: ['id']
          },
        ]
      }
      album_views: {
        Row: {
          album_id: string
          id: string
          viewed_at: string
        }
        Insert: {
          album_id: string
          id?: string
          viewed_at?: string
        }
        Update: {
          album_id?: string
          id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'album_views_album_id_fkey'
            columns: ['album_id']
            isOneToOne: false
            referencedRelation: 'albums'
            referencedColumns: ['id']
          },
        ]
      }
      albums: {
        Row: {
          cover_image_url: string | null
          cover_is_manual: boolean | null
          created_at: string | null
          created_by_system: boolean
          deleted_at: string | null
          description: string | null
          event_id: number | null
          id: string
          is_public: boolean | null
          is_shared: boolean
          is_suspended: boolean | null
          join_policy: string | null
          likes_count: number
          max_photos_per_user: number | null
          search_vector: unknown
          slug: string
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          view_count: number
        }
        Insert: {
          cover_image_url?: string | null
          cover_is_manual?: boolean | null
          created_at?: string | null
          created_by_system?: boolean
          deleted_at?: string | null
          description?: string | null
          event_id?: number | null
          id?: string
          is_public?: boolean | null
          is_shared?: boolean
          is_suspended?: boolean | null
          join_policy?: string | null
          likes_count?: number
          max_photos_per_user?: number | null
          search_vector?: unknown
          slug: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          view_count?: number
        }
        Update: {
          cover_image_url?: string | null
          cover_is_manual?: boolean | null
          created_at?: string | null
          created_by_system?: boolean
          deleted_at?: string | null
          description?: string | null
          event_id?: number | null
          id?: string
          is_public?: boolean | null
          is_shared?: boolean
          is_suspended?: boolean | null
          join_policy?: string | null
          likes_count?: number
          max_photos_per_user?: number | null
          search_vector?: unknown
          slug?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'albums_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'albums_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
      challenge_announcements: {
        Row: {
          announced_by: string
          challenge_id: string
          created_at: string
          id: string
          recipient_count: number
        }
        Insert: {
          announced_by: string
          challenge_id: string
          created_at?: string
          id?: string
          recipient_count?: number
        }
        Update: {
          announced_by?: string
          challenge_id?: string
          created_at?: string
          id?: string
          recipient_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'challenge_announcements_announced_by_fkey'
            columns: ['announced_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_announcements_challenge_id_fkey'
            columns: ['challenge_id']
            isOneToOne: false
            referencedRelation: 'challenges'
            referencedColumns: ['id']
          },
        ]
      }
      challenge_comments: {
        Row: {
          challenge_id: string
          comment_id: string
        }
        Insert: {
          challenge_id: string
          comment_id: string
        }
        Update: {
          challenge_id?: string
          comment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'challenge_comments_challenge_id_fkey'
            columns: ['challenge_id']
            isOneToOne: false
            referencedRelation: 'challenges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_comments_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
        ]
      }
      challenge_submissions: {
        Row: {
          challenge_id: string
          id: string
          photo_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          photo_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          photo_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'challenge_submissions_challenge_id_fkey'
            columns: ['challenge_id']
            isOneToOne: false
            referencedRelation: 'challenges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_submissions_photo_id_fkey'
            columns: ['photo_id']
            isOneToOne: false
            referencedRelation: 'photos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_submissions_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_submissions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      challenges: {
        Row: {
          announced_at: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          image_blurhash: string | null
          image_height: number | null
          image_width: number | null
          is_active: boolean
          max_photos_per_user: number | null
          prompt: string
          slug: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          announced_at?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          image_blurhash?: string | null
          image_height?: number | null
          image_width?: number | null
          is_active?: boolean
          max_photos_per_user?: number | null
          prompt: string
          slug: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          announced_at?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          image_blurhash?: string | null
          image_height?: number | null
          image_width?: number | null
          is_active?: boolean
          max_photos_per_user?: number | null
          prompt?: string
          slug?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'challenges_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      comments: {
        Row: {
          comment_text: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_parent_comment_id_fkey'
            columns: ['parent_comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
            foreignKeyName: 'email_preferences_email_type_id_fkey'
            columns: ['email_type_id']
            isOneToOne: false
            referencedRelation: 'email_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'email_preferences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
            foreignKeyName: 'event_announcements_announced_by_fkey'
            columns: ['announced_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_announcements_event_id_fkey'
            columns: ['event_id']
            isOneToOne: true
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      event_comments: {
        Row: {
          comment_id: string
          event_id: number
        }
        Insert: {
          comment_id: string
          event_id: number
        }
        Update: {
          comment_id?: string
          event_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'event_comments_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_comments_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: {
          attendee_reminder_sent_at: string | null
          cover_image: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: number
          image_blurhash: string | null
          image_height: number | null
          image_width: number | null
          location: string | null
          max_attendees: number | null
          rsvp_count: number | null
          rsvp_reminder_sent_at: string | null
          search_vector: unknown
          slug: string
          time: string | null
          title: string | null
        }
        Insert: {
          attendee_reminder_sent_at?: string | null
          cover_image?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: number
          image_blurhash?: string | null
          image_height?: number | null
          image_width?: number | null
          location?: string | null
          max_attendees?: number | null
          rsvp_count?: number | null
          rsvp_reminder_sent_at?: string | null
          search_vector?: unknown
          slug: string
          time?: string | null
          title?: string | null
        }
        Update: {
          attendee_reminder_sent_at?: string | null
          cover_image?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: number
          image_blurhash?: string | null
          image_height?: number | null
          image_width?: number | null
          location?: string | null
          max_attendees?: number | null
          rsvp_count?: number | null
          rsvp_reminder_sent_at?: string | null
          search_vector?: unknown
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
            foreignKeyName: 'events_rsvps_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_rsvps_user_id_profiles_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      interests: {
        Row: {
          count: number | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          count?: number | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          data: Json | null
          dismissed_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          seen_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          data?: Json | null
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          seen_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          data?: Json | null
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          seen_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
            foreignKeyName: 'photo_comments_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'photo_comments_photo_id_fkey'
            columns: ['photo_id']
            isOneToOne: false
            referencedRelation: 'photos'
            referencedColumns: ['id']
          },
        ]
      }
      photo_likes: {
        Row: {
          created_at: string | null
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'photo_likes_photo_id_fkey'
            columns: ['photo_id']
            isOneToOne: false
            referencedRelation: 'photos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'photo_likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      photo_tags: {
        Row: {
          created_at: string | null
          id: string
          photo_id: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_id: string
          tag: string
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: 'photo_tags_photo_id_fkey'
            columns: ['photo_id']
            isOneToOne: false
            referencedRelation: 'photos'
            referencedColumns: ['id']
          },
        ]
      }
      photo_views: {
        Row: {
          id: string
          photo_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          photo_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          photo_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'photo_views_photo_id_fkey'
            columns: ['photo_id']
            isOneToOne: false
            referencedRelation: 'photos'
            referencedColumns: ['id']
          },
        ]
      }
      photos: {
        Row: {
          blurhash: string | null
          copyright_notice: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          exif_data: Json | null
          file_size: number
          height: number
          id: string
          is_public: boolean
          license: Database['public']['Enums']['license_type']
          likes_count: number
          mime_type: string
          original_filename: string | null
          search_vector: unknown
          short_id: string
          sort_order: number | null
          storage_path: string
          title: string | null
          url: string
          user_id: string | null
          view_count: number
          width: number
        }
        Insert: {
          blurhash?: string | null
          copyright_notice?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          exif_data?: Json | null
          file_size: number
          height: number
          id?: string
          is_public?: boolean
          license?: Database['public']['Enums']['license_type']
          likes_count?: number
          mime_type: string
          original_filename?: string | null
          search_vector?: unknown
          short_id?: string
          sort_order?: number | null
          storage_path: string
          title?: string | null
          url: string
          user_id?: string | null
          view_count?: number
          width: number
        }
        Update: {
          blurhash?: string | null
          copyright_notice?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          exif_data?: Json | null
          file_size?: number
          height?: number
          id?: string
          is_public?: boolean
          license?: Database['public']['Enums']['license_type']
          likes_count?: number
          mime_type?: string
          original_filename?: string | null
          search_vector?: unknown
          short_id?: string
          sort_order?: number | null
          storage_path?: string
          title?: string | null
          url?: string
          user_id?: string | null
          view_count?: number
          width?: number
        }
        Relationships: []
      }
      profile_interests: {
        Row: {
          created_at: string | null
          id: string
          interest: string
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interest: string
          profile_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interest?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profile_interests_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          album_card_style: string | null
          avatar_url: string | null
          bio: string | null
          copyright_name: string | null
          created_at: string | null
          default_license: Database['public']['Enums']['license_type']
          email: string | null
          embed_copyright_exif: boolean
          exif_copyright_text: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          last_logged_in: string | null
          newsletter_opt_in: boolean
          nickname: string | null
          search_vector: unknown
          social_links: Json | null
          suspended_at: string | null
          suspended_reason: string | null
          terms_accepted_at: string | null
          theme: string | null
          updated_at: string | null
          watermark_enabled: boolean
          watermark_style: string | null
          watermark_text: string | null
          website: string | null
        }
        Insert: {
          album_card_style?: string | null
          avatar_url?: string | null
          bio?: string | null
          copyright_name?: string | null
          created_at?: string | null
          default_license?: Database['public']['Enums']['license_type']
          email?: string | null
          embed_copyright_exif?: boolean
          exif_copyright_text?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          last_logged_in?: string | null
          newsletter_opt_in?: boolean
          nickname?: string | null
          search_vector?: unknown
          social_links?: Json | null
          suspended_at?: string | null
          suspended_reason?: string | null
          terms_accepted_at?: string | null
          theme?: string | null
          updated_at?: string | null
          watermark_enabled?: boolean
          watermark_style?: string | null
          watermark_text?: string | null
          website?: string | null
        }
        Update: {
          album_card_style?: string | null
          avatar_url?: string | null
          bio?: string | null
          copyright_name?: string | null
          created_at?: string | null
          default_license?: Database['public']['Enums']['license_type']
          email?: string | null
          embed_copyright_exif?: boolean
          exif_copyright_text?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_logged_in?: string | null
          newsletter_opt_in?: boolean
          nickname?: string | null
          search_vector?: unknown
          social_links?: Json | null
          suspended_at?: string | null
          suspended_reason?: string | null
          terms_accepted_at?: string | null
          theme?: string | null
          updated_at?: string | null
          watermark_enabled?: boolean
          watermark_style?: string | null
          watermark_text?: string | null
          website?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          entity_id: string
          entity_type: string
          id: string
          reason: string
          reporter_email: string | null
          reporter_id: string | null
          reporter_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          entity_id: string
          entity_type: string
          id?: string
          reason: string
          reporter_email?: string | null
          reporter_id?: string | null
          reporter_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string
          reporter_email?: string | null
          reporter_id?: string | null
          reporter_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      shared_album_members: {
        Row: {
          album_id: string
          created_at: string
          id: number
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          album_id: string
          created_at?: string
          id?: number
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          album_id?: string
          created_at?: string
          id?: number
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shared_album_members_album_id_fkey'
            columns: ['album_id']
            isOneToOne: false
            referencedRelation: 'albums'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shared_album_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      shared_album_requests: {
        Row: {
          album_id: string
          created_at: string
          id: number
          initiated_by: string
          resolved_at: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          album_id: string
          created_at?: string
          id?: number
          initiated_by: string
          resolved_at?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          album_id?: string
          created_at?: string
          id?: number
          initiated_by?: string
          resolved_at?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shared_album_requests_album_id_fkey'
            columns: ['album_id']
            isOneToOne: false
            referencedRelation: 'albums'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shared_album_requests_initiated_by_fkey'
            columns: ['initiated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shared_album_requests_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      tags: {
        Row: {
          count: number | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          count?: number | null
          created_at?: string | null
          id?: string
          name?: string
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
            foreignKeyName: 'album_photos_album_id_fkey'
            columns: ['album_id']
            isOneToOne: false
            referencedRelation: 'albums'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'album_photos_photo_id_fkey'
            columns: ['photo_id']
            isOneToOne: false
            referencedRelation: 'photos'
            referencedColumns: ['id']
          },
        ]
      }
      challenge_photos: {
        Row: {
          blurhash: string | null
          challenge_id: string | null
          height: number | null
          photo_id: string | null
          profile_avatar_url: string | null
          profile_full_name: string | null
          profile_nickname: string | null
          reviewed_at: string | null
          short_id: string | null
          submitted_at: string | null
          title: string | null
          url: string | null
          user_id: string | null
          width: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'challenge_submissions_challenge_id_fkey'
            columns: ['challenge_id']
            isOneToOne: false
            referencedRelation: 'challenges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_submissions_photo_id_fkey'
            columns: ['photo_id']
            isOneToOne: false
            referencedRelation: 'photos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_submissions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      add_challenge_comment: {
        Args: {
          p_challenge_id: string
          p_comment_text: string
          p_parent_comment_id?: string
        }
        Returns: string
      }
      add_comment: {
        Args: {
          p_comment_text: string
          p_entity_id: string
          p_entity_type: string
          p_parent_comment_id?: string
        }
        Returns: string
      }
      add_event_comment: {
        Args: {
          p_comment_text: string
          p_event_id: number
          p_parent_comment_id?: string
        }
        Returns: string
      }
      add_photos_to_album: {
        Args: { p_album_id: string; p_photo_ids: string[] }
        Returns: number
      }
      add_photos_to_shared_album: {
        Args: { p_album_id: string; p_photo_ids: string[] }
        Returns: number
      }
      add_shared_album_owner: {
        Args: { p_album_id: string }
        Returns: undefined
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
      bulk_review_challenge_submissions: {
        Args: {
          p_rejection_reason?: string
          p_status: string
          p_submission_ids: string[]
        }
        Returns: number
      }
      cleanup_expired_auth_tokens: { Args: never; Returns: undefined }
      create_event_album: { Args: { p_event_id: number }; Returns: string }
      delete_album: { Args: { p_album_id: string }; Returns: boolean }
      generate_short_id: { Args: { size?: number }; Returns: string }
      get_album_photo_count: { Args: { album_uuid: string }; Returns: number }
      get_profile_stats: { Args: { p_user_id: string }; Returns: Json }
      get_user_album_photos_count: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_user_stats: { Args: { p_user_id: string }; Returns: Json }
      global_search: {
        Args: {
          result_limit?: number
          search_query: string
          search_types?: string[]
        }
        Returns: {
          entity_id: string
          entity_type: string
          image_url: string
          rank: number
          subtitle: string
          title: string
          url: string
        }[]
      }
      increment_view_count: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: undefined
      }
      invite_to_shared_album: {
        Args: { p_album_id: string; p_user_ids: string[] }
        Returns: Json
      }
      is_shared_album_member: {
        Args: { p_album_id: string; p_user_id: string }
        Returns: boolean
      }
      join_shared_album: { Args: { p_album_id: string }; Returns: Json }
      leave_shared_album: { Args: { p_album_id: string }; Returns: undefined }
      remove_album_member: {
        Args: { p_album_id: string; p_user_id: string }
        Returns: undefined
      }
      remove_shared_album_photo: {
        Args: { p_album_id: string; p_album_photo_ids: string[] }
        Returns: number
      }
      resolve_album_request: {
        Args: { p_action: string; p_request_id: number }
        Returns: undefined
      }
      restore_album: { Args: { p_album_id: string }; Returns: boolean }
      restore_comment: { Args: { p_comment_id: string }; Returns: boolean }
      restore_photo: { Args: { p_photo_id: string }; Returns: boolean }
      review_challenge_submission: {
        Args: {
          p_rejection_reason?: string
          p_status: string
          p_submission_id: string
        }
        Returns: undefined
      }
      submit_to_challenge: {
        Args: { p_challenge_id: string; p_photo_ids: string[] }
        Returns: number
      }
    }
    Enums: {
      license_type:
        | 'all-rights-reserved'
        | 'cc-by-nc-nd-4.0'
        | 'cc-by-nc-4.0'
        | 'cc-by-4.0'
        | 'cc0'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      license_type: [
        'all-rights-reserved',
        'cc-by-nc-nd-4.0',
        'cc-by-nc-4.0',
        'cc-by-4.0',
        'cc0',
      ],
    },
  },
} as const;

