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
      access_code_redemptions: {
        Row: {
          code: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      access_codes: {
        Row: {
          assigned_to_email: string | null
          code: string
          created_at: string
          id: string
          status: string
          updated_at: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          assigned_to_email?: string | null
          code: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          assigned_to_email?: string | null
          code?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_name: string | null
          quantity: number
          space_name: string | null
          unit_msrp: number
          unit_price: number
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          line_total?: number
          order_id: string
          product_name?: string | null
          quantity?: number
          space_name?: string | null
          unit_msrp?: number
          unit_price?: number
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_name?: string | null
          quantity?: number
          space_name?: string | null
          unit_msrp?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          notes: string | null
          order_total: number
          order_total_msrp: number
          payload: Json | null
          phone: string | null
          status: string
          total_items: number
          total_savings: number
          user_id: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          order_total?: number
          order_total_msrp?: number
          payload?: Json | null
          phone?: string | null
          status?: string
          total_items?: number
          total_savings?: number
          user_id?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          order_total?: number
          order_total_msrp?: number
          payload?: Json | null
          phone?: string | null
          status?: string
          total_items?: number
          total_savings?: number
          user_id?: string | null
        }
        Relationships: []
      }
      pallet_items: {
        Row: {
          category_name: string | null
          created_at: string
          id: string
          original_price: number
          pallet_id: string
          primary_image: string | null
          product_name: string
          product_sku: string
        }
        Insert: {
          category_name?: string | null
          created_at?: string
          id?: string
          original_price: number
          pallet_id: string
          primary_image?: string | null
          product_name: string
          product_sku: string
        }
        Update: {
          category_name?: string | null
          created_at?: string
          id?: string
          original_price?: number
          pallet_id?: string
          primary_image?: string | null
          product_name?: string
          product_sku?: string
        }
        Relationships: []
      }
      pallets: {
        Row: {
          brand: string
          pallet_id: string
          total_cost: number
        }
        Insert: {
          brand: string
          pallet_id: string
          total_cost: number
        }
        Update: {
          brand?: string
          pallet_id?: string
          total_cost?: number
        }
        Relationships: []
      }
      product_import_runs: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          brand: string
          changed_count: number
          created_at: string
          error_message: string | null
          fetched_count: number
          finished_at: string | null
          id: string
          new_count: number
          removed_count: number
          skipped_missing_price: number
          started_at: string
          status: string
          unchanged_count: number
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          brand: string
          changed_count?: number
          created_at?: string
          error_message?: string | null
          fetched_count?: number
          finished_at?: string | null
          id?: string
          new_count?: number
          removed_count?: number
          skipped_missing_price?: number
          started_at?: string
          status?: string
          unchanged_count?: number
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          brand?: string
          changed_count?: number
          created_at?: string
          error_message?: string | null
          fetched_count?: number
          finished_at?: string | null
          id?: string
          new_count?: number
          removed_count?: number
          skipped_missing_price?: number
          started_at?: string
          status?: string
          unchanged_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_import_staging: {
        Row: {
          brand: string
          category: string | null
          created_at: string
          diff_type: string
          id: string
          image_filename: string | null
          image_url: string | null
          msrp: number | null
          name: string
          previous_image_url: string | null
          previous_msrp: number | null
          previous_price: number | null
          previous_units_available: number | null
          price: number | null
          run_id: string
          source_last_updated: string | null
          units_available: number
        }
        Insert: {
          brand: string
          category?: string | null
          created_at?: string
          diff_type: string
          id?: string
          image_filename?: string | null
          image_url?: string | null
          msrp?: number | null
          name: string
          previous_image_url?: string | null
          previous_msrp?: number | null
          previous_price?: number | null
          previous_units_available?: number | null
          price?: number | null
          run_id: string
          source_last_updated?: string | null
          units_available?: number
        }
        Update: {
          brand?: string
          category?: string | null
          created_at?: string
          diff_type?: string
          id?: string
          image_filename?: string | null
          image_url?: string | null
          msrp?: number | null
          name?: string
          previous_image_url?: string | null
          previous_msrp?: number | null
          previous_price?: number | null
          previous_units_available?: number | null
          price?: number | null
          run_id?: string
          source_last_updated?: string | null
          units_available?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_import_staging_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "product_import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          category: string | null
          cost: number | null
          created_at: string
          floorfound_price: number | null
          id: string
          image_filename: string | null
          image_url: string | null
          msrp: number | null
          name: string
          price: number | null
          pricing_rule: string | null
          source_last_updated: string | null
          units_available: number
          updated_at: string
        }
        Insert: {
          brand: string
          category?: string | null
          cost?: number | null
          created_at?: string
          floorfound_price?: number | null
          id?: string
          image_filename?: string | null
          image_url?: string | null
          msrp?: number | null
          name: string
          price?: number | null
          pricing_rule?: string | null
          source_last_updated?: string | null
          units_available?: number
          updated_at?: string
        }
        Update: {
          brand?: string
          category?: string | null
          cost?: number | null
          created_at?: string
          floorfound_price?: number | null
          id?: string
          image_filename?: string | null
          image_url?: string | null
          msrp?: number | null
          name?: string
          price?: number | null
          pricing_rule?: string | null
          source_last_updated?: string | null
          units_available?: number
          updated_at?: string
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
      pallet_summary: {
        Row: {
          brand: string | null
          item_count: number | null
          pallet_id: string | null
          sample_category: string | null
          sample_image: string | null
          total_cost: number | null
          total_msrp: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_code_redemptions: {
        Args: never
        Returns: {
          code: string
          email: string
          redeemed_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      last_inventory_refreshed_at: { Args: never; Returns: string }
      redeem_access_code: { Args: { _code: string }; Returns: boolean }
      verify_access_code: { Args: { _code: string }; Returns: boolean }
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
