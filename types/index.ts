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

// ─── Packet content ───────────────────────────────────────────────────────────

/**
 * Controls how the PDF layer renders the response area for an activity.
 * Set by Claude in each activity; the PDF templates route on this value.
 * Old packets without this field fall back to subject-keyword heuristics.
 */
export type ContentType =
  | "reading_passage"   // passage field + comprehension questions
  | "worksheet"         // discrete answerable steps (math, science, history)
  | "writing_prompt"    // open-ended writing — renders ruled lines
  | "movement_activity" // PE/physical — renders a small "How did it go?" box
  | "coloring";         // art/craft — renders a large open draw box

export interface PacketActivity {
  subject: string;
  /** Explicit layout selector set by the AI. Optional for backwards compat. */
  content_type?: ContentType;
  /** Full reading passage text. Only set when content_type === "reading_passage". */
  passage?: string | null;
  title: string;
  description: string;
  instructions: string[];
  estimated_minutes: number;
  materials?: string[];
  answer_key?: string | null;
  encouragement?: string;
}

export interface PacketColoringPage {
  title: string;
  scene_description: string;
  instructions: string;
}

/** The structured JSON blob stored in packets.generated_content */
export interface PacketContent {
  // Legacy field name — some older packets use "title" at root
  title?: string;
  // New field name
  packet_title?: string;
  greeting?: string;
  mascot_name?: string;
  mascot_description?: string;
  mascot_emoji_cluster?: string;
  activities: PacketActivity[];
  coloring_page?: PacketColoringPage;
  daily_reflection?: string;
  parent_notes?: string;
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
  generated_content: PacketContent | null;
  mascot_image_url: string | null;
  coloring_image_url?: string | null;
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
