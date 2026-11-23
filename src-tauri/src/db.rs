use chrono::DateTime;
use serde::{Deserialize, Deserializer, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub content: String,
    pub original_text: Option<String>,
    pub timestamp: String,
    #[serde(default = "default_priority")]
    pub priority: String, // "Urgent", "High", "Medium", "Low"
    #[serde(default = "default_category")]
    pub category: String, // "General", "Security", etc.
    pub deadline: Option<String>,
    pub source_app: Option<String>,
    #[serde(default)]
    pub completed: bool,
}

fn default_priority() -> String {
    "Medium".to_string()
}

fn default_category() -> String {
    "General".to_string()
}

/// The only priorities and categories the app produces. The frontend keeps
/// the same lists in `src/lib/taskMeta.js`.
pub const PRIORITIES: [&str; 4] = ["Urgent", "High", "Medium", "Low"];
pub const CATEGORIES: [&str; 5] = ["General", "Development", "Finance", "Security", "Personal"];
const MAX_CONTENT_CHARS: usize = 500;

fn canonical(value: &str, allowed: &[&str]) -> Option<String> {
    let value = value.trim();
    allowed
        .iter()
        .find(|a| a.eq_ignore_ascii_case(value))
        .map(|a| a.to_string())
}

/// Case-insensitive match against [`PRIORITIES`], returning the canonical spelling.
pub fn normalize_priority(value: &str) -> Option<String> {
    canonical(value, &PRIORITIES)
}

/// Case-insensitive match against [`CATEGORIES`], returning the canonical spelling.
pub fn normalize_category(value: &str) -> Option<String> {
    canonical(value, &CATEGORIES)
}

/// Accepts an RFC 3339 date-time with a timezone (`Z` or `+05:30`) and
/// returns it re-serialised. Free text such as "Today at 5 PM" is rejected.
pub fn normalize_deadline(value: &str) -> Result<String, String> {
    DateTime::parse_from_rfc3339(value.trim())
        .map(|dt| dt.to_rfc3339())
        .map_err(|_| {
            format!(
                "Invalid deadline '{}': expected an ISO-8601 date-time with a timezone",
                value
            )
        })
}

pub fn normalize_content(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err("Task title cannot be empty".to_string());
    }
    if value.chars().count() > MAX_CONTENT_CHARS {
        return Err(format!("Task title is longer than {} characters", MAX_CONTENT_CHARS));
    }
    Ok(value.to_string())
}

/// Lets a JSON field distinguish "absent" (`None`: leave unchanged) from
/// `null` (`Some(None)`: clear it).
fn double_option<'de, D, T>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer).map(Some)
}

/// A partial update to a task. Absent fields are left unchanged; `deadline`
/// and `original_text` can be cleared by sending `null`.
#[derive(Debug, Default, Clone, Deserialize)]
pub struct TaskPatch {
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub priority: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default, deserialize_with = "double_option")]
    pub deadline: Option<Option<String>>,
    #[serde(default, deserialize_with = "double_option")]
    pub original_text: Option<Option<String>>,
}

impl TaskPatch {
    /// Validates every field before changing anything, so a single bad field
    /// leaves the task untouched.
    pub fn apply_to(&self, task: &mut Task) -> Result<(), String> {
        let content = self.content.as_deref().map(normalize_content).transpose()?;
        let priority = match self.priority.as_deref() {
            Some(p) => Some(normalize_priority(p).ok_or_else(|| format!("Invalid priority '{}'", p))?),
            None => None,
        };
        let category = match self.category.as_deref() {
            // Re-sending an existing (possibly legacy) category is not a change.
            Some(c) if c == task.category => None,
            Some(c) => Some(normalize_category(c).ok_or_else(|| format!("Invalid category '{}'", c))?),
            None => None,
        };
        let deadline = match &self.deadline {
            Some(Some(d)) if !d.trim().is_empty() => Some(Some(normalize_deadline(d)?)),
            Some(_) => Some(None),
            None => None,
        };
        let original_text = match &self.original_text {
            Some(Some(t)) if !t.trim().is_empty() => Some(Some(t.clone())),
            Some(_) => Some(None),
            None => None,
        };

        if let Some(v) = content {
            task.content = v;
        }
        if let Some(v) = priority {
            task.priority = v;
        }
        if let Some(v) = category {
            task.category = v;
        }
        if let Some(v) = deadline {
            task.deadline = v;
        }
        if let Some(v) = original_text {
            task.original_text = v;
        }
        Ok(())
    }
}

/// Serialises every read-modify-write cycle on the task file. Tauri runs
/// commands and capture flows concurrently; without this, two writers can each
/// read the same list and the second write silently drops the first change.
static DB_LOCK: Mutex<()> = Mutex::new(());

