// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Child ────────────────────────────────────────────────────────────────────

export type LearningStyle = "visual" | "auditory" | "kinesthetic" | "reading";
export type GradeLevel =
  | "preschool"
  | "kindergarten"
  | "1st"
  | "2nd"
  | "3rd"
  | "4th"
  | "5th"
  | "6th"
  | "7th"
  | "8th";

export interface Child {
  id: string;
  user_id: string;
  name: string;
  age: number;
  grade_level: GradeLevel;
  interests: string[]; // e.g. ["dinosaurs", "drawing", "minecraft"]
  learning_style: LearningStyle | null;
  notes: string | null; // special needs, parent notes, etc.
  created_at: string;
  updated_at: string;
}

// ─── Packet ───────────────────────────────────────────────────────────────────

export type PacketStatus = "generating" | "ready" | "error";

export type SubjectArea =
  | "math"
  | "reading"
  | "writing"
  | "science"
  | "history"
  | "art"
  | "music"
  | "geography"
  | "life_skills";

export interface PacketActivity {
  subject: SubjectArea;
  title: string;
  description: string;
  instructions: string[];
  estimated_minutes: number;
  materials?: string[];
}

export interface Packet {
  id: string;
  user_id: string;
  child_id: string;
  child?: Child;
  title: string;
  theme: string; // e.g. "space", "ocean", "fairy tales"
  date: string; // ISO date string
  subjects: SubjectArea[];
  activities: PacketActivity[];
  status: PacketStatus;
  pdf_url: string | null; // Supabase Storage URL
  generation_prompt: string | null; // stored for debugging/regeneration
  created_at: string;
  updated_at: string;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete";

export type PlanId = "free" | "starter" | "family";

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan_id: PlanId;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  packets_used_this_month: number;
  packets_limit: number; // -1 = unlimited
  created_at: string;
  updated_at: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  code?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}
