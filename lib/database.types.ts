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
          distance_unit: string | null
          gender: string | null
          height_unit: string | null
          height_value: number | null
          id: string
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
          distance_unit?: string | null
          gender?: string | null
          height_unit?: string | null
          height_value?: number | null
          id: string
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
          distance_unit?: string | null
          gender?: string | null
          height_unit?: string | null
          height_value?: number | null
          id?: string
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
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Workout = Database["public"]["Tables"]["workouts"]["Row"]
export type WorkoutWeekly = Database["public"]["Tables"]["workout_weekly"]["Row"]