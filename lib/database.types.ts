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
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string | null
          daily_steps_avg: number | null
          daily_water_liters: number | null
          daily_kcal_goal: number | null
          distance_unit: string | null
          gender: string | null
          height_unit: string | null
          height_value: number | null
          id: string
          include_active_kcal: boolean | null
          macro_carb_pct: number | null
          macro_fat_pct: number | null
          macro_protein_pct: number | null
          updated_at: string | null
          username: string | null
          target_aerobic_sessions: number | null
          target_anaerobic_sessions: number | null
          weekly_aerobic_min: number | null
          weekly_anaerobic_min: number | null
          weight_unit: string | null
          weight_value: number | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          daily_steps_avg?: number | null
          daily_water_liters?: number | null
          daily_kcal_goal?: number | null
          distance_unit?: string | null
          gender?: string | null
          height_unit?: string | null
          height_value?: number | null
          id: string
          include_active_kcal?: boolean | null
          macro_carb_pct?: number | null
          macro_fat_pct?: number | null
          macro_protein_pct?: number | null
          updated_at?: string | null
          username?: string | null
          target_aerobic_sessions?: number | null
          target_anaerobic_sessions?: number | null
          weekly_aerobic_min?: number | null
          weekly_anaerobic_min?: number | null
          weight_unit?: string | null
          weight_value?: number | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          daily_steps_avg?: number | null
          daily_water_liters?: number | null
          daily_kcal_goal?: number | null
          distance_unit?: string | null
          gender?: string | null
          height_unit?: string | null
          height_value?: number | null
          id?: string
          include_active_kcal?: boolean | null
          macro_carb_pct?: number | null
          macro_fat_pct?: number | null
          macro_protein_pct?: number | null
          updated_at?: string | null
          username?: string | null
          target_aerobic_sessions?: number | null
          target_anaerobic_sessions?: number | null
          weekly_aerobic_min?: number | null
          weekly_anaerobic_min?: number | null
          weight_unit?: string | null
          weight_value?: number | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          type: "aerobic" | "anaerobic"
          exercise_type: string
          duration_minutes: number
          kcal_burned: number
          distance_value: number | null
          distance_unit: string | null
          pace_min_per_unit: number | null
          hr_zone_1_min: number
          hr_zone_2_min: number
          hr_zone_3_min: number
          hr_zone_4_min: number
          hr_zone_5_min: number
          workout_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: "aerobic" | "anaerobic"
          exercise_type: string
          duration_minutes: number
          kcal_burned: number
          distance_value?: number | null
          distance_unit?: string | null
          pace_min_per_unit?: number | null
          hr_zone_1_min?: number
          hr_zone_2_min?: number
          hr_zone_3_min?: number
          hr_zone_4_min?: number
          hr_zone_5_min?: number
          workout_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: "aerobic" | "anaerobic"
          exercise_type?: string
          duration_minutes?: number
          kcal_burned?: number
          distance_value?: number | null
          distance_unit?: string | null
          pace_min_per_unit?: number | null
          hr_zone_1_min?: number
          hr_zone_2_min?: number
          hr_zone_3_min?: number
          hr_zone_4_min?: number
          hr_zone_5_min?: number
          workout_at?: string
          created_at?: string
        }
        Relationships: []
      }
      workout_weekly: {
        Row: {
          user_id: string
          week_start: string
          total_workouts: number
          total_kcal: number
        }
        Insert: {
          user_id: string
          week_start: string
          total_workouts?: number
          total_kcal?: number
        }
        Update: {
          user_id?: string
          week_start?: string
          total_workouts?: number
          total_kcal?: number
        }
        Relationships: []
      }
      food_library: {
        Row: {
          id: string
          user_id: string
          name: string
          brand: string | null
          code: string | null
          base_amount_grams: number
          kcal_per_base: number
          carbs_g_per_base: number
          fat_g_per_base: number
          protein_g_per_base: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          brand?: string | null
          code?: string | null
          base_amount_grams: number
          kcal_per_base: number
          carbs_g_per_base: number
          fat_g_per_base: number
          protein_g_per_base: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          brand?: string | null
          code?: string | null
          base_amount_grams?: number
          kcal_per_base?: number
          carbs_g_per_base?: number
          fat_g_per_base?: number
          protein_g_per_base?: number
          created_at?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          id: string
          user_id: string
          food_id: string | null
          name: string
          brand: string | null
          grams: number
          kcal: number
          carbs_g: number
          fat_g: number
          protein_g: number
          logged_at: string
        }
        Insert: {
          id?: string
          user_id: string
          food_id?: string | null
          name: string
          brand?: string | null
          grams: number
          kcal: number
          carbs_g: number
          fat_g: number
          protein_g: number
          logged_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          food_id?: string | null
          name?: string
          brand?: string | null
          grams?: number
          kcal?: number
          carbs_g?: number
          fat_g?: number
          protein_g?: number
          logged_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      check_email_exists: {
        Args: { p_email: string }
        Returns: boolean
      }
    }
    Enums: { [_ in never]: never }
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Workout = Database["public"]["Tables"]["workouts"]["Row"]
export type WorkoutWeekly = Database["public"]["Tables"]["workout_weekly"]["Row"]