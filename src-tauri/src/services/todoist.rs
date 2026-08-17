use log::{error, info};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde_json::json;
use std::time::Duration;
use crate::models::Task;

pub struct TodoistService;

impl TodoistService {
    /// Dispatches an extracted task to the user's Todoist account
    pub async fn sync_task(api_key: &str, task: &Task) -> Result<String, String> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|e| format!("HTTP client error: {}", e))?;

        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", api_key.trim()))
                .map_err(|e| format!("Invalid Todoist API key format: {}", e))?,
        );

        // Map TaskCatch priority (low, medium, high, urgent) to Todoist (1=normal, 2=medium, 3=high, 4=urgent)
        let todoist_priority = match task.priority.to_lowercase().as_str() {
            "urgent" => 4,
            "high" => 3,
            "medium" => 2,
            "low" => 1,
            _ => 2,
        };

        let mut description = "⚡ Captured via TaskCatch".to_string();
        if let Some(ref raw) = task.raw_source_text {
            description = format!("⚡ Captured via TaskCatch\n\nSource Text:\n> {}", raw.replace('\n', "\n> "));
        }

        let mut payload = json!({
            "content": task.title,
            "description": description,
            "priority": todoist_priority,
        });

        if let Some(ref deadline) = task.deadline {
            if !deadline.is_empty() {
                payload["due_string"] = json!(deadline);
            }
        }

        // Add category label if non-general
        if !task.category.is_empty() && task.category != "General" {
            payload["labels"] = json!([task.category]);
        }

        info!("Syncing task '{}' to Todoist...", task.title);
        let resp = client
            .post("https://api.todoist.com/rest/v2/tasks")
            .headers(headers)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Todoist network error: {}", e))?;

        let status = resp.status();
        let body = resp.text().await.map_err(|e| format!("Failed to read Todoist response: {}", e))?;

        if status.is_success() {
            info!("Successfully synced task to Todoist");
            Ok(body)
        } else {
            error!("Todoist API error ({}): {}", status, body);
            Err(format!("Todoist returned status {}: {}", status, body))
        }
    }

    /// Tests whether the provided Todoist API token is valid
    pub async fn test_connection(api_key: &str) -> Result<bool, String> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|e| format!("HTTP client error: {}", e))?;

        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", api_key.trim()))
                .map_err(|e| format!("Invalid Todoist API key format: {}", e))?,
        );

        let resp = client
            .get("https://api.todoist.com/rest/v2/projects")
            .headers(headers)
            .send()
            .await
            .map_err(|e| format!("Todoist connection error: {}", e))?;

        if resp.status().is_success() {
            Ok(true)
        } else {
            Err(format!("Todoist authentication failed (status: {})", resp.status()))
        }
    }
}
