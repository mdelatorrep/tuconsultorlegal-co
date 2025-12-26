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
    PostgrestVersion: "13.0.5"
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
      admin_profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          is_super_admin: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_super_admin?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_super_admin?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_conversations: {
        Row: {
          conversation_data: Json | null
          created_at: string
          document_token_id: string | null
          id: string
          openai_agent_id: string | null
          status: string
          thread_id: string
          updated_at: string
          user_session_id: string | null
        }
        Insert: {
          conversation_data?: Json | null
          created_at?: string
          document_token_id?: string | null
          id?: string
          openai_agent_id?: string | null
          status?: string
          thread_id: string
          updated_at?: string
          user_session_id?: string | null
        }
        Update: {
          conversation_data?: Json | null
          created_at?: string
          document_token_id?: string | null
          id?: string
          openai_agent_id?: string | null
          status?: string
          thread_id?: string
          updated_at?: string
          user_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_document_token_id_fkey"
            columns: ["document_token_id"]
            isOneToOne: false
            referencedRelation: "document_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_openai_agent_id_fkey"
            columns: ["openai_agent_id"]
            isOneToOne: false
            referencedRelation: "openai_agent_analytics"
            referencedColumns: ["openai_agent_id"]
          },
          {
            foreignKeyName: "agent_conversations_openai_agent_id_fkey"
            columns: ["openai_agent_id"]
            isOneToOne: false
            referencedRelation: "openai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_draft_blocks: {
        Row: {
          agent_draft_id: string
          block_name: string
          block_order: number
          created_at: string
          id: string
          intro_phrase: string
          placeholders: Json
          updated_at: string
        }
        Insert: {
          agent_draft_id: string
          block_name: string
          block_order?: number
          created_at?: string
          id?: string
          intro_phrase: string
          placeholders?: Json
          updated_at?: string
        }
        Update: {
          agent_draft_id?: string
          block_name?: string
          block_order?: number
          created_at?: string
          id?: string
          intro_phrase?: string
          placeholders?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_draft_blocks_agent_draft_id_fkey"
            columns: ["agent_draft_id"]
            isOneToOne: false
            referencedRelation: "agent_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_draft_field_instructions: {
        Row: {
          agent_draft_id: string
          created_at: string
          field_name: string
          help_text: string | null
          id: string
          updated_at: string
          validation_rule: string | null
        }
        Insert: {
          agent_draft_id: string
          created_at?: string
          field_name: string
          help_text?: string | null
          id?: string
          updated_at?: string
          validation_rule?: string | null
        }
        Update: {
          agent_draft_id?: string
          created_at?: string
          field_name?: string
          help_text?: string | null
          id?: string
          updated_at?: string
          validation_rule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_draft_field_instructions_agent_draft_id_fkey"
            columns: ["agent_draft_id"]
            isOneToOne: false
            referencedRelation: "agent_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_drafts: {
        Row: {
          ai_results: Json | null
          created_at: string
          doc_cat: string | null
          doc_desc: string | null
          doc_name: string | null
          doc_template: string | null
          draft_name: string
          id: string
          initial_prompt: string | null
          lawyer_id: string
          lawyer_suggested_price: string | null
          sla_enabled: boolean | null
          sla_hours: number | null
          step_completed: number
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          ai_results?: Json | null
          created_at?: string
          doc_cat?: string | null
          doc_desc?: string | null
          doc_name?: string | null
          doc_template?: string | null
          draft_name: string
          id?: string
          initial_prompt?: string | null
          lawyer_id: string
          lawyer_suggested_price?: string | null
          sla_enabled?: boolean | null
          sla_hours?: number | null
          step_completed?: number
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          ai_results?: Json | null
          created_at?: string
          doc_cat?: string | null
          doc_desc?: string | null
          doc_name?: string | null
          doc_template?: string | null
          draft_name?: string
          id?: string
          initial_prompt?: string | null
          lawyer_id?: string
          lawyer_suggested_price?: string | null
          sla_enabled?: boolean | null
          sla_hours?: number | null
          step_completed?: number
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_workflows: {
        Row: {
          agents_config: Json
          created_at: string
          description: string | null
          execution_steps: Json
          id: string
          is_active: boolean
          name: string
          updated_at: string
          workflow_type: string
        }
        Insert: {
          agents_config?: Json
          created_at?: string
          description?: string | null
          execution_steps?: Json
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          workflow_type: string
        }
        Update: {
          agents_config?: Json
          created_at?: string
          description?: string | null
          execution_steps?: Json
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          workflow_type?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          reading_time: number | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time?: number | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time?: number | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      case_predictions: {
        Row: {
          ai_analysis: string | null
          case_description: string
          case_id: string | null
          case_type: string
          court_type: string | null
          created_at: string | null
          id: string
          jurisdiction: string | null
          lawyer_id: string
          prediction_result: Json | null
          recommended_arguments: Json | null
          risk_factors: Json | null
        }
        Insert: {
          ai_analysis?: string | null
          case_description: string
          case_id?: string | null
          case_type: string
          court_type?: string | null
          created_at?: string | null
          id?: string
          jurisdiction?: string | null
          lawyer_id: string
          prediction_result?: Json | null
          recommended_arguments?: Json | null
          risk_factors?: Json | null
        }
        Update: {
          ai_analysis?: string | null
          case_description?: string
          case_id?: string | null
          case_type?: string
          court_type?: string | null
          created_at?: string | null
          id?: string
          jurisdiction?: string | null
          lawyer_id?: string
          prediction_result?: Json | null
          recommended_arguments?: Json | null
          risk_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "case_predictions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "crm_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_predictions_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_appointments: {
        Row: {
          case_id: string | null
          client_id: string
          client_notes: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          lawyer_id: string
          lawyer_notes: string | null
          location: string | null
          meeting_url: string | null
          reminder_sent: boolean | null
          scheduled_at: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          case_id?: string | null
          client_id: string
          client_notes?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lawyer_id: string
          lawyer_notes?: string | null
          location?: string | null
          meeting_url?: string | null
          reminder_sent?: boolean | null
          scheduled_at: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          case_id?: string | null
          client_id?: string
          client_notes?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lawyer_id?: string
          lawyer_notes?: string | null
          location?: string | null
          meeting_url?: string | null
          reminder_sent?: boolean | null
          scheduled_at?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_appointments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "crm_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_appointments_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access: {
        Row: {
          access_token: string
          client_id: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_access_at: string | null
          lawyer_id: string
        }
        Insert: {
          access_token: string
          client_id: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_access_at?: string | null
          lawyer_id: string
        }
        Update: {
          access_token?: string
          client_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_access_at?: string | null
          lawyer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_access_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_shared_documents: {
        Row: {
          client_id: string
          created_at: string | null
          document_name: string
          document_type: string | null
          document_url: string | null
          file_size: number | null
          id: string
          is_from_client: boolean | null
          lawyer_id: string
          notes: string | null
          viewed_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          document_name: string
          document_type?: string | null
          document_url?: string | null
          file_size?: number | null
          id?: string
          is_from_client?: boolean | null
          lawyer_id: string
          notes?: string | null
          viewed_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          document_name?: string
          document_type?: string | null
          document_url?: string | null
          file_size?: number | null
          id?: string
          is_from_client?: boolean | null
          lawyer_id?: string
          notes?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_shared_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_shared_documents_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colombian_holidays: {
        Row: {
          fecha: string
          id: string
          nombre: string
          tipo: string | null
          year: number | null
        }
        Insert: {
          fecha: string
          id?: string
          nombre: string
          tipo?: string | null
          year?: number | null
        }
        Update: {
          fecha?: string
          id?: string
          nombre?: string
          tipo?: string | null
          year?: number | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          consultation_type: string
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          consultation_type?: string
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          consultation_type?: string
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_blocks: {
        Row: {
          block_name: string
          block_order: number
          created_at: string
          id: string
          intro_phrase: string
          legal_agent_id: string | null
          placeholders: Json
          updated_at: string
        }
        Insert: {
          block_name: string
          block_order?: number
          created_at?: string
          id?: string
          intro_phrase: string
          legal_agent_id?: string | null
          placeholders?: Json
          updated_at?: string
        }
        Update: {
          block_name?: string
          block_order?: number
          created_at?: string
          id?: string
          intro_phrase?: string
          legal_agent_id?: string | null
          placeholders?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_blocks_legal_agent_id_fkey"
            columns: ["legal_agent_id"]
            isOneToOne: false
            referencedRelation: "legal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_blocks_legal_agent_id_fkey"
            columns: ["legal_agent_id"]
            isOneToOne: false
            referencedRelation: "openai_agent_analytics"
            referencedColumns: ["legal_agent_id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          bonus_credits: number
          created_at: string
          credits: number
          description: string | null
          discount_percentage: number | null
          display_order: number
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          price_cop: number
          updated_at: string
        }
        Insert: {
          bonus_credits?: number
          created_at?: string
          credits: number
          description?: string | null
          discount_percentage?: number | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          price_cop: number
          updated_at?: string
        }
        Update: {
          bonus_credits?: number
          created_at?: string
          credits?: number
          description?: string | null
          discount_percentage?: number | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price_cop?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_tool_costs: {
        Row: {
          created_at: string
          credit_cost: number
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          tool_name: string
          tool_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_cost?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          tool_name: string
          tool_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_cost?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          tool_name?: string
          tool_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          lawyer_id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          lawyer_id: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          lawyer_id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_automation_rules: {
        Row: {
          actions: Json
          created_at: string
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_execution: string | null
          lawyer_id: string
          name: string
          trigger_conditions: Json | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_execution?: string | null
          lawyer_id: string
          name: string
          trigger_conditions?: Json | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_execution?: string | null
          lawyer_id?: string
          name?: string
          trigger_conditions?: Json | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_case_activities: {
        Row: {
          activity_date: string
          activity_type: string
          case_id: string
          created_at: string
          description: string | null
          id: string
          lawyer_id: string
          metadata: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_date?: string
          activity_type: string
          case_id: string
          created_at?: string
          description?: string | null
          id?: string
          lawyer_id: string
          metadata?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          case_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lawyer_id?: string
          metadata?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_case_activities_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "crm_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cases: {
        Row: {
          actual_hours: number | null
          billing_rate: number | null
          case_number: string | null
          case_type: string
          client_id: string
          created_at: string
          description: string | null
          end_date: string | null
          estimated_hours: number | null
          id: string
          lawyer_id: string
          priority: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          billing_rate?: number | null
          case_number?: string | null
          case_type: string
          client_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          lawyer_id: string
          priority?: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          billing_rate?: number | null
          case_number?: string | null
          case_type?: string
          client_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          lawyer_id?: string
          priority?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_client_segments: {
        Row: {
          ai_generated: boolean | null
          created_at: string
          criteria: Json
          description: string | null
          id: string
          is_active: boolean | null
          lawyer_id: string
          name: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          lawyer_id: string
          name: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          lawyer_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_clients: {
        Row: {
          address: string | null
          client_type: string
          company: string | null
          created_at: string
          email: string
          id: string
          lawyer_id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_type?: string
          company?: string | null
          created_at?: string
          email: string
          id?: string
          lawyer_id: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_type?: string
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          lawyer_id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_communications: {
        Row: {
          case_id: string | null
          client_id: string
          content: string
          created_at: string
          direction: string
          id: string
          lawyer_id: string
          metadata: Json | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subject: string | null
          type: string
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          client_id: string
          content: string
          created_at?: string
          direction?: string
          id?: string
          lawyer_id: string
          metadata?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          client_id?: string
          content?: string
          created_at?: string
          direction?: string
          id?: string
          lawyer_id?: string
          metadata?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_communications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "crm_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_documents: {
        Row: {
          case_id: string | null
          client_id: string
          created_at: string
          description: string | null
          document_type: string
          file_size: number | null
          file_url: string | null
          id: string
          is_confidential: boolean | null
          lawyer_id: string
          name: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          document_type: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_confidential?: boolean | null
          lawyer_id: string
          name: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          document_type?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_confidential?: boolean | null
          lawyer_id?: string
          name?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "crm_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          created_at: string | null
          email: string
          id: string
          lawyer_id: string
          message: string
          name: string
          origin: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          lawyer_id: string
          message: string
          name: string
          origin?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          lawyer_id?: string
          message?: string
          name?: string
          origin?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          case_id: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          lawyer_id: string
          metadata: Json | null
          priority: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lawyer_id: string
          metadata?: Json | null
          priority?: string
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lawyer_id?: string
          metadata?: Json | null
          priority?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "crm_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_document_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          document_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          urgency: string
          user_email: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          document_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          urgency?: string
          user_email: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          document_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          urgency?: string
          user_email?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          category_type: string | null
          color_class: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category_type?: string | null
          color_class?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category_type?: string | null
          color_class?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_tokens: {
        Row: {
          created_at: string
          document_content: string
          document_type: string
          form_data: Json | null
          id: string
          lawyer_comments: string | null
          lawyer_comments_date: string | null
          legal_agent_id: string | null
          price: number
          reviewed_by_lawyer_id: string | null
          reviewed_by_lawyer_name: string | null
          sla_deadline: string | null
          sla_hours: number | null
          sla_status: string | null
          status: Database["public"]["Enums"]["document_status"]
          token: string
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_observation_date: string | null
          user_observations: string | null
        }
        Insert: {
          created_at?: string
          document_content: string
          document_type: string
          form_data?: Json | null
          id?: string
          lawyer_comments?: string | null
          lawyer_comments_date?: string | null
          legal_agent_id?: string | null
          price: number
          reviewed_by_lawyer_id?: string | null
          reviewed_by_lawyer_name?: string | null
          sla_deadline?: string | null
          sla_hours?: number | null
          sla_status?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          token: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_observation_date?: string | null
          user_observations?: string | null
        }
        Update: {
          created_at?: string
          document_content?: string
          document_type?: string
          form_data?: Json | null
          id?: string
          lawyer_comments?: string | null
          lawyer_comments_date?: string | null
          legal_agent_id?: string | null
          price?: number
          reviewed_by_lawyer_id?: string | null
          reviewed_by_lawyer_name?: string | null
          sla_deadline?: string | null
          sla_hours?: number | null
          sla_status?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          token?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_observation_date?: string | null
          user_observations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_tokens_legal_agent_id_fkey"
            columns: ["legal_agent_id"]
            isOneToOne: false
            referencedRelation: "legal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tokens_legal_agent_id_fkey"
            columns: ["legal_agent_id"]
            isOneToOne: false
            referencedRelation: "openai_agent_analytics"
            referencedColumns: ["legal_agent_id"]
          },
          {
            foreignKeyName: "document_tokens_reviewed_by_lawyer_id_fkey"
            columns: ["reviewed_by_lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_configuration: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          smtp_from_email: string
          smtp_from_name: string
          smtp_host: string
          smtp_port: number
          smtp_secure: boolean
          smtp_user: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          smtp_from_email?: string
          smtp_from_name?: string
          smtp_host?: string
          smtp_port?: number
          smtp_secure?: boolean
          smtp_user?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          smtp_from_email?: string
          smtp_from_name?: string
          smtp_host?: string
          smtp_port?: number
          smtp_secure?: boolean
          smtp_user?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_notifications_log: {
        Row: {
          created_at: string
          document_token_id: string | null
          error_message: string | null
          id: string
          recipient_email: string
          recipient_type: string
          sent_at: string | null
          status: string
          subject: string
          template_key: string
        }
        Insert: {
          created_at?: string
          document_token_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_type: string
          sent_at?: string | null
          status?: string
          subject: string
          template_key: string
        }
        Update: {
          created_at?: string
          document_token_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_type?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_log_document_token_id_fkey"
            columns: ["document_token_id"]
            isOneToOne: false
            referencedRelation: "document_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          html_body: string
          id: string
          is_active: boolean
          subject: string
          template_key: string
          template_name: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          html_body: string
          id?: string
          is_active?: boolean
          subject: string
          template_key: string
          template_name: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          html_body?: string
          id?: string
          is_active?: boolean
          subject?: string
          template_key?: string
          template_name?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      field_instructions: {
        Row: {
          created_at: string
          field_name: string
          help_text: string | null
          id: string
          legal_agent_id: string | null
          updated_at: string
          validation_rule: string | null
        }
        Insert: {
          created_at?: string
          field_name: string
          help_text?: string | null
          id?: string
          legal_agent_id?: string | null
          updated_at?: string
          validation_rule?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string
          help_text?: string | null
          id?: string
          legal_agent_id?: string | null
          updated_at?: string
          validation_rule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_instructions_legal_agent_id_fkey"
            columns: ["legal_agent_id"]
            isOneToOne: false
            referencedRelation: "legal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_instructions_legal_agent_id_fkey"
            columns: ["legal_agent_id"]
            isOneToOne: false
            referencedRelation: "openai_agent_analytics"
            referencedColumns: ["legal_agent_id"]
          },
        ]
      }
      gamification_progress: {
        Row: {
          claimed_at: string | null
          completed_at: string | null
          completion_count: number
          id: string
          lawyer_id: string
          progress_data: Json | null
          started_at: string
          status: string
          task_id: string
        }
        Insert: {
          claimed_at?: string | null
          completed_at?: string | null
          completion_count?: number
          id?: string
          lawyer_id: string
          progress_data?: Json | null
          started_at?: string
          status?: string
          task_id: string
        }
        Update: {
          claimed_at?: string | null
          completed_at?: string | null
          completion_count?: number
          id?: string
          lawyer_id?: string
          progress_data?: Json | null
          started_at?: string
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_progress_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "gamification_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_tasks: {
        Row: {
          badge_name: string | null
          completion_criteria: Json | null
          created_at: string
          credit_reward: number
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          max_completions: number | null
          name: string
          task_key: string
          task_type: string
          updated_at: string
        }
        Insert: {
          badge_name?: string | null
          completion_criteria?: Json | null
          created_at?: string
          credit_reward?: number
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          max_completions?: number | null
          name: string
          task_key: string
          task_type: string
          updated_at?: string
        }
        Update: {
          badge_name?: string | null
          completion_criteria?: Json | null
          created_at?: string
          credit_reward?: number
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          max_completions?: number | null
          name?: string
          task_key?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_base_urls: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_verified: string | null
          priority: number | null
          tags: string[] | null
          updated_at: string
          url: string
          verification_status: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_verified?: string | null
          priority?: number | null
          tags?: string[] | null
          updated_at?: string
          url: string
          verification_status?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_verified?: string | null
          priority?: number | null
          tags?: string[] | null
          updated_at?: string
          url?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      lawyer_certificates: {
        Row: {
          certificate_code: string
          certificate_name: string
          certificate_type: string
          created_at: string
          id: string
          is_active: boolean
          issued_date: string
          lawyer_id: string
          linkedin_share_url: string | null
          updated_at: string
          verification_url: string | null
        }
        Insert: {
          certificate_code: string
          certificate_name?: string
          certificate_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          issued_date?: string
          lawyer_id: string
          linkedin_share_url?: string | null
          updated_at?: string
          verification_url?: string | null
        }
        Update: {
          certificate_code?: string
          certificate_name?: string
          certificate_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          issued_date?: string
          lawyer_id?: string
          linkedin_share_url?: string | null
          updated_at?: string
          verification_url?: string | null
        }
        Relationships: []
      }
      lawyer_credits: {
        Row: {
          created_at: string
          current_balance: number
          id: string
          last_purchase_at: string | null
          lawyer_id: string
          total_earned: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          last_purchase_at?: string | null
          lawyer_id: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          last_purchase_at?: string | null
          lawyer_id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_credits_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: true
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_documents: {
        Row: {
          content: string
          created_at: string | null
          document_type: string
          id: string
          is_monetized: boolean | null
          lawyer_id: string
          markdown_content: string | null
          metadata: Json | null
          monetized_agent_id: string | null
          price: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          document_type: string
          id?: string
          is_monetized?: boolean | null
          lawyer_id: string
          markdown_content?: string | null
          metadata?: Json | null
          monetized_agent_id?: string | null
          price?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          document_type?: string
          id?: string
          is_monetized?: boolean | null
          lawyer_id?: string
          markdown_content?: string | null
          metadata?: Json | null
          monetized_agent_id?: string | null
          price?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_documents_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_documents_monetized_agent_id_fkey"
            columns: ["monetized_agent_id"]
            isOneToOne: false
            referencedRelation: "legal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_documents_monetized_agent_id_fkey"
            columns: ["monetized_agent_id"]
            isOneToOne: false
            referencedRelation: "openai_agent_analytics"
            referencedColumns: ["legal_agent_id"]
          },
        ]
      }
      lawyer_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          lawyer_id: string
          message: string
          notification_type: string
          priority: string
          read_at: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          lawyer_id: string
          message: string
          notification_type: string
          priority?: string
          read_at?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          lawyer_id?: string
          message?: string
          notification_type?: string
          priority?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_notifications_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_profiles: {
        Row: {
          active: boolean
          bar_number: string | null
          can_create_agents: boolean | null
          can_create_blogs: boolean | null
          can_use_ai_tools: boolean
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_login_at: string | null
          phone_number: string | null
          professional_status: string | null
          updated_at: string | null
          verification_date: string | null
        }
        Insert: {
          active?: boolean
          bar_number?: string | null
          can_create_agents?: boolean | null
          can_create_blogs?: boolean | null
          can_use_ai_tools?: boolean
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          phone_number?: string | null
          professional_status?: string | null
          updated_at?: string | null
          verification_date?: string | null
        }
        Update: {
          active?: boolean
          bar_number?: string | null
          can_create_agents?: boolean | null
          can_create_blogs?: boolean | null
          can_use_ai_tools?: boolean
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          phone_number?: string | null
          professional_status?: string | null
          updated_at?: string | null
          verification_date?: string | null
        }
        Relationships: []
      }
      lawyer_public_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          lawyer_id: string
          profile_photo: string | null
          services: Json | null
          slug: string
          specialties: string[] | null
          testimonials: Json | null
          updated_at: string | null
          years_of_experience: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          lawyer_id: string
          profile_photo?: string | null
          services?: Json | null
          slug: string
          specialties?: string[] | null
          testimonials?: Json | null
          updated_at?: string | null
          years_of_experience?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          lawyer_id?: string
          profile_photo?: string | null
          services?: Json | null
          slug?: string
          specialties?: string[] | null
          testimonials?: Json | null
          updated_at?: string | null
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_public_profiles_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: true
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_referrals: {
        Row: {
          created_at: string
          credited_at: string | null
          credits_awarded_referred: number
          credits_awarded_referrer: number
          id: string
          referral_code: string
          referred_email: string | null
          referred_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          credited_at?: string | null
          credits_awarded_referred?: number
          credits_awarded_referrer?: number
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          credited_at?: string | null
          credits_awarded_referred?: number
          credits_awarded_referrer?: number
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          dlocal_subscription_id: string | null
          id: string
          lawyer_id: string
          payment_method_info: Json | null
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dlocal_subscription_id?: string | null
          id?: string
          lawyer_id: string
          payment_method_info?: Json | null
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dlocal_subscription_id?: string | null
          id?: string
          lawyer_id?: string
          payment_method_info?: Json | null
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_training_progress: {
        Row: {
          ai_questions_count: number | null
          best_score: number | null
          certificate_id: string | null
          completed_at: string | null
          completion_percentage: number
          course_name: string
          created_at: string
          current_module_id: string | null
          id: string
          is_certified: boolean
          last_training_date: string | null
          last_validation_score: number | null
          lawyer_id: string
          modules_completed: Json
          started_at: string
          total_modules: number
          total_xp_earned: number | null
          training_streak: number | null
          updated_at: string
          validation_attempts: number | null
          validation_history: Json | null
        }
        Insert: {
          ai_questions_count?: number | null
          best_score?: number | null
          certificate_id?: string | null
          completed_at?: string | null
          completion_percentage?: number
          course_name?: string
          created_at?: string
          current_module_id?: string | null
          id?: string
          is_certified?: boolean
          last_training_date?: string | null
          last_validation_score?: number | null
          lawyer_id: string
          modules_completed?: Json
          started_at?: string
          total_modules?: number
          total_xp_earned?: number | null
          training_streak?: number | null
          updated_at?: string
          validation_attempts?: number | null
          validation_history?: Json | null
        }
        Update: {
          ai_questions_count?: number | null
          best_score?: number | null
          certificate_id?: string | null
          completed_at?: string | null
          completion_percentage?: number
          course_name?: string
          created_at?: string
          current_module_id?: string | null
          id?: string
          is_certified?: boolean
          last_training_date?: string | null
          last_validation_score?: number | null
          lawyer_id?: string
          modules_completed?: Json
          started_at?: string
          total_modules?: number
          total_xp_earned?: number | null
          training_streak?: number | null
          updated_at?: string
          validation_attempts?: number | null
          validation_history?: Json | null
        }
        Relationships: []
      }
      lawyer_verifications: {
        Row: {
          api_cost: number | null
          bar_number: string | null
          certificate_expiry_date: string | null
          created_at: string
          document_number: string | null
          document_type: string | null
          expires_at: string | null
          id: string
          lawyer_id: string | null
          professional_name: string | null
          professional_status: string | null
          specialization: string | null
          status: string
          updated_at: string
          verification_type: string
          verified_at: string | null
          verifik_response: Json | null
        }
        Insert: {
          api_cost?: number | null
          bar_number?: string | null
          certificate_expiry_date?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          expires_at?: string | null
          id?: string
          lawyer_id?: string | null
          professional_name?: string | null
          professional_status?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          verification_type: string
          verified_at?: string | null
          verifik_response?: Json | null
        }
        Update: {
          api_cost?: number | null
          bar_number?: string | null
          certificate_expiry_date?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          expires_at?: string | null
          id?: string
          lawyer_id?: string | null
          professional_name?: string | null
          professional_status?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          verification_type?: string
          verified_at?: string | null
          verifik_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_verifications_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_advisor_agents: {
        Row: {
          created_at: string
          id: string
          instructions: string
          legal_sources: Json | null
          model: string
          name: string
          openai_agent_id: string
          search_keywords: Json | null
          specialization: string
          status: string
          target_audience: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions: string
          legal_sources?: Json | null
          model?: string
          name: string
          openai_agent_id: string
          search_keywords?: Json | null
          specialization: string
          status?: string
          target_audience: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string
          legal_sources?: Json | null
          model?: string
          name?: string
          openai_agent_id?: string
          search_keywords?: Json | null
          specialization?: string
          status?: string
          target_audience?: string
          updated_at?: string
        }
        Relationships: []
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
          frontend_icon: string | null
          id: string
          last_openai_activity: string | null
          name: string
          openai_conversations_count: number | null
          openai_enabled: boolean | null
          openai_success_rate: number | null
          placeholder_fields: Json
          price: number
          price_justification: string | null
          sla_enabled: boolean | null
          sla_hours: number | null
          status: string
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
          frontend_icon?: string | null
          id?: string
          last_openai_activity?: string | null
          name: string
          openai_conversations_count?: number | null
          openai_enabled?: boolean | null
          openai_success_rate?: number | null
          placeholder_fields?: Json
          price?: number
          price_justification?: string | null
          sla_enabled?: boolean | null
          sla_hours?: number | null
          status?: string
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
          frontend_icon?: string | null
          id?: string
          last_openai_activity?: string | null
          name?: string
          openai_conversations_count?: number | null
          openai_enabled?: boolean | null
          openai_success_rate?: number | null
          placeholder_fields?: Json
          price?: number
          price_justification?: string | null
          sla_enabled?: boolean | null
          sla_hours?: number | null
          status?: string
          target_audience?: string | null
          template_content?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_calendar_events: {
        Row: {
          alert_before_minutes: number[] | null
          all_day: boolean | null
          case_id: string | null
          client_id: string | null
          color: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          event_type: string
          external_calendar_id: string | null
          id: string
          is_auto_generated: boolean | null
          is_completed: boolean | null
          lawyer_id: string
          location: string | null
          monitored_process_id: string | null
          recurrence_rule: string | null
          source_document_id: string | null
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          alert_before_minutes?: number[] | null
          all_day?: boolean | null
          case_id?: string | null
          client_id?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type: string
          external_calendar_id?: string | null
          id?: string
          is_auto_generated?: boolean | null
          is_completed?: boolean | null
          lawyer_id: string
          location?: string | null
          monitored_process_id?: string | null
          recurrence_rule?: string | null
          source_document_id?: string | null
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          alert_before_minutes?: number[] | null
          all_day?: boolean | null
          case_id?: string | null
          client_id?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          external_calendar_id?: string | null
          id?: string
          is_auto_generated?: boolean | null
          is_completed?: boolean | null
          lawyer_id?: string
          location?: string | null
          monitored_process_id?: string | null
          recurrence_rule?: string | null
          source_document_id?: string | null
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_calendar_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "crm_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_calendar_events_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_calendar_events_monitored_process_id_fkey"
            columns: ["monitored_process_id"]
            isOneToOne: false
            referencedRelation: "monitored_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_consultations: {
        Row: {
          advisor_agent_id: string | null
          consultation_data: Json | null
          consultation_topic: string | null
          created_at: string
          id: string
          legal_area: string | null
          sources_consulted: Json | null
          status: string
          thread_id: string
          updated_at: string
          user_session_id: string | null
        }
        Insert: {
          advisor_agent_id?: string | null
          consultation_data?: Json | null
          consultation_topic?: string | null
          created_at?: string
          id?: string
          legal_area?: string | null
          sources_consulted?: Json | null
          status?: string
          thread_id: string
          updated_at?: string
          user_session_id?: string | null
        }
        Update: {
          advisor_agent_id?: string | null
          consultation_data?: Json | null
          consultation_topic?: string | null
          created_at?: string
          id?: string
          legal_area?: string | null
          sources_consulted?: Json | null
          status?: string
          thread_id?: string
          updated_at?: string
          user_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_consultations_advisor_agent_id_fkey"
            columns: ["advisor_agent_id"]
            isOneToOne: false
            referencedRelation: "legal_advisor_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_content: {
        Row: {
          content: string
          created_at: string
          id: string
          last_updated: string
          page_key: string
          title: string
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          last_updated?: string
          page_key: string
          title: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          last_updated?: string
          page_key?: string
          title?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      legal_tools_results: {
        Row: {
          case_id: string | null
          client_id: string | null
          created_at: string
          id: string
          input_data: Json
          lawyer_id: string | null
          metadata: Json | null
          output_data: Json
          tool_type: string
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          input_data?: Json
          lawyer_id?: string | null
          metadata?: Json | null
          output_data?: Json
          tool_type: string
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          input_data?: Json
          lawyer_id?: string | null
          metadata?: Json | null
          output_data?: Json
          tool_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_tools_results_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "crm_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_tools_results_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_processes: {
        Row: {
          case_id: string | null
          client_id: string | null
          created_at: string | null
          demandado: string | null
          demandante: string | null
          despacho: string | null
          estado: string | null
          id: string
          lawyer_id: string
          notificaciones_activas: boolean | null
          radicado: string
          tipo_proceso: string | null
          ultima_actuacion_descripcion: string | null
          ultima_actuacion_fecha: string | null
          updated_at: string | null
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string | null
          demandado?: string | null
          demandante?: string | null
          despacho?: string | null
          estado?: string | null
          id?: string
          lawyer_id: string
          notificaciones_activas?: boolean | null
          radicado: string
          tipo_proceso?: string | null
          ultima_actuacion_descripcion?: string | null
          ultima_actuacion_fecha?: string | null
          updated_at?: string | null
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string | null
          demandado?: string | null
          demandante?: string | null
          despacho?: string | null
          estado?: string | null
          id?: string
          lawyer_id?: string
          notificaciones_activas?: boolean | null
          radicado?: string
          tipo_proceso?: string | null
          ultima_actuacion_descripcion?: string | null
          ultima_actuacion_fecha?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitored_processes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "crm_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_processes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_processes_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          lawyer_id: string
          notification_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          lawyer_id: string
          notification_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          lawyer_id?: string
          notification_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      openai_agent_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          legal_agent_id: string
          retry_count: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          legal_agent_id: string
          retry_count?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          legal_agent_id?: string
          retry_count?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "openai_agent_jobs_legal_agent_id_fkey"
            columns: ["legal_agent_id"]
            isOneToOne: false
            referencedRelation: "legal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openai_agent_jobs_legal_agent_id_fkey"
            columns: ["legal_agent_id"]
            isOneToOne: false
            referencedRelation: "openai_agent_analytics"
            referencedColumns: ["legal_agent_id"]
          },
        ]
      }
      openai_agents: {
        Row: {
          created_at: string
          id: string
          instructions: string
          legal_agent_id: string | null
          metadata: Json | null
          model: string
          name: string
          openai_agent_id: string
          status: string
          tool_resources: Json | null
          tools: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions: string
          legal_agent_id?: string | null
          metadata?: Json | null
          model?: string
          name: string
          openai_agent_id: string
          status?: string
          tool_resources?: Json | null
          tools?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string
          legal_agent_id?: string | null
          metadata?: Json | null
          model?: string
          name?: string
          openai_agent_id?: string
          status?: string
          tool_resources?: Json | null
          tools?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "openai_agents_legal_agent_id_fkey"
            columns: ["legal_agent_id"]
            isOneToOne: false
            referencedRelation: "legal_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openai_agents_legal_agent_id_fkey"
            columns: ["legal_agent_id"]
            isOneToOne: false
            referencedRelation: "openai_agent_analytics"
            referencedColumns: ["legal_agent_id"]
          },
        ]
      }
      pricing_analytics: {
        Row: {
          clicked_at: string
          created_at: string
          id: string
          plan_id: string
          plan_name: string
          plan_type: string
          user_agent: string | null
          user_ip: string | null
        }
        Insert: {
          clicked_at?: string
          created_at?: string
          id?: string
          plan_id: string
          plan_name: string
          plan_type: string
          user_agent?: string | null
          user_ip?: string | null
        }
        Update: {
          clicked_at?: string
          created_at?: string
          id?: string
          plan_id?: string
          plan_name?: string
          plan_type?: string
          user_agent?: string | null
          user_ip?: string | null
        }
        Relationships: []
      }
      process_actuations: {
        Row: {
          actuacion: string | null
          anotacion: string
          created_at: string | null
          fecha_actuacion: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          is_new: boolean | null
          monitored_process_id: string
          notified_at: string | null
        }
        Insert: {
          actuacion?: string | null
          anotacion: string
          created_at?: string | null
          fecha_actuacion: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          is_new?: boolean | null
          monitored_process_id: string
          notified_at?: string | null
        }
        Update: {
          actuacion?: string | null
          anotacion?: string
          created_at?: string | null
          fecha_actuacion?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          is_new?: boolean | null
          monitored_process_id?: string
          notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_actuations_monitored_process_id_fkey"
            columns: ["monitored_process_id"]
            isOneToOne: false
            referencedRelation: "monitored_processes"
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
      security_audit_log: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_identifier: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_identifier?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_identifier?: string | null
        }
        Relationships: []
      }
      service_status: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          last_checked: string | null
          response_time_ms: number | null
          service_name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_checked?: string | null
          response_time_ms?: number | null
          service_name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_checked?: string | null
          response_time_ms?: number | null
          service_name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      specialized_agent_sessions: {
        Row: {
          agent_id: string | null
          conversation_summary: string | null
          created_at: string | null
          credits_consumed: number | null
          ended_at: string | null
          feedback: string | null
          id: string
          lawyer_id: string
          messages_count: number | null
          metadata: Json | null
          rating: number | null
          started_at: string | null
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          conversation_summary?: string | null
          created_at?: string | null
          credits_consumed?: number | null
          ended_at?: string | null
          feedback?: string | null
          id?: string
          lawyer_id: string
          messages_count?: number | null
          metadata?: Json | null
          rating?: number | null
          started_at?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          conversation_summary?: string | null
          created_at?: string | null
          credits_consumed?: number | null
          ended_at?: string | null
          feedback?: string | null
          id?: string
          lawyer_id?: string
          messages_count?: number | null
          metadata?: Json | null
          rating?: number | null
          started_at?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "specialized_agent_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "specialized_agents_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      specialized_agents_catalog: {
        Row: {
          agent_instructions: string | null
          agent_tools: Json | null
          avg_rating: number | null
          category: string
          color_class: string | null
          created_at: string | null
          created_by: string | null
          credits_per_session: number | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_featured: boolean | null
          is_premium: boolean | null
          max_messages_per_session: number | null
          name: string
          openai_assistant_id: string | null
          openai_workflow_id: string | null
          requires_subscription: string | null
          short_description: string | null
          status: string
          target_audience: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          agent_instructions?: string | null
          agent_tools?: Json | null
          avg_rating?: number | null
          category?: string
          color_class?: string | null
          created_at?: string | null
          created_by?: string | null
          credits_per_session?: number | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          max_messages_per_session?: number | null
          name: string
          openai_assistant_id?: string | null
          openai_workflow_id?: string | null
          requires_subscription?: string | null
          short_description?: string | null
          status?: string
          target_audience?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          agent_instructions?: string | null
          agent_tools?: Json | null
          avg_rating?: number | null
          category?: string
          color_class?: string | null
          created_at?: string | null
          created_by?: string | null
          credits_per_session?: number | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          max_messages_per_session?: number | null
          name?: string
          openai_assistant_id?: string | null
          openai_workflow_id?: string | null
          requires_subscription?: string | null
          short_description?: string | null
          status?: string
          target_audience?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string
          display_order: number
          dlocal_plan_id: string | null
          enables_legal_tools: boolean
          features: Json
          id: string
          is_active: boolean
          name: string
          price_monthly: number
          price_yearly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          dlocal_plan_id?: string | null
          enables_legal_tools?: boolean
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          dlocal_plan_id?: string | null
          enables_legal_tools?: boolean
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
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
      terms_acceptance_audit: {
        Row: {
          acceptance_context: string | null
          acceptance_type: string
          accepted_at: string
          created_at: string
          data_processing_consent: boolean
          device_info: Json | null
          id: string
          intellectual_property_consent: boolean | null
          ip_address: string | null
          marketing_consent: boolean | null
          metadata: Json | null
          privacy_policy_version: string
          terms_version: string
          user_agent: string | null
          user_email: string
          user_id: string | null
          user_name: string | null
          user_type: string
        }
        Insert: {
          acceptance_context?: string | null
          acceptance_type: string
          accepted_at?: string
          created_at?: string
          data_processing_consent?: boolean
          device_info?: Json | null
          id?: string
          intellectual_property_consent?: boolean | null
          ip_address?: string | null
          marketing_consent?: boolean | null
          metadata?: Json | null
          privacy_policy_version?: string
          terms_version?: string
          user_agent?: string | null
          user_email: string
          user_id?: string | null
          user_name?: string | null
          user_type: string
        }
        Update: {
          acceptance_context?: string | null
          acceptance_type?: string
          accepted_at?: string
          created_at?: string
          data_processing_consent?: boolean
          device_info?: Json | null
          id?: string
          intellectual_property_consent?: boolean | null
          ip_address?: string | null
          marketing_consent?: boolean | null
          metadata?: Json | null
          privacy_policy_version?: string
          terms_version?: string
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string | null
          user_type?: string
        }
        Relationships: []
      }
      training_interactions: {
        Row: {
          assistant_response: string
          created_at: string
          id: string
          lawyer_id: string
          module_id: string
          session_id: string
          user_message: string
        }
        Insert: {
          assistant_response: string
          created_at?: string
          id?: string
          lawyer_id: string
          module_id: string
          session_id: string
          user_message: string
        }
        Update: {
          assistant_response?: string
          created_at?: string
          id?: string
          lawyer_id?: string
          module_id?: string
          session_id?: string
          user_message?: string
        }
        Relationships: []
      }
      training_validations: {
        Row: {
          ai_evaluation: Json
          answers: Json
          created_at: string
          id: string
          lawyer_id: string
          max_score: number
          module_id: string
          module_title: string
          passed: boolean
          questions: Json
          score: number
          updated_at: string
          validated_at: string
        }
        Insert: {
          ai_evaluation?: Json
          answers?: Json
          created_at?: string
          id?: string
          lawyer_id: string
          max_score?: number
          module_id: string
          module_title: string
          passed?: boolean
          questions?: Json
          score?: number
          updated_at?: string
          validated_at?: string
        }
        Update: {
          ai_evaluation?: Json
          answers?: Json
          created_at?: string
          id?: string
          lawyer_id?: string
          max_score?: number
          module_id?: string
          module_title?: string
          passed?: boolean
          questions?: Json
          score?: number
          updated_at?: string
          validated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_type_registry: {
        Row: {
          created_at: string | null
          updated_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string | null
          updated_at?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      venue_spaces: {
        Row: {
          amenities: Json | null
          area_m2: number | null
          availability_schedule: Json
          capacity: number
          created_at: string
          description: string | null
          id: string
          images: Json | null
          is_active: boolean
          latitude: number | null
          location_address: string
          location_city: string
          location_zone: string
          longitude: number | null
          max_hours: number | null
          min_hours: number | null
          name: string
          price_per_hour: number
          space_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amenities?: Json | null
          area_m2?: number | null
          availability_schedule?: Json
          capacity: number
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean
          latitude?: number | null
          location_address: string
          location_city: string
          location_zone: string
          longitude?: number | null
          max_hours?: number | null
          min_hours?: number | null
          name: string
          price_per_hour: number
          space_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amenities?: Json | null
          area_m2?: number | null
          availability_schedule?: Json
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean
          latitude?: number | null
          location_address?: string
          location_city?: string
          location_zone?: string
          longitude?: number | null
          max_hours?: number | null
          min_hours?: number | null
          name?: string
          price_per_hour?: number
          space_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verifik_api_usage: {
        Row: {
          admin_id: string | null
          api_cost: number | null
          created_at: string
          endpoint: string
          id: string
          lawyer_id: string | null
          request_params: Json | null
          response_data: Json | null
          response_status: number | null
        }
        Insert: {
          admin_id?: string | null
          api_cost?: number | null
          created_at?: string
          endpoint: string
          id?: string
          lawyer_id?: string | null
          request_params?: Json | null
          response_data?: Json | null
          response_status?: number | null
        }
        Update: {
          admin_id?: string | null
          api_cost?: number | null
          created_at?: string
          endpoint?: string
          id?: string
          lawyer_id?: string | null
          request_params?: Json | null
          response_data?: Json | null
          response_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "verifik_api_usage_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifik_api_usage_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number | null
          document_token_id: string | null
          error_message: string | null
          execution_data: Json | null
          id: string
          started_at: string | null
          status: string
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          document_token_id?: string | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          document_token_id?: string | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_document_token_id_fkey"
            columns: ["document_token_id"]
            isOneToOne: false
            referencedRelation: "document_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "agent_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      openai_agent_analytics: {
        Row: {
          agent_name: string | null
          calculated_success_rate: number | null
          document_name: string | null
          jobs_completed: number | null
          jobs_failed: number | null
          jobs_pending: number | null
          last_openai_activity: string | null
          legal_agent_id: string | null
          openai_agent_id: string | null
          openai_conversations_count: number | null
          openai_created_at: string | null
          openai_enabled: boolean | null
          openai_external_id: string | null
          openai_status: string | null
          openai_success_rate: number | null
          successful_documents: number | null
          target_audience: string | null
          total_conversations: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_business_days: {
        Args: { num_days: number; start_date: string }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          action_type: string
          max_attempts?: number
          time_window_minutes?: number
          user_identifier: string
        }
        Returns: boolean
      }
      create_admin_profile: {
        Args: {
          admin_email: string
          admin_full_name: string
          auth_user_id: string
          is_super_admin?: boolean
        }
        Returns: string
      }
      create_lawyer_notification: {
        Args: {
          p_action_url?: string
          p_entity_id?: string
          p_entity_type?: string
          p_lawyer_id: string
          p_message: string
          p_notification_type: string
          p_priority?: string
          p_title: string
        }
        Returns: string
      }
      find_subscription_by_external_id: {
        Args: { search_external_id: string }
        Returns: {
          created_at: string
          dlocal_subscription_id: string
          lawyer_email: string
          lawyer_id: string
          lawyer_name: string
          subscription_id: string
          subscription_status: string
          updated_at: string
        }[]
      }
      generate_secure_lawyer_token: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      jsonb_merge: { Args: { existing: Json; new: Json }; Returns: Json }
      log_security_event: {
        Args: {
          details?: Json
          event_type: string
          ip_address?: string
          user_identifier?: string
        }
        Returns: undefined
      }
      migrate_admin_accounts_to_profiles: { Args: never; Returns: number }
      sanitize_input: { Args: { input_text: string }; Returns: string }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "lawyer" | "super_admin"
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
      app_role: ["admin", "lawyer", "super_admin"],
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
