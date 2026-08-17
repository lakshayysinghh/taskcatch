export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  raw_source_text?: string | null;
  source_app?: string | null;
  source_window_title?: string | null;
  source_url?: string | null;
  batch_id?: string | null;
  batch_total?: number | null;
  deadline?: string | null;
  priority: Priority | string;
  category: string;
  is_completed: boolean;
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  raw_source_text?: string | null;
  source_app?: string | null;
  source_window_title?: string | null;
  source_url?: string | null;
  batch_id?: string | null;
  batch_total?: number | null;
  deadline?: string | null;
  priority?: Priority | string;
  category?: string;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  raw_source_text?: string | null;
  source_app?: string | null;
  source_window_title?: string | null;
  source_url?: string | null;
  batch_id?: string | null;
  batch_total?: number | null;
  deadline?: string | null;
  priority?: Priority | string;
  category?: string;
  is_completed?: boolean;
}

export interface ExtractedTask {
  task_title: string;
  source_app?: string | null;
  source_window_title?: string | null;
  source_url?: string | null;
  deadline?: string | null;
  priority: Priority | string;
  category: string;
}

export interface ExtractionResult {
  success: boolean;
  task?: Task;
  tasks?: Task[];
  extracted?: ExtractedTask;
  raw_text: string;
  error?: string | null;
  synced_to_todoist: boolean;
}

export interface AppSettings {
  groq_api_key?: string | null;
  groq_model: string;
  openai_api_key?: string | null;
  openai_model: string;
  todoist_api_key?: string | null;
  todoist_sync_enabled: boolean;
  sound_feedback_enabled?: boolean;
  eod_time?: string; // e.g. "17:00" or "18:00"
  workday_start?: string; // e.g. "09:00"
  global_shortcut: string;
  custom_instructions?: string | null;
  theme: string;
}

export interface SystemPermissionsStatus {
  platform: string;
  has_accessibility_permission: boolean;
  notes: string;
}

export type StatusFilter = 'all' | 'active' | 'completed';
export type SortOption = 'deadline' | 'created' | 'priority' | 'title';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface FloatingHudData {
  id: string;
  task: Task;
  expiresAt: number;
}