fn lock_db() -> MutexGuard<'static, ()> {
    // Writes are atomic, so a panic while holding the lock cannot leave a
    // half-written file behind; a poisoned lock is safe to keep using.
    DB_LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn get_db_path() -> PathBuf {
    let mut path = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("TaskCatch");
    fs::create_dir_all(&path).ok();
    path.push("tasks.json");
    path
}

/// `tasks.json` + `suffix` in the same directory (e.g. `tasks.json.bak`).
fn sibling(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.file_name().map(|n| n.to_os_string()).unwrap_or_default();
    name.push(suffix);
    path.with_file_name(name)
}

fn parse_tasks(content: &str) -> Result<Vec<Task>, serde_json::Error> {
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }
    serde_json::from_str(content)
}

/// Loads the task list. It never substitutes an empty list for data it failed
/// to read, because the next write would then destroy that data:
/// - missing file: empty list (first run)
/// - unreadable file: error, file left untouched
/// - unparseable file: moved aside to `tasks.json.corrupt-<time>-<id>`, then
///   restored from `tasks.json.bak` when possible. If no backup is usable the
///   list starts empty and the returned notice says where the old data went.
fn load_from(path: &Path) -> Result<(Vec<Task>, Option<String>), String> {
    if !path.exists() {
        return Ok((Vec::new(), None));
    }

    let content = fs::read_to_string(path)
        .map_err(|e| format!("Could not read task file {}: {}", path.display(), e))?;

    let parse_err = match parse_tasks(&content) {
        Ok(tasks) => return Ok((tasks, None)),
        Err(e) => e,
    };

    let unique = uuid::Uuid::new_v4().to_string();
    let quarantine = sibling(
        path,
        &format!(".corrupt-{}-{}", chrono::Utc::now().format("%Y%m%dT%H%M%SZ"), &unique[..8]),
    );
    fs::rename(path, &quarantine).map_err(|e| {
        format!(
            "Task file {} is corrupt ({}) and could not be moved aside: {}",
            path.display(),
            parse_err,
            e
        )
    })?;
    eprintln!(
        "Task file was corrupt ({}); preserved it at {}",
        parse_err,
        quarantine.display()
    );

    if let Ok(backup) = fs::read_to_string(sibling(path, ".bak")) {
        if let Ok(tasks) = parse_tasks(&backup) {
            write_to(path, &tasks)?;
            eprintln!("Restored {} task(s) from backup", tasks.len());
            return Ok((tasks, None));
        }
    }

    let notice = format!(
        "Your task file could not be read and no usable backup was found. \
         The unreadable file was preserved at {}.",
        quarantine.display()
    );
    Ok((Vec::new(), Some(notice)))
}

/// Atomically replaces the task file: write a temp file, flush it to disk,
/// then rename it over the original. A crash mid-write leaves the previous
/// file intact. The previous file is also copied to `tasks.json.bak` first.
fn write_to(path: &Path, tasks: &[Task]) -> Result<(), String> {
    let content = serde_json::to_string_pretty(tasks).map_err(|e| e.to_string())?;

    if path.exists() {
        // Only reached after a successful load, so this is a known-good copy.
        if let Err(e) = fs::copy(path, sibling(path, ".bak")) {
            eprintln!("Could not update task backup: {}", e);
        }
    }

    let tmp = sibling(path, ".tmp");
    let write_tmp = || -> std::io::Result<()> {
        let mut file = fs::File::create(&tmp)?;
        file.write_all(content.as_bytes())?;
        file.sync_all()
    };
    if let Err(e) = write_tmp() {
        let _ = fs::remove_file(&tmp);
        return Err(format!("Could not write task file: {}", e));
    }

    // On Windows std::fs::rename replaces an existing destination.
    fs::rename(&tmp, path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("Could not save task file: {}", e)
    })
}

/// Loads tasks for a mutation. A recovery notice is logged rather than
/// returned so the caller's change (e.g. a fresh capture) is not lost.
fn load_for_update(path: &Path) -> Result<Vec<Task>, String> {
    let (tasks, notice) = load_from(path)?;
    if let Some(notice) = notice {
        eprintln!("{}", notice);
    }
    Ok(tasks)
}

fn get_tasks_at(path: &Path) -> Result<Vec<Task>, String> {
    let _guard = lock_db();
    let (tasks, notice) = load_from(path)?;
    match notice {
        Some(notice) => Err(notice),
        None => Ok(tasks),
    }
}

fn save_task_at(path: &Path, task: Task) -> Result<(), String> {
    let _guard = lock_db();
    let mut tasks = load_for_update(path)?;
    tasks.insert(0, task);
    write_to(path, &tasks)
}

fn delete_task_at(path: &Path, task_id: &str) -> Result<(), String> {
    let _guard = lock_db();
    let mut tasks = load_for_update(path)?;
    let before = tasks.len();
    tasks.retain(|t| t.id != task_id);
    if tasks.len() == before {
        return Ok(()); // already gone; nothing to write
    }
    write_to(path, &tasks)
}

