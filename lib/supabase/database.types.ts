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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      family_circle_members: {
        Row: {
          circle_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["circle_role_enum"]
          user_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["circle_role_enum"]
          user_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["circle_role_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "family_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      family_circles: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_circles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_templates: {
        Row: {
          category: Database["public"]["Enums"]["feedback_rating_enum"]
          id: string
          is_active: boolean
          message: string
          sort_order: number
        }
        Insert: {
          category: Database["public"]["Enums"]["feedback_rating_enum"]
          id?: string
          is_active?: boolean
          message: string
          sort_order?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["feedback_rating_enum"]
          id?: string
          is_active?: boolean
          message?: string
          sort_order?: number
        }
        Relationships: []
      }
      meal_feedback: {
        Row: {
          created_at: string
          custom_message: string | null
          id: string
          is_public: boolean
          meal_plan_item_id: string
          rating: Database["public"]["Enums"]["feedback_rating_enum"]
          respondent_name: string
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          id?: string
          is_public?: boolean
          meal_plan_item_id: string
          rating: Database["public"]["Enums"]["feedback_rating_enum"]
          respondent_name: string
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          id?: string
          is_public?: boolean
          meal_plan_item_id?: string
          rating?: Database["public"]["Enums"]["feedback_rating_enum"]
          respondent_name?: string
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_feedback_meal_plan_item_id_fkey"
            columns: ["meal_plan_item_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_feedback_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "feedback_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_items: {
        Row: {
          applies_all_days: boolean
          custom_name: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week_enum"]
          id: string
          is_locked: boolean
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type_enum"]
          recipe_id: string | null
          servings: number
          sort_order: number
        }
        Insert: {
          applies_all_days?: boolean
          custom_name?: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week_enum"]
          id?: string
          is_locked?: boolean
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type_enum"]
          recipe_id?: string | null
          servings?: number
          sort_order?: number
        }
        Update: {
          applies_all_days?: boolean
          custom_name?: string | null
          day_of_week?: Database["public"]["Enums"]["day_of_week_enum"]
          id?: string
          is_locked?: boolean
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type_enum"]
          recipe_id?: string | null
          servings?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          circle_id: string | null
          created_at: string
          id: string
          share_token: string | null
          status: Database["public"]["Enums"]["meal_plan_status_enum"]
          token_expires_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          circle_id?: string | null
          created_at?: string
          id?: string
          share_token?: string | null
          status?: Database["public"]["Enums"]["meal_plan_status_enum"]
          token_expires_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          circle_id?: string | null
          created_at?: string
          id?: string
          share_token?: string | null
          status?: Database["public"]["Enums"]["meal_plan_status_enum"]
          token_expires_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "family_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel_enum"]
          days_of_week: number[]
          feedback_delay_min: number
          feedback_enabled: boolean
          id: string
          meal_type: Database["public"]["Enums"]["meal_type_enum"]
          reminder_enabled: boolean
          reminder_time: string | null
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel_enum"]
          days_of_week?: number[]
          feedback_delay_min?: number
          feedback_enabled?: boolean
          id?: string
          meal_type: Database["public"]["Enums"]["meal_type_enum"]
          reminder_enabled?: boolean
          reminder_time?: string | null
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel_enum"]
          days_of_week?: number[]
          feedback_delay_min?: number
          feedback_enabled?: boolean
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type_enum"]
          reminder_enabled?: boolean
          reminder_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          id: string
          ingredient_name: string
          pantry_cat_id: string | null
          quantity: number | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          ingredient_name: string
          pantry_cat_id?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          ingredient_name?: string
          pantry_cat_id?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_pantry_cat_id_fkey"
            columns: ["pantry_cat_id"]
            isOneToOne: false
            referencedRelation: "pantry_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pantry_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_favorites: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_favorites_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_imports: {
        Row: {
          id: string
          imported_at: string
          parser_version: string
          raw_html_hash: string | null
          recipe_id: string
          source_url: string
        }
        Insert: {
          id?: string
          imported_at?: string
          parser_version: string
          raw_html_hash?: string | null
          recipe_id: string
          source_url: string
        }
        Update: {
          id?: string
          imported_at?: string
          parser_version?: string
          raw_html_hash?: string | null
          recipe_id?: string
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_imports_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          name: string
          pantry_cat_id: string | null
          quantity: number | null
          recipe_id: string
          sort_order: number
          unit: string | null
        }
        Insert: {
          id?: string
          name: string
          pantry_cat_id?: string | null
          quantity?: number | null
          recipe_id: string
          sort_order?: number
          unit?: string | null
        }
        Update: {
          id?: string
          name?: string
          pantry_cat_id?: string | null
          quantity?: number | null
          recipe_id?: string
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_pantry_cat_id_fkey"
            columns: ["pantry_cat_id"]
            isOneToOne: false
            referencedRelation: "pantry_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          description: string
          duration_min: number | null
          id: string
          recipe_id: string
          step_number: number
        }
        Insert: {
          description: string
          duration_min?: number | null
          id?: string
          recipe_id: string
          step_number: number
        }
        Update: {
          description?: string
          duration_min?: number | null
          id?: string
          recipe_id?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category_id: string | null
          circle_id: string | null
          cook_time_min: number | null
          created_at: string
          description: string | null
          difficulty:
            | Database["public"]["Enums"]["recipe_difficulty_enum"]
            | null
          id: string
          name: string
          name_fingerprint: string
          parent_recipe_id: string | null
          photo_url: string | null
          prep_time_min: number | null
          servings: number
          slug: string
          source_url: string | null
          user_id: string | null
          variant_label: string | null
          visibility: Database["public"]["Enums"]["recipe_visibility_enum"]
        }
        Insert: {
          category_id?: string | null
          circle_id?: string | null
          cook_time_min?: number | null
          created_at?: string
          description?: string | null
          difficulty?:
            | Database["public"]["Enums"]["recipe_difficulty_enum"]
            | null
          id?: string
          name: string
          name_fingerprint: string
          parent_recipe_id?: string | null
          photo_url?: string | null
          prep_time_min?: number | null
          servings?: number
          slug: string
          source_url?: string | null
          user_id?: string | null
          variant_label?: string | null
          visibility?: Database["public"]["Enums"]["recipe_visibility_enum"]
        }
        Update: {
          category_id?: string | null
          circle_id?: string | null
          cook_time_min?: number | null
          created_at?: string
          description?: string | null
          difficulty?:
            | Database["public"]["Enums"]["recipe_difficulty_enum"]
            | null
          id?: string
          name?: string
          name_fingerprint?: string
          parent_recipe_id?: string | null
          photo_url?: string | null
          prep_time_min?: number | null
          servings?: number
          slug?: string
          source_url?: string | null
          user_id?: string | null
          variant_label?: string | null
          visibility?: Database["public"]["Enums"]["recipe_visibility_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "recipes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "family_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_parent_recipe_id_fkey"
            columns: ["parent_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          id: string
          ingredient_name: string
          is_checked: boolean
          is_from_pantry: boolean
          list_id: string
          pantry_cat_id: string | null
          quantity: number | null
          sort_order: number
          unit: string | null
        }
        Insert: {
          id?: string
          ingredient_name: string
          is_checked?: boolean
          is_from_pantry?: boolean
          list_id: string
          pantry_cat_id?: string | null
          quantity?: number | null
          sort_order?: number
          unit?: string | null
        }
        Update: {
          id?: string
          ingredient_name?: string
          is_checked?: boolean
          is_from_pantry?: boolean
          list_id?: string
          pantry_cat_id?: string | null
          quantity?: number | null
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_pantry_cat_id_fkey"
            columns: ["pantry_cat_id"]
            isOneToOne: false
            referencedRelation: "pantry_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          generated_at: string
          id: string
          meal_plan_id: string
          status: Database["public"]["Enums"]["shopping_list_status_enum"]
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          meal_plan_id: string
          status?: Database["public"]["Enums"]["shopping_list_status_enum"]
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          meal_plan_id?: string
          status?: Database["public"]["Enums"]["shopping_list_status_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_answers: {
        Row: {
          comment: string | null
          id: string
          meal_plan_item_id: string
          reaction: Database["public"]["Enums"]["survey_reaction_enum"]
          response_id: string
        }
        Insert: {
          comment?: string | null
          id?: string
          meal_plan_item_id: string
          reaction: Database["public"]["Enums"]["survey_reaction_enum"]
          response_id: string
        }
        Update: {
          comment?: string | null
          id?: string
          meal_plan_item_id?: string
          reaction?: Database["public"]["Enums"]["survey_reaction_enum"]
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_meal_plan_item_id_fkey"
            columns: ["meal_plan_item_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          created_at: string
          id: string
          meal_plan_id: string
          respondent_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          meal_plan_id: string
          respondent_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          meal_plan_id?: string
          respondent_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_meal_config: {
        Row: {
          default_time: string | null
          display_order: number
          id: string
          is_active: boolean
          meal_type: Database["public"]["Enums"]["meal_type_enum"]
          mode: Database["public"]["Enums"]["meal_mode_enum"]
          user_id: string
        }
        Insert: {
          default_time?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          meal_type: Database["public"]["Enums"]["meal_type_enum"]
          mode?: Database["public"]["Enums"]["meal_mode_enum"]
          user_id: string
        }
        Update: {
          default_time?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          meal_type?: Database["public"]["Enums"]["meal_type_enum"]
          mode?: Database["public"]["Enums"]["meal_mode_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_meal_config_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          dietary_prefs: Json
          display_name: string
          email: string
          family_size: number
          id: string
        }
        Insert: {
          created_at?: string
          dietary_prefs?: Json
          display_name: string
          email: string
          family_size?: number
          id: string
        }
        Update: {
          created_at?: string
          dietary_prefs?: Json
          display_name?: string
          email?: string
          family_size?: number
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_circle_member: {
        Args: { p_circle_id: string; p_user_id: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      circle_role_enum: "planificatrice" | "membre"
      day_of_week_enum:
        | "lundi"
        | "mardi"
        | "mercredi"
        | "jeudi"
        | "vendredi"
        | "samedi"
        | "dimanche"
      feedback_rating_enum: "excellent" | "correct" | "decevant"
      meal_mode_enum: "daily" | "template"
      meal_plan_status_enum: "draft" | "shared" | "finalized"
      meal_type_enum: "petit_dejeuner" | "dejeuner" | "gouter" | "diner"
      notification_channel_enum: "push" | "in_app"
      recipe_difficulty_enum: "facile" | "moyen" | "difficile"
      recipe_visibility_enum: "private" | "circle" | "community"
      shopping_list_status_enum: "active" | "completed" | "archived"
      survey_reaction_enum: "aime" | "bof" | "naime_pas"
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
      circle_role_enum: ["planificatrice", "membre"],
      day_of_week_enum: [
        "lundi",
        "mardi",
        "mercredi",
        "jeudi",
        "vendredi",
        "samedi",
        "dimanche",
      ],
      feedback_rating_enum: ["excellent", "correct", "decevant"],
      meal_mode_enum: ["daily", "template"],
      meal_plan_status_enum: ["draft", "shared", "finalized"],
      meal_type_enum: ["petit_dejeuner", "dejeuner", "gouter", "diner"],
      notification_channel_enum: ["push", "in_app"],
      recipe_difficulty_enum: ["facile", "moyen", "difficile"],
      recipe_visibility_enum: ["private", "circle", "community"],
      shopping_list_status_enum: ["active", "completed", "archived"],
      survey_reaction_enum: ["aime", "bof", "naime_pas"],
    },
  },
} as const
