export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      applications: {
        Row: {
          address: string | null
          applicant_id: string
          consent_given_at: string | null
          created_at: string
          crm_branch: string | null
          date_of_birth: string | null
          decided_at: string | null
          decision_note: string | null
          education: Json
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          intake_term_id: string | null
          nationality: string | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          other_names: string | null
          phone: string | null
          programme_id: string | null
          referee_email: string | null
          referee_name: string | null
          referee_phone: string | null
          referee_position: string | null
          reviewed_by: string | null
          state_of_origin: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          surname: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          applicant_id?: string
          consent_given_at?: string | null
          created_at?: string
          crm_branch?: string | null
          date_of_birth?: string | null
          decided_at?: string | null
          decision_note?: string | null
          education?: Json
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          intake_term_id?: string | null
          nationality?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          other_names?: string | null
          phone?: string | null
          programme_id?: string | null
          referee_email?: string | null
          referee_name?: string | null
          referee_phone?: string | null
          referee_position?: string | null
          reviewed_by?: string | null
          state_of_origin?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          surname?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          applicant_id?: string
          consent_given_at?: string | null
          created_at?: string
          crm_branch?: string | null
          date_of_birth?: string | null
          decided_at?: string | null
          decision_note?: string | null
          education?: Json
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          intake_term_id?: string | null
          nationality?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          other_names?: string | null
          phone?: string | null
          programme_id?: string | null
          referee_email?: string | null
          referee_name?: string | null
          referee_phone?: string | null
          referee_position?: string | null
          reviewed_by?: string | null
          state_of_origin?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          surname?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_intake_term_id_fkey"
            columns: ["intake_term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          application_id: string | null
          created_at: string
          file_name: string
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          mime: string
          owner_id: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          file_name: string
          id?: string
          kind: Database["public"]["Enums"]["document_kind"]
          mime: string
          owner_id?: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          file_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          mime?: string
          owner_id?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      programmes: {
        Row: {
          created_at: string
          description: string
          duration: string
          id: string
          level: Database["public"]["Enums"]["programme_level"]
          position: number
          requirements: string
          slug: string
          status: Database["public"]["Enums"]["programme_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          duration: string
          id?: string
          level: Database["public"]["Enums"]["programme_level"]
          position?: number
          requirements?: string
          slug: string
          status?: Database["public"]["Enums"]["programme_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          duration?: string
          id?: string
          level?: Database["public"]["Enums"]["programme_level"]
          position?: number
          requirements?: string
          slug?: string
          status?: Database["public"]["Enums"]["programme_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      terms: {
        Row: {
          accepting_applications: boolean
          created_at: string
          ends_on: string | null
          id: string
          name: string
          session: string
          starts_on: string | null
          updated_at: string
        }
        Insert: {
          accepting_applications?: boolean
          created_at?: string
          ends_on?: string | null
          id?: string
          name: string
          session: string
          starts_on?: string | null
          updated_at?: string
        }
        Update: {
          accepting_applications?: boolean
          created_at?: string
          ends_on?: string | null
          id?: string
          name?: string
          session?: string
          starts_on?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      submit_application: {
        Args: { p_application_id: string }
        Returns: {
          address: string | null
          applicant_id: string
          consent_given_at: string | null
          created_at: string
          crm_branch: string | null
          date_of_birth: string | null
          decided_at: string | null
          decision_note: string | null
          education: Json
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          intake_term_id: string | null
          nationality: string | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          other_names: string | null
          phone: string | null
          programme_id: string | null
          referee_email: string | null
          referee_name: string | null
          referee_phone: string | null
          referee_position: string | null
          reviewed_by: string | null
          state_of_origin: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          surname: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "applicant" | "student" | "lecturer" | "admin"
      application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "admitted"
        | "rejected"
        | "withdrawn"
      document_kind: "transcript" | "id_card" | "photo" | "other"
      programme_level: "certificate" | "diploma" | "degree"
      programme_status: "draft" | "published" | "archived"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["applicant", "student", "lecturer", "admin"],
      application_status: [
        "draft",
        "submitted",
        "under_review",
        "admitted",
        "rejected",
        "withdrawn",
      ],
      document_kind: ["transcript", "id_card", "photo", "other"],
      programme_level: ["certificate", "diploma", "degree"],
      programme_status: ["draft", "published", "archived"],
    },
  },
} as const