fn toggle_task_at(path: &Path, task_id: &str) -> Result<bool, String> {
    let _guard = lock_db();
    let mut tasks = load_for_update(path)?;
    let task = tasks
        .iter_mut()
        .find(|t| t.id == task_id)
        .ok_or_else(|| format!("Task {} not found", task_id))?;
    task.completed = !task.completed;
    let new_state = task.completed;
    write_to(path, &tasks)?;
    Ok(new_state)
}

fn update_task_at(path: &Path, task_id: &str, patch: &TaskPatch) -> Result<Task, String> {
    let _guard = lock_db();
    let mut tasks = load_for_update(path)?;
    let task = tasks
        .iter_mut()
        .find(|t| t.id == task_id)
        .ok_or_else(|| format!("Task {} not found", task_id))?;
    patch.apply_to(task)?;
    let updated = task.clone();
    write_to(path, &tasks)?;
    Ok(updated)
}

pub fn get_tasks() -> Result<Vec<Task>, String> {
    get_tasks_at(&get_db_path())
}

pub fn save_task(task: Task) -> Result<(), String> {
    save_task_at(&get_db_path(), task)
}

pub fn delete_task(task_id: &str) -> Result<(), String> {
    delete_task_at(&get_db_path(), task_id)
}

pub fn toggle_task(task_id: &str) -> Result<bool, String> {
    toggle_task_at(&get_db_path(), task_id)
}

