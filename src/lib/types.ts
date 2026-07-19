export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type WeightGoal = 'lose' | 'maintain' | 'gain';
export type LogType = 'food' | 'exercise';
export type MessageSender = 'user' | 'assistant';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  gender: Gender | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  activity_level: ActivityLevel | null;
  weight_goal: WeightGoal | null;
  target_speed: number | null;
  bmr: number | null;
  tdee: number | null;
  target_calories: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  water_goal_ml: number | null;
  /** Tampilkan pelacak air di halaman Hari ini */
  show_water_tracker?: boolean | null;
  profile_completed: boolean;
  updated_at?: string;
}

export interface CalorieLog {
  id: string;
  user_id: string;
  log_date: string;
  type: LogType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string | null;
  duration_minutes: number | null;
  message_id: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  log_date: string;
  sender: MessageSender;
  message_text: string | null;
  image_url: string | null;
  structured_data: AiResponse | null;
  created_at: string;
}

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving?: string;
}

export interface ExerciseItem {
  name: string;
  caloriesBurned: number;
  durationMinutes: number;
}

export interface AiResponse {
  type: 'food' | 'exercise' | 'chat';
  reply: string;
  foodItems?: FoodItem[];
  exerciseItems?: ExerciseItem[];
  source?: 'local-db' | 'gemini' | 'local';
}

export interface WaterLog {
  id: string;
  user_id: string;
  log_date: string;
  cups: number;
  ml: number;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export interface ReminderSettings {
  user_id: string;
  breakfast_enabled: boolean;
  breakfast_time: string;
  lunch_enabled: boolean;
  lunch_time: string;
  dinner_enabled: boolean;
  dinner_time: string;
  water_enabled: boolean;
  water_interval_hours: number;
}

export interface DayTotals {
  foodCalories: number;
  exerciseCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  remaining: number;
}
