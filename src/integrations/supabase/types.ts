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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          banner_image_model: string
          banner_images_enabled: boolean
          id: number
          special_edition_banners_enabled: boolean
          updated_at: string
        }
        Insert: {
          banner_image_model?: string
          banner_images_enabled?: boolean
          id?: number
          special_edition_banners_enabled?: boolean
          updated_at?: string
        }
        Update: {
          banner_image_model?: string
          banner_images_enabled?: boolean
          id?: number
          special_edition_banners_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content_de: string
          content_en: string
          created_at: string
          icon: string
          id: string
          is_system: boolean
          nav_order: number
          published: boolean
          show_in_nav: boolean
          slug: string
          title_de: string
          title_en: string
          updated_at: string
        }
        Insert: {
          content_de?: string
          content_en?: string
          created_at?: string
          icon?: string
          id?: string
          is_system?: boolean
          nav_order?: number
          published?: boolean
          show_in_nav?: boolean
          slug: string
          title_de?: string
          title_en?: string
          updated_at?: string
        }
        Update: {
          content_de?: string
          content_en?: string
          created_at?: string
          icon?: string
          id?: string
          is_system?: boolean
          nav_order?: number
          published?: boolean
          show_in_nav?: boolean
          slug?: string
          title_de?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_sender_config: {
        Row: {
          id: string
          organization: string
          reply_to_email: string
          sender_email: string
          sender_name: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization?: string
          reply_to_email?: string
          sender_email?: string
          sender_name?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization?: string
          reply_to_email?: string
          sender_email?: string
          sender_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      ethical_perspectives: {
        Row: {
          color_bg: string
          color_border: string
          color_heading: string
          color_text: string
          created_at: string
          description: string
          enabled: boolean
          icon: string
          id: string
          name: string
          prompt_instruction: string
          sort_order: number
        }
        Insert: {
          color_bg?: string
          color_border?: string
          color_heading?: string
          color_text?: string
          created_at?: string
          description?: string
          enabled?: boolean
          icon?: string
          id?: string
          name: string
          prompt_instruction?: string
          sort_order?: number
        }
        Update: {
          color_bg?: string
          color_border?: string
          color_heading?: string
          color_text?: string
          created_at?: string
          description?: string
          enabled?: boolean
          icon?: string
          id?: string
          name?: string
          prompt_instruction?: string
          sort_order?: number
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          created_at: string
          id: string
          language: string
          report_data: Json
          schedule_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          report_data: Json
          schedule_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          report_data?: Json
          schedule_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "report_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      impressum: {
        Row: {
          additional_info: string
          address: string
          company_name: string
          contact_email: string
          contact_phone: string
          id: string
          managing_director: string
          register_court: string
          register_number: string
          updated_at: string
          vat_id: string
        }
        Insert: {
          additional_info?: string
          address?: string
          company_name?: string
          contact_email?: string
          contact_phone?: string
          id?: string
          managing_director?: string
          register_court?: string
          register_number?: string
          updated_at?: string
          vat_id?: string
        }
        Update: {
          additional_info?: string
          address?: string
          company_name?: string
          contact_email?: string
          contact_phone?: string
          id?: string
          managing_director?: string
          register_court?: string
          register_number?: string
          updated_at?: string
          vat_id?: string
        }
        Relationships: []
      }
      nav_menu_order: {
        Row: {
          created_at: string
          id: string
          item_key: string
          sort_order: number
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          item_key: string
          sort_order?: number
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string
          sort_order?: number
          visible?: boolean
        }
        Relationships: []
      }
      news_sources: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          url?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          notify_announcements: boolean
          notify_daily_reports: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_announcements?: boolean
          notify_daily_reports?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_announcements?: boolean
          notify_daily_reports?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          preferred_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reflection_likes: {
        Row: {
          client_id: string
          created_at: string
          id: string
          report_id: string
          theme_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          report_id: string
          theme_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          report_id?: string
          theme_id?: string
        }
        Relationships: []
      }
      report_schedules: {
        Row: {
          ai_model: string
          articles_per_source: number
          created_at: string
          enabled: boolean
          frequency: string
          id: string
          language: string
          last_run_at: string | null
          max_articles: number
          mondcivitan_enabled: boolean
          report_style: string
          schweitzer_enabled: boolean
          source_ids: string[]
          target_themes: number
        }
        Insert: {
          ai_model?: string
          articles_per_source?: number
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          language?: string
          last_run_at?: string | null
          max_articles?: number
          mondcivitan_enabled?: boolean
          report_style?: string
          schweitzer_enabled?: boolean
          source_ids?: string[]
          target_themes?: number
        }
        Update: {
          ai_model?: string
          articles_per_source?: number
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          language?: string
          last_run_at?: string | null
          max_articles?: number
          mondcivitan_enabled?: boolean
          report_style?: string
          schweitzer_enabled?: boolean
          source_ids?: string[]
          target_themes?: number
        }
        Relationships: []
      }
      special_editions: {
        Row: {
          approved_at: string | null
          created_at: string
          created_by: string | null
          id: string
          language: string
          notified_at: string | null
          notified_count: number
          report_data: Json
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          notified_at?: string | null
          notified_count?: number
          report_data: Json
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          notified_at?: string | null
          notified_count?: number
          report_data?: Json
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_comments: {
        Row: {
          admin_reply: string | null
          admin_reply_sent: boolean
          ai_response: string | null
          created_at: string
          id: string
          question: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_sent?: boolean
          ai_response?: string | null
          created_at?: string
          id?: string
          question: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          admin_reply_sent?: boolean
          ai_response?: string | null
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