/// Applies a validated partial update and returns the saved task.
pub fn update_task(task_id: &str, patch: &TaskPatch) -> Result<Task, String> {
    update_task_at(&get_db_path(), task_id, patch)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "taskcatch-test-{}-{}",
            name,
            uuid::Uuid::new_v4()
        ));
        fs::create_dir_all(&dir).unwrap();
        dir.join("tasks.json")
    }

    fn task(id: &str) -> Task {
        Task {
            id: id.to_string(),
            content: format!("task {}", id),
            original_text: None,
            timestamp: "2026-01-01T00:00:00Z".to_string(),
            priority: "Medium".to_string(),
            category: "General".to_string(),
            deadline: None,
            source_app: None,
            completed: false,
        }
    }

    fn ids(tasks: &[Task]) -> Vec<String> {
        tasks.iter().map(|t| t.id.clone()).collect()
    }

    fn quarantined_files(path: &Path) -> Vec<PathBuf> {
        fs::read_dir(path.parent().unwrap())
            .unwrap()
            .map(|e| e.unwrap().path())
            .filter(|p| p.to_string_lossy().contains(".corrupt-"))
            .collect()
    }

    #[test]
    fn missing_file_loads_as_empty() {
        let path = temp_db("missing");
        assert!(get_tasks_at(&path).unwrap().is_empty());
    }

    #[test]
    fn save_toggle_delete_round_trip() {
        let path = temp_db("roundtrip");
        save_task_at(&path, task("a")).unwrap();
        save_task_at(&path, task("b")).unwrap();
        assert_eq!(ids(&get_tasks_at(&path).unwrap()), vec!["b", "a"]);

        assert!(toggle_task_at(&path, "a").unwrap());
        assert!(get_tasks_at(&path).unwrap()[1].completed);

        delete_task_at(&path, "b").unwrap();
        assert_eq!(ids(&get_tasks_at(&path).unwrap()), vec!["a"]);
        assert!(!sibling(&path, ".tmp").exists());
    }

    #[test]
    fn toggling_unknown_task_is_an_error() {
        let path = temp_db("toggle-unknown");
        save_task_at(&path, task("a")).unwrap();
        assert!(toggle_task_at(&path, "nope").is_err());
    }

    #[test]
    fn legacy_records_get_defaults() {
        let path = temp_db("legacy");
        fs::write(
            &path,
            r#"[{"id":"x","content":"c","original_text":null,"timestamp":"t","deadline":null,"source_app":null}]"#,
        )
        .unwrap();
        let tasks = get_tasks_at(&path).unwrap();
        assert_eq!(tasks[0].priority, "Medium");
        assert_eq!(tasks[0].category, "General");
        assert!(!tasks[0].completed);
    }

    #[test]
    fn corrupt_file_is_preserved_not_overwritten() {
        let path = temp_db("corrupt");
        fs::write(&path, "{ this is not json").unwrap();

        // A capture arriving after corruption still saves...
        save_task_at(&path, task("new")).unwrap();
        assert_eq!(ids(&get_tasks_at(&path).unwrap()), vec!["new"]);

        // ...and the unreadable original survives byte-for-byte.
        let moved = quarantined_files(&path);
        assert_eq!(moved.len(), 1);
        assert_eq!(fs::read_to_string(&moved[0]).unwrap(), "{ this is not json");
    }

    #[test]
    fn corrupt_file_without_backup_is_reported_once() {
        let path = temp_db("corrupt-report");
        fs::write(&path, "garbage").unwrap();
        let err = get_tasks_at(&path).unwrap_err();
        assert!(err.contains("preserved"));
        assert!(get_tasks_at(&path).unwrap().is_empty());
    }

    #[test]
    fn corrupt_file_is_restored_from_backup() {
        let path = temp_db("restore");
        save_task_at(&path, task("a")).unwrap();
        save_task_at(&path, task("b")).unwrap(); // backup now holds [a]
        fs::write(&path, "garbage").unwrap();

        assert_eq!(ids(&get_tasks_at(&path).unwrap()), vec!["a"]);
        assert_eq!(quarantined_files(&path).len(), 1);
    }

    #[test]
    fn concurrent_saves_lose_nothing() {
        let path = temp_db("concurrent");
        let handles: Vec<_> = (0..8)
            .map(|i| {
                let path = path.clone();
                std::thread::spawn(move || save_task_at(&path, task(&i.to_string())).unwrap())
            })
            .collect();
        for h in handles {
            h.join().unwrap();
        }
        assert_eq!(get_tasks_at(&path).unwrap().len(), 8);
    }

    #[test]
    fn patch_updates_fields_with_canonical_values() {
        let path = temp_db("patch");
        save_task_at(&path, task("a")).unwrap();
        let patch = TaskPatch {
            content: Some("  New title ".to_string()),
            priority: Some("high".to_string()),
            category: Some("finance".to_string()),
            deadline: Some(Some("2026-12-01T17:00:00+05:30".to_string())),
            original_text: None,
        };
        let updated = update_task_at(&path, "a", &patch).unwrap();
        assert_eq!(updated.content, "New title");
        assert_eq!(updated.priority, "High");
        assert_eq!(updated.category, "Finance");
        assert_eq!(updated.deadline.as_deref(), Some("2026-12-01T17:00:00+05:30"));
        // Creation time is never touched by an update.
        assert_eq!(updated.timestamp, "2026-01-01T00:00:00Z");
        assert_eq!(get_tasks_at(&path).unwrap()[0].content, "New title");
    }

    #[test]
    fn invalid_patch_changes_nothing() {
        let path = temp_db("patch-invalid");
        save_task_at(&path, task("a")).unwrap();
        let bad = TaskPatch {
            content: Some("Changed".to_string()),
            priority: Some("Extreme".to_string()),
            ..Default::default()
        };
        assert!(update_task_at(&path, "a", &bad).is_err());
        let bad_deadline = TaskPatch {
            deadline: Some(Some("Today at 5:00 PM".to_string())),
            ..Default::default()
        };
        assert!(update_task_at(&path, "a", &bad_deadline).is_err());
        assert_eq!(get_tasks_at(&path).unwrap()[0].content, "task a");
        assert!(update_task_at(&path, "missing", &TaskPatch::default()).is_err());
    }

    #[test]
    fn patch_clears_deadline_and_keeps_legacy_category() {
        let path = temp_db("patch-clear");
        let mut legacy = task("a");
        legacy.category = "Engineering".to_string();
        legacy.deadline = Some("2026-12-01T17:00:00+00:00".to_string());
        save_task_at(&path, legacy).unwrap();

        let patch = TaskPatch {
            category: Some("Engineering".to_string()),
            deadline: Some(None),
            ..Default::default()
        };
        let updated = update_task_at(&path, "a", &patch).unwrap();
        assert_eq!(updated.category, "Engineering");
        assert_eq!(updated.deadline, None);
    }

    #[test]
    fn patch_json_distinguishes_null_from_missing() {
        let p: TaskPatch = serde_json::from_str(r#"{"deadline": null}"#).unwrap();
        assert_eq!(p.deadline, Some(None));
        assert_eq!(p.original_text, None);

        let p: TaskPatch = serde_json::from_str(r#"{"deadline": "2026-01-01T00:00:00Z"}"#).unwrap();
        assert_eq!(p.deadline, Some(Some("2026-01-01T00:00:00Z".to_string())));
    }

    #[test]
    fn normalizers() {
        assert_eq!(normalize_priority(" URGENT ").as_deref(), Some("Urgent"));
        assert_eq!(normalize_priority("p1"), None);
        assert_eq!(normalize_category("security").as_deref(), Some("Security"));
        assert_eq!(normalize_category("Work"), None);
        assert!(normalize_deadline("tomorrow").is_err());
        assert_eq!(
            normalize_deadline("2026-01-01T00:00:00Z").unwrap(),
            "2026-01-01T00:00:00+00:00"
        );
        assert!(normalize_content("   ").is_err());
    }
}
