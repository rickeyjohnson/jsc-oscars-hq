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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ballots: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          name: string
          opens_at: string
          parent_ballot_id: string | null
          round: Database["public"]["Enums"]["ballot_round"]
          season_id: string
          status: Database["public"]["Enums"]["ballot_status"]
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          name: string
          opens_at: string
          parent_ballot_id?: string | null
          round?: Database["public"]["Enums"]["ballot_round"]
          season_id: string
          status?: Database["public"]["Enums"]["ballot_status"]
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          name?: string
          opens_at?: string
          parent_ballot_id?: string | null
          round?: Database["public"]["Enums"]["ballot_round"]
          season_id?: string
          status?: Database["public"]["Enums"]["ballot_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ballots_parent_ballot_id_fkey"
            columns: ["parent_ballot_id"]
            isOneToOne: false
            referencedRelation: "ballots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ballots_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          allow_member_add: boolean
          ballot_id: string
          description: string
          id: string
          name: string
          nominee_mode: Database["public"]["Enums"]["nominee_mode"]
          sort_order: number
        }
        Insert: {
          allow_member_add?: boolean
          ballot_id: string
          description?: string
          id?: string
          name: string
          nominee_mode?: Database["public"]["Enums"]["nominee_mode"]
          sort_order?: number
        }
        Update: {
          allow_member_add?: boolean
          ballot_id?: string
          description?: string
          id?: string
          name?: string
          nominee_mode?: Database["public"]["Enums"]["nominee_mode"]
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_ballot_id_fkey"
            columns: ["ballot_id"]
            isOneToOne: false
            referencedRelation: "ballots"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          claimed_at: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nominees: {
        Row: {
          category_id: string
          created_by: string | null
          display_name: string
          id: string
          member_ids: string[]
          secondary_text: string | null
          type: Database["public"]["Enums"]["nominee_type"]
        }
        Insert: {
          category_id: string
          created_by?: string | null
          display_name: string
          id?: string
          member_ids?: string[]
          secondary_text?: string | null
          type?: Database["public"]["Enums"]["nominee_type"]
        }
        Update: {
          category_id?: string
          created_by?: string | null
          display_name?: string
          id?: string
          member_ids?: string[]
          secondary_text?: string | null
          type?: Database["public"]["Enums"]["nominee_type"]
        }
        Relationships: [
          {
            foreignKeyName: "nominees_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      oscarsEvents: {
        Row: {
          ends_at: string | null
          id: string
          name: string | null
          semester: string | null
          starts_at: string | null
        }
        Insert: {
          ends_at?: string | null
          id?: string
          name?: string | null
          semester?: string | null
          starts_at?: string | null
        }
        Update: {
          ends_at?: string | null
          id?: string
          name?: string | null
          semester?: string | null
          starts_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          image_url: string | null
          is_committee: boolean
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          image_url?: string | null
          is_committee?: boolean
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          image_url?: string | null
          is_committee?: boolean
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          category_id: string
          decided_ballot_id: string
          decided_by: Database["public"]["Enums"]["decided_by"] | null
          nominee_ids: string[]
          places: Json | null
          top3_nominee_ids: string[]
          updated_at: string
          winner_nominee_id: string | null
        }
        Insert: {
          category_id: string
          decided_ballot_id: string
          decided_by?: Database["public"]["Enums"]["decided_by"] | null
          nominee_ids?: string[]
          places?: Json | null
          top3_nominee_ids?: string[]
          updated_at?: string
          winner_nominee_id?: string | null
        }
        Update: {
          category_id?: string
          decided_ballot_id?: string
          decided_by?: Database["public"]["Enums"]["decided_by"] | null
          nominee_ids?: string[]
          places?: Json | null
          top3_nominee_ids?: string[]
          updated_at?: string
          winner_nominee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_decided_ballot_id_fkey"
            columns: ["decided_ballot_id"]
            isOneToOne: false
            referencedRelation: "ballots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_winner_nominee_id_fkey"
            columns: ["winner_nominee_id"]
            isOneToOne: false
            referencedRelation: "nominees"
            referencedColumns: ["id"]
          },
        ]
      }
      round_nominees: {
        Row: {
          ballot_id: string
          category_id: string
          nominee_id: string
        }
        Insert: {
          ballot_id: string
          category_id: string
          nominee_id: string
        }
        Update: {
          ballot_id?: string
          category_id?: string
          nominee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_nominees_ballot_id_fkey"
            columns: ["ballot_id"]
            isOneToOne: false
            referencedRelation: "ballots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_nominees_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_nominees_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "nominees"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          ceremony_at: string | null
          id: string
          location: string | null
          name: string
          results_released_at: string | null
        }
        Insert: {
          ceremony_at?: string | null
          id?: string
          location?: string | null
          name: string
          results_released_at?: string | null
        }
        Update: {
          ceremony_at?: string | null
          id?: string
          location?: string | null
          name?: string
          results_released_at?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          ballot_id: string
          category_id: string
          created_at: string
          id: string
          nominee_id: string
          updated_at: string
          voter_id: string
        }
        Insert: {
          ballot_id: string
          category_id: string
          created_at?: string
          id?: string
          nominee_id: string
          updated_at?: string
          voter_id?: string
        }
        Update: {
          ballot_id?: string
          category_id?: string
          created_at?: string
          id?: string
          nominee_id?: string
          updated_at?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_ballot_id_fkey"
            columns: ["ballot_id"]
            isOneToOne: false
            referencedRelation: "ballots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "nominees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_nominee: {
        Args: {
          p_category: string
          p_display_name: string
          p_member_ids: string[]
        }
        Returns: string
      }
      available_member_names: { Args: never; Returns: string[] }
      claim_member_name: { Args: { p_name: string }; Returns: undefined }
      member_name_status: {
        Args: never
        Returns: { name: string; taken: boolean }[]
      }
      ballot_is_open: { Args: { p_ballot: string }; Returns: boolean }
      ballot_visible: { Args: { p_ballot: string }; Returns: boolean }
      can_cast_vote: {
        Args: { p_ballot: string; p_category: string; p_nominee: string }
        Returns: boolean
      }
      is_committee: { Args: never; Returns: boolean }
      reset_member_claim:
        | { Args: { p_name: string }; Returns: undefined }
        | { Args: { p_expected_user: string; p_name: string }; Returns: undefined }
    }
    Enums: {
      ballot_round: "main" | "tiebreak" | "committee"
      ballot_status: "draft" | "open" | "closed" | "released"
      decided_by: "votes" | "tiebreak" | "committee_vote" | "manual"
      nominee_mode: "everyone" | "subset" | "preset" | "group"
      nominee_type: "person" | "group" | "outsider" | "noun"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      ballot_round: ["main", "tiebreak", "committee"],
      ballot_status: ["draft", "open", "closed", "released"],
      decided_by: ["votes", "tiebreak", "committee_vote", "manual"],
      nominee_mode: ["everyone", "subset", "preset", "group"],
      nominee_type: ["person", "group", "outsider", "noun"],
    },
  },
} as const
