export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_accounts: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          is_super_admin: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_super_admin?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_super_admin?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      document_tokens: {
        Row: {
          created_at: string
          document_content: string
          document_type: string
          id: string
          price: number
          sla_deadline: string | null
          sla_hours: number | null
          sla_status: string | null
          status: Database["public"]["Enums"]["document_status"]
          token: string
          updated_at: string
          user_email: string | null
          user_name: string | null
          user_observation_date: string | null
          user_observations: string | null
        }
        Insert: {
          created_at?: string
          document_content: string
          document_type: string
          id?: string
          price: number
          sla_deadline?: string | null
          sla_hours?: number | null
          sla_status?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          token: string
          updated_at?: string
          user_email?: string | null
          user_name?: string | null
          user_observation_date?: string | null
          user_observations?: string | null
        }
        Update: {
          created_at?: string
          document_content?: string
          document_type?: string
          id?: string
          price?: number
          sla_deadline?: string | null
          sla_hours?: number | null
          sla_status?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          token?: string
          updated_at?: string
          user_email?: string | null
          user_name?: string | null
          user_observation_date?: string | null
          user_observations?: string | null
        }
        Relationships: []
      }
      lawyer_token_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          law_firm: string | null
          phone_number: string | null
          reason_for_request: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialization: string | null
          status: string
          updated_at: string
          years_of_experience: number | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          law_firm?: string | null
          phone_number?: string | null
          reason_for_request?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          years_of_experience?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          law_firm?: string | null
          phone_number?: string | null
          reason_for_request?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      lawyer_tokens: {
        Row: {
          access_token: string
          active: boolean
          can_create_agents: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          lawyer_id: string
          phone_number: string | null
          request_id: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          active?: boolean
          can_create_agents?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          last_login_at?: string | null
          lawyer_id: string
          phone_number?: string | null
          request_id?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          active?: boolean
          can_create_agents?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          lawyer_id?: string
          phone_number?: string | null
          request_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_tokens_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "lawyer_token_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_agents: {
        Row: {
          ai_prompt: string
          button_cta: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          document_description: string | null
          document_name: string | null
          final_price: number | null
          frontend_icon: string | null
          id: string
          name: string
          placeholder_fields: Json
          price_justification: string | null
          sla_enabled: boolean | null
          sla_hours: number | null
          status: string
          suggested_price: number
          target_audience: string | null
          template_content: string
          updated_at: string
        }
        Insert: {
          ai_prompt: string
          button_cta?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          document_description?: string | null
          document_name?: string | null
          final_price?: number | null
          frontend_icon?: string | null
          id?: string
          name: string
          placeholder_fields?: Json
          price_justification?: string | null
          sla_enabled?: boolean | null
          sla_hours?: number | null
          status?: string
          suggested_price: number
          target_audience?: string | null
          template_content: string
          updated_at?: string
        }
        Update: {
          ai_prompt?: string
          button_cta?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          document_description?: string | null
          document_name?: string | null
          final_price?: number | null
          frontend_icon?: string | null
          id?: string
          name?: string
          placeholder_fields?: Json
          price_justification?: string | null
          sla_enabled?: boolean | null
          sla_hours?: number | null
          status?: string
          suggested_price?: number
          target_audience?: string | null
          template_content?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "lawyer_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          restaurant_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          restaurant_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          restaurant_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_status:
        | "solicitado"
        | "en_revision_abogado"
        | "revisado"
        | "pagado"
        | "descargado"
        | "revision_usuario"
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
      document_status: [
        "solicitado",
        "en_revision_abogado",
        "revisado",
        "pagado",
        "descargado",
        "revision_usuario",
      ],
    },
  },
} as const
