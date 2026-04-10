// ─── Profile ──────────────────────────────────────────────────────────────────

export type SubscriptionStatus = "free" | "pro" | "cancelled";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_period_end: string | null;
  packets_used_this_month: number;
  packets_reset_date: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Child ────────────────────────────────────────────────────────────────────

// Values match the DB check constraint on children.grade_level
export type GradeLevel = "K" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

// Values match the DB check constraint on children.learning_style
export type LearningStyle = "visual" | "hands-on" | "reader" | "mixed";

export interface Child {
  id: string;
  user_id: string;
  name: string;
  grade_level: GradeLevel;
  learning_style: LearningStyle;
  favorite_subjects: string[];
  special_notes: string | null;
  avatar_emoji: string;
  display_order: number;
  created_at: string;
}

// ─── Packet ───────────────────────────────────────────────────────────────────

export type PacketLength = "half" | "full";

export interface Packet {
  id: string;
  user_id: string;
  child_id: string | null;
  child_name: string; // denormalized — survives child deletion
  grade_level: GradeLevel;
  theme: string;
  packet_length: PacketLength;
  special_notes: string | null;
  generated_content: Record<string, unknown> | null;
  pdf_url: string | null;
  share_token: string;
  view_count: number;
  created_at: string;
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
