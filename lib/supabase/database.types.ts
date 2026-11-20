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
          born_again: boolean | null
          born_again_when: string | null
          church: string | null
          church_duties: string | null
          church_membership: string | null
          consent_given_at: string | null
          created_at: string
          date_of_birth: string | null
          decided_at: string | null
          decision_note: string | null
          education: Json
          email: string | null
          employer: string | null
          first_name: string | null
          gender: string | null
          id: string
          intake_term_id: string | null
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          nationality: string | null
          nature_of_work: string | null
          next_of_kin_address: string | null
          next_of_kin_email: string | null
          next_of_kin_name: string | null
          next_of_kin_occupation: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          occupation: string | null
          other_names: string | null
          pastor_name: string | null
          pastor_phone: string | null
          permanent_address: string | null
          phone: string | null
          pledge_given_at: string | null
          programme_id: string | null
          referees: Json
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          surname: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          applicant_id?: string
          born_again?: boolean | null
          born_again_when?: string | null
          church?: string | null
          church_duties?: string | null
          church_membership?: string | null
          consent_given_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          decided_at?: string | null
          decision_note?: string | null
          education?: Json
          email?: string | null
          employer?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          intake_term_id?: string | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          nationality?: string | null
          nature_of_work?: string | null
          next_of_kin_address?: string | null
          next_of_kin_email?: string | null
          next_of_kin_name?: string | null
          next_of_kin_occupation?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          occupation?: string | null
          other_names?: string | null
          pastor_name?: string | null
          pastor_phone?: string | null
          permanent_address?: string | null
          phone?: string | null
          pledge_given_at?: string | null
          programme_id?: string | null
          referees?: Json
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          surname?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          applicant_id?: string
          born_again?: boolean | null
          born_again_when?: string | null
          church?: string | null
          church_duties?: string | null
          church_membership?: string | null
          consent_given_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          decided_at?: string | null
          decision_note?: string | null
          education?: Json
          email?: string | null
          employer?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          intake_term_id?: string | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          nationality?: string | null
          nature_of_work?: string | null
          next_of_kin_address?: string | null
          next_of_kin_email?: string | null
          next_of_kin_name?: string | null
          next_of_kin_occupation?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          occupation?: string | null
          other_names?: string | null
          pastor_name?: string | null
          pastor_phone?: string | null
          permanent_address?: string | null
          phone?: string | null
          pledge_given_at?: string | null
          programme_id?: string | null
          referees?: Json
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          surname?: string | null
          title?: string | null
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
      change_requests: {
        Row: {
          body: string
          created_at: string
          id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["change_request_status"]
          student_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["change_request_status"]
          student_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["change_request_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_sends: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: never
        }
        Update: {
          created_at?: string
          id?: never
        }
        Relationships: []
      }
      course_offerings: {
        Row: {
          course_id: string
          created_at: string
          id: string
          lecturer_id: string | null
          term_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          lecturer_id?: string | null
          term_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          lecturer_id?: string | null
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_offerings_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_offerings_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          credit_units: number
          id: string
          programme_id: string
          semester: number
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          code: string
          created_at?: string
          credit_units: number
          id?: string
          programme_id: string
          semester: number
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          code?: string
          created_at?: string
          credit_units?: number
          id?: string
          programme_id?: string
          semester?: number
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      document_views: {
        Row: {
          document_id: string
          id: number
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          document_id: string
          id?: never
          viewed_at?: string
          viewer_id?: string
        }
        Update: {
          document_id?: string
          id?: never
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_views_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_views_viewer_id_fkey"
            columns: ["viewer_id"]
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
          uploaded_by: string | null
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
          uploaded_by?: string | null
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
          uploaded_by?: string | null
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
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      export_log: {
        Row: {
          exported_at: string
          exported_by: string | null
          filters: Json
          id: number
          kind: Database["public"]["Enums"]["export_kind"]
          row_count: number
        }
        Insert: {
          exported_at?: string
          exported_by?: string | null
          filters?: Json
          id?: never
          kind: Database["public"]["Enums"]["export_kind"]
          row_count: number
        }
        Update: {
          exported_at?: string
          exported_by?: string | null
          filters?: Json
          id?: never
          kind?: Database["public"]["Enums"]["export_kind"]
          row_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "export_log_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_changes: {
        Row: {
          changed_at: string
          changed_by: string | null
          grade_id: string
          id: number
          new_values: Json
          old_values: Json
          reason: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          grade_id: string
          id?: never
          new_values: Json
          old_values: Json
          reason: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          grade_id?: string
          id?: never
          new_values?: Json
          old_values?: Json
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_changes_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_returns: {
        Row: {
          grades_returned: number
          id: number
          note: string
          offering_id: string
          returned_at: string
          returned_by: string | null
        }
        Insert: {
          grades_returned: number
          id?: never
          note: string
          offering_id: string
          returned_at?: string
          returned_by?: string | null
        }
        Update: {
          grades_returned?: number
          id?: never
          note?: string
          offering_id?: string
          returned_at?: string
          returned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_returns_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_returns_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          ca_score: number | null
          created_at: string
          entered_by: string | null
          exam_score: number | null
          grade_point: number | null
          id: string
          letter: string | null
          published_at: string | null
          published_by: string | null
          registration_id: string
          status: Database["public"]["Enums"]["grade_status"]
          total: number | null
          updated_at: string
        }
        Insert: {
          ca_score?: number | null
          created_at?: string
          entered_by?: string | null
          exam_score?: number | null
          grade_point?: number | null
          id?: string
          letter?: string | null
          published_at?: string | null
          published_by?: string | null
          registration_id: string
          status?: Database["public"]["Enums"]["grade_status"]
          total?: number | null
          updated_at?: string
        }
        Update: {
          ca_score?: number | null
          created_at?: string
          entered_by?: string | null
          exam_score?: number | null
          grade_point?: number | null
          id?: string
          letter?: string | null
          published_at?: string | null
          published_by?: string | null
          registration_id?: string
          status?: Database["public"]["Enums"]["grade_status"]
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scale: {
        Row: {
          created_at: string
          grade_point: number
          id: string
          letter: string
          min_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade_point: number
          id?: string
          letter: string
          min_score: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade_point?: number
          id?: string
          letter?: string
          min_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      lecture_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          drive_file_id: string
          drive_kind: Database["public"]["Enums"]["drive_kind"]
          id: string
          programme_id: string
          term_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          drive_file_id: string
          drive_kind: Database["public"]["Enums"]["drive_kind"]
          id?: string
          programme_id: string
          term_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          drive_file_id?: string
          drive_kind?: Database["public"]["Enums"]["drive_kind"]
          id?: string
          programme_id?: string
          term_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_schedules_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_schedules_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          body: string
          course_id: string
          created_at: string
          created_by: string | null
          id: string
          position: number
          title: string
          updated_at: string
          youtube_id: string | null
        }
        Insert: {
          body?: string
          course_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          title: string
          updated_at?: string
          youtube_id?: string | null
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string
          youtube_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          drive_file_id: string
          drive_kind: Database["public"]["Enums"]["drive_kind"]
          id: string
          lesson_id: string | null
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          drive_file_id: string
          drive_kind: Database["public"]["Enums"]["drive_kind"]
          id?: string
          lesson_id?: string | null
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          drive_file_id?: string
          drive_kind?: Database["public"]["Enums"]["drive_kind"]
          id?: string
          lesson_id?: string | null
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_lesson_fkey"
            columns: ["lesson_id", "course_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id", "course_id"]
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
      record_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["record_note_kind"]
          student_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["record_note_kind"]
          student_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["record_note_kind"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          created_at: string
          id: string
          offering_id: string
          registered_by: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offering_id: string
          registered_by?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offering_id?: string
          registered_by?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      result_notices: {
        Row: {
          id: number
          sent_at: string
          sent_by: string | null
          student_id: string
          term_id: string
        }
        Insert: {
          id?: never
          sent_at?: string
          sent_by?: string | null
          student_id: string
          term_id: string
        }
        Update: {
          id?: never
          sent_at?: string
          sent_by?: string | null
          student_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "result_notices_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_notices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_notices_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_content_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          application_id: string | null
          created_at: string
          entry_term_id: string
          id: string
          matric_no: string
          programme_id: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          entry_term_id: string
          id: string
          matric_no: string
          programme_id: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          entry_term_id?: string
          id?: string
          matric_no?: string
          programme_id?: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_entry_term_id_fkey"
            columns: ["entry_term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
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
      account_by_email: {
        Args: { p_email: string }
        Returns: {
          confirmed: boolean
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      account_emails: {
        Args: { p_user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      change_published_grade: {
        Args: {
          p_ca_score: number
          p_exam_score: number
          p_grade_id: string
          p_reason: string
          p_status: Database["public"]["Enums"]["grade_status"]
        }
        Returns: {
          ca_score: number | null
          created_at: string
          entered_by: string | null
          exam_score: number | null
          grade_point: number | null
          id: string
          letter: string | null
          published_at: string | null
          published_by: string | null
          registration_id: string
          status: Database["public"]["Enums"]["grade_status"]
          total: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "grades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_contact_send: { Args: { p_daily_limit: number }; Returns: boolean }
      class_list: {
        Args: { p_offering_id: string }
        Returns: {
          full_name: string
          grade_status: Database["public"]["Enums"]["grade_status"]
          matric_no: string
          registration_id: string
        }[]
      }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      decide_application: {
        Args: {
          p_application_id: string
          p_decision: Database["public"]["Enums"]["application_status"]
          p_note: string
        }
        Returns: {
          address: string | null
          applicant_id: string
          born_again: boolean | null
          born_again_when: string | null
          church: string | null
          church_duties: string | null
          church_membership: string | null
          consent_given_at: string | null
          created_at: string
          date_of_birth: string | null
          decided_at: string | null
          decision_note: string | null
          education: Json
          email: string | null
          employer: string | null
          first_name: string | null
          gender: string | null
          id: string
          intake_term_id: string | null
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          nationality: string | null
          nature_of_work: string | null
          next_of_kin_address: string | null
          next_of_kin_email: string | null
          next_of_kin_name: string | null
          next_of_kin_occupation: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          occupation: string | null
          other_names: string | null
          pastor_name: string | null
          pastor_phone: string | null
          permanent_address: string | null
          phone: string | null
          pledge_given_at: string | null
          programme_id: string | null
          referees: Json
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          surname: string | null
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      enrol_student: {
        Args: {
          p_application_id: string
          p_entry_term_id?: string
          p_matric_no: string
        }
        Returns: {
          application_id: string | null
          created_at: string
          entry_term_id: string
          id: string
          matric_no: string
          programme_id: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "students"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
      resolve_change_request: {
        Args: { p_note: string; p_request_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["change_request_status"]
          student_id: string
        }
        SetofOptions: {
          from: "*"
          to: "change_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      return_grades: {
        Args: { p_note: string; p_offering_id: string }
        Returns: number
      }
      search_students: {
        Args: {
          p_entry_term_id?: string
          p_limit?: number
          p_offset?: number
          p_programme_id?: string
          p_query?: string
          p_sort?: string
          p_status?: Database["public"]["Enums"]["student_status"]
        }
        Returns: {
          created_at: string
          entry_term_name: string
          entry_term_session: string
          full_name: string
          id: string
          matric_no: string
          programme_title: string
          status: Database["public"]["Enums"]["student_status"]
          total_count: number
        }[]
      }
      set_staff_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_student_status: {
        Args: {
          p_note?: string
          p_status: Database["public"]["Enums"]["student_status"]
          p_student_id: string
        }
        Returns: {
          application_id: string | null
          created_at: string
          entry_term_id: string
          id: string
          matric_no: string
          programme_id: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "students"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_accounts: {
        Args: never
        Returns: {
          confirmed_at: string
          email: string
          full_name: string
          id: string
          invited_at: string
          last_sign_in_at: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      start_review: {
        Args: { p_application_id: string }
        Returns: {
          address: string | null
          applicant_id: string
          born_again: boolean | null
          born_again_when: string | null
          church: string | null
          church_duties: string | null
          church_membership: string | null
          consent_given_at: string | null
          created_at: string
          date_of_birth: string | null
          decided_at: string | null
          decision_note: string | null
          education: Json
          email: string | null
          employer: string | null
          first_name: string | null
          gender: string | null
          id: string
          intake_term_id: string | null
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          nationality: string | null
          nature_of_work: string | null
          next_of_kin_address: string | null
          next_of_kin_email: string | null
          next_of_kin_name: string | null
          next_of_kin_occupation: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          occupation: string | null
          other_names: string | null
          pastor_name: string | null
          pastor_phone: string | null
          permanent_address: string | null
          phone: string | null
          pledge_given_at: string | null
          programme_id: string | null
          referees: Json
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          surname: string | null
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_application: {
        Args: { p_application_id: string }
        Returns: {
          address: string | null
          applicant_id: string
          born_again: boolean | null
          born_again_when: string | null
          church: string | null
          church_duties: string | null
          church_membership: string | null
          consent_given_at: string | null
          created_at: string
          date_of_birth: string | null
          decided_at: string | null
          decision_note: string | null
          education: Json
          email: string | null
          employer: string | null
          first_name: string | null
          gender: string | null
          id: string
          intake_term_id: string | null
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          nationality: string | null
          nature_of_work: string | null
          next_of_kin_address: string | null
          next_of_kin_email: string | null
          next_of_kin_name: string | null
          next_of_kin_occupation: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          occupation: string | null
          other_names: string | null
          pastor_name: string | null
          pastor_phone: string | null
          permanent_address: string | null
          phone: string | null
          pledge_given_at: string | null
          programme_id: string | null
          referees: Json
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          surname: string | null
          title: string | null
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
      change_request_status: "open" | "resolved"
      document_kind:
        | "transcript"
        | "id_card"
        | "photo"
        | "other"
        | "endorsement"
        | "payment_proof"
      drive_kind: "file" | "document" | "presentation" | "spreadsheet"
      export_kind: "applications" | "students" | "results"
      grade_status: "draft" | "submitted" | "published"
      marital_status:
        | "unmarried"
        | "married"
        | "divorced"
        | "separated"
        | "widowed"
      programme_level: "certificate" | "diploma" | "postgraduate_diploma"
      programme_status: "draft" | "published" | "archived"
      record_note_kind: "note" | "status_change" | "change_request"
      student_status: "active" | "deferred" | "withdrawn" | "graduated"
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
      change_request_status: ["open", "resolved"],
      document_kind: [
        "transcript",
        "id_card",
        "photo",
        "other",
        "endorsement",
        "payment_proof",
      ],
      drive_kind: ["file", "document", "presentation", "spreadsheet"],
      export_kind: ["applications", "students", "results"],
      grade_status: ["draft", "submitted", "published"],
      marital_status: [
        "unmarried",
        "married",
        "divorced",
        "separated",
        "widowed",
      ],
      programme_level: ["certificate", "diploma", "postgraduate_diploma"],
      programme_status: ["draft", "published", "archived"],
      record_note_kind: ["note", "status_change", "change_request"],
      student_status: ["active", "deferred", "withdrawn", "graduated"],
    },
  },
} as const

