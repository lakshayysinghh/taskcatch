use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{Task, CreateTaskInput, UpdateTaskInput, AppSettings};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(db_path: Option<PathBuf>) -> Result<Self, rusqlite::Error> {
        let path = match db_path {
            Some(p) => {
                if let Some(parent) = p.parent() {
                    let _ = std::fs::create_dir_all(parent);
                }
                p
            }
            None => {
                let base = dirs::data_local_dir()
                    .unwrap_or_else(|| PathBuf::from("."))
                    .join("TaskCatch");
                let _ = std::fs::create_dir_all(&base);
                base.join("taskcatch.db")
            }
        };

        let conn = Connection::open(&path)?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_schema()?;
        Ok(db)
    }

    pub fn new_in_memory() -> Result<Self, rusqlite::Error> {
        let conn = Connection::open_in_memory()?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                raw_source_text TEXT,
                deadline DATETIME,
                priority TEXT DEFAULT 'medium',
                category TEXT DEFAULT 'General',
                is_completed BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
            "
        )?;

        Ok(())
    }

    pub fn get_all_tasks(&self) -> Result<Vec<Task>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, raw_source_text, deadline, priority, category, is_completed, created_at 
             FROM tasks 
             ORDER BY is_completed ASC, 
                      CASE 
                        WHEN deadline IS NOT NULL AND deadline != '' THEN deadline 
                        ELSE '9999-12-31' 
                      END ASC, 
                      created_at DESC"
        )?;

        let task_iter = stmt.query_map([], |row| {
            let is_completed_num: i32 = row.get(6)?;
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                raw_source_text: row.get(2)?,
                deadline: row.get(3)?,
                priority: row.get(4)?,
                category: row.get(5)?,
                is_completed: is_completed_num != 0,
                created_at: row.get(7)?,
            })
        })?;

        let mut tasks = Vec::new();
        for task in task_iter {
            tasks.push(task?);
        }
        Ok(tasks)
    }

    pub fn get_task_by_id(&self, id: &str) -> Result<Option<Task>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, raw_source_text, deadline, priority, category, is_completed, created_at 
             FROM tasks WHERE id = ?1"
        )?;

        stmt.query_row(params![id], |row| {
            let is_completed_num: i32 = row.get(6)?;
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                raw_source_text: row.get(2)?,
                deadline: row.get(3)?,
                priority: row.get(4)?,
                category: row.get(5)?,
                is_completed: is_completed_num != 0,
                created_at: row.get(7)?,
            })
        }).optional()
    }

    pub fn create_task(&self, input: CreateTaskInput) -> Result<Task, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now().to_rfc3339();
        let priority = input.priority.unwrap_or_else(|| "medium".to_string());
        let category = input.category.unwrap_or_else(|| "General".to_string());

        conn.execute(
            "INSERT INTO tasks (id, title, raw_source_text, deadline, priority, category, is_completed, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
            params![
                id,
                input.title,
                input.raw_source_text,
                input.deadline,
                priority,
                category,
                created_at
            ],
        )?;

        Ok(Task {
            id,
            title: input.title,
            raw_source_text: input.raw_source_text,
            deadline: input.deadline,
            priority,
            category,
            is_completed: false,
            created_at,
        })
    }

    pub fn insert_full_task(&self, task: &Task) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO tasks (id, title, raw_source_text, deadline, priority, category, is_completed, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                task.id,
                task.title,
                task.raw_source_text,
                task.deadline,
                task.priority,
                task.category,
                if task.is_completed { 1 } else { 0 },
                task.created_at
            ],
        )?;
        Ok(())
    }

    pub fn update_task(&self, input: UpdateTaskInput) -> Result<Task, rusqlite::Error> {
        let existing = self.get_task_by_id(&input.id)?
            .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)?;

        let updated_title = input.title.unwrap_or(existing.title);
        let updated_raw_source = input.raw_source_text.or(existing.raw_source_text);
        let updated_deadline = input.deadline.or(existing.deadline);
        let updated_priority = input.priority.unwrap_or(existing.priority);
        let updated_category = input.category.unwrap_or(existing.category);
        let updated_is_completed = input.is_completed.unwrap_or(existing.is_completed);

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tasks 
             SET title = ?1, raw_source_text = ?2, deadline = ?3, priority = ?4, category = ?5, is_completed = ?6
             WHERE id = ?7",
            params![
                updated_title,
                updated_raw_source,
                updated_deadline,
                updated_priority,
                updated_category,
                if updated_is_completed { 1 } else { 0 },
                input.id
            ],
        )?;

        Ok(Task {
            id: input.id,
            title: updated_title,
            raw_source_text: updated_raw_source,
            deadline: updated_deadline,
            priority: updated_priority,
            category: updated_category,
            is_completed: updated_is_completed,
            created_at: existing.created_at,
        })
    }

    pub fn toggle_task_completion(&self, id: &str) -> Result<Task, rusqlite::Error> {
        let existing = self.get_task_by_id(id)?
            .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)?;

        let new_state = !existing.is_completed;
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tasks SET is_completed = ?1 WHERE id = ?2",
            params![if new_state { 1 } else { 0 }, id],
        )?;

        let mut updated = existing;
        updated.is_completed = new_state;
        Ok(updated)
    }

    pub fn delete_task(&self, id: &str) -> Result<bool, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
        Ok(rows > 0)
    }

    pub fn clear_completed_tasks(&self) -> Result<usize, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute("DELETE FROM tasks WHERE is_completed = 1", [])?;
        Ok(rows)
    }

    // Settings helpers
    pub fn get_setting(&self, key: &str) -> Result<Option<String>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        stmt.query_row(params![key], |row| row.get(0)).optional()
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) 
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_app_settings(&self) -> Result<AppSettings, rusqlite::Error> {
        let mut settings = AppSettings::default();

        if let Some(val) = self.get_setting("groq_api_key")? {
            if !val.trim().is_empty() {
                settings.groq_api_key = Some(val);
            }
        }
        if let Some(val) = self.get_setting("groq_model")? {
            if !val.trim().is_empty() {
                settings.groq_model = val;
            }
        }
        if let Some(val) = self.get_setting("openai_api_key")? {
            if !val.trim().is_empty() {
                settings.openai_api_key = Some(val);
            }
        }
        if let Some(val) = self.get_setting("openai_model")? {
            if !val.trim().is_empty() {
                settings.openai_model = val;
            }
        }
        if let Some(val) = self.get_setting("todoist_api_key")? {
            if !val.trim().is_empty() {
                settings.todoist_api_key = Some(val);
            }
        }
        if let Some(val) = self.get_setting("todoist_sync_enabled")? {
            settings.todoist_sync_enabled = val == "true" || val == "1";
        }
        if let Some(val) = self.get_setting("global_shortcut")? {
            if !val.trim().is_empty() {
                settings.global_shortcut = val;
            }
        }
        if let Some(val) = self.get_setting("custom_instructions")? {
            if !val.trim().is_empty() {
                settings.custom_instructions = Some(val);
            }
        }
        if let Some(val) = self.get_setting("theme")? {
            if !val.trim().is_empty() {
                settings.theme = val;
            }
        }

        Ok(settings)
    }

    pub fn save_app_settings(&self, settings: &AppSettings) -> Result<(), rusqlite::Error> {
        self.set_setting("groq_api_key", settings.groq_api_key.as_deref().unwrap_or(""))?;
        self.set_setting("groq_model", &settings.groq_model)?;
        self.set_setting("openai_api_key", settings.openai_api_key.as_deref().unwrap_or(""))?;
        self.set_setting("openai_model", &settings.openai_model)?;
        self.set_setting("todoist_api_key", settings.todoist_api_key.as_deref().unwrap_or(""))?;
        self.set_setting("todoist_sync_enabled", if settings.todoist_sync_enabled { "true" } else { "false" })?;
        self.set_setting("global_shortcut", &settings.global_shortcut)?;
        self.set_setting("custom_instructions", settings.custom_instructions.as_deref().unwrap_or(""))?;
        self.set_setting("theme", &settings.theme)?;
        Ok(())
    }
}
