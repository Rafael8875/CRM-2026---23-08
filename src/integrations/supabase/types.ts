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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          document: string | null
          email: string | null
          event_date: string | null
          event_type: string | null
          guest_count: number | null
          id: string
          name: string
          observations: string | null
          state: string | null
          status: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          event_date?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          name: string
          observations?: string | null
          state?: string | null
          status?: string | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          event_date?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          name?: string
          observations?: string | null
          state?: string | null
          status?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      contract_installments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          paid_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          paid_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          paid_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_installments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string | null
          file_path: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          file_path?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          file_path?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          balance_remaining: number | null
          client_id: string
          contract_date: string | null
          contract_number: string | null
          created_at: string | null
          down_payment: number | null
          due_day: number | null
          end_date: string | null
          event_date_time: string | null
          id: string
          installment_count: number | null
          installment_value: number | null
          payment_method: string | null
          service_description: string | null
          status: string | null
          template_id: string | null
          total_value: number | null
          user_id: string
        }
        Insert: {
          balance_remaining?: number | null
          client_id: string
          contract_date?: string | null
          contract_number?: string | null
          created_at?: string | null
          down_payment?: number | null
          due_day?: number | null
          end_date?: string | null
          event_date_time?: string | null
          id?: string
          installment_count?: number | null
          installment_value?: number | null
          payment_method?: string | null
          service_description?: string | null
          status?: string | null
          template_id?: string | null
          total_value?: number | null
          user_id: string
        }
        Update: {
          balance_remaining?: number | null
          client_id?: string
          contract_date?: string | null
          contract_number?: string | null
          created_at?: string | null
          down_payment?: number | null
          due_day?: number | null
          end_date?: string | null
          event_date_time?: string | null
          id?: string
          installment_count?: number | null
          installment_value?: number | null
          payment_method?: string | null
          service_description?: string | null
          status?: string | null
          template_id?: string | null
          total_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          contract_id: string
          id: string
          reminder_type: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          contract_id: string
          id?: string
          reminder_type: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          contract_id?: string
          id?: string
          reminder_type?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          contract_id: string | null
          created_at: string | null
          date: string | null
          description: string | null
          due_date: string | null
          id: string
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          contract_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          contract_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
