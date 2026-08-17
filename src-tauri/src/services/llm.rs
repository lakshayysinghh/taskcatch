use chrono::Utc;
use log::{debug, error, info, warn};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde_json::{json, Value};
use std::time::Duration;
use crate::models::{AppSettings, ExtractedTask};

pub struct LlmService;

impl LlmService {
    /// Extracts structured task from raw text using Groq or OpenAI
    pub async fn extract_task(
        raw_text: &str,
        settings: &AppSettings,
    ) -> Result<ExtractedTask, String> {
        let trimmed_text = raw_text.trim();
        if trimmed_text.is_empty() {
            return Err("Input text is empty".to_string());
        }

        let current_time_iso = Utc::now().to_rfc3339();
        let prompt_system = Self::build_system_prompt(&current_time_iso, settings.custom_instructions.as_deref());

        // 1. Try Groq if key is available
        if let Some(ref groq_key) = settings.groq_api_key {
            if !groq_key.trim().is_empty() {
                info!("Attempting extraction via Groq (model: {})...", settings.groq_model);
                match Self::call_chat_completion(
                    "https://api.groq.com/openai/v1/chat/completions",
                    groq_key,
                    &settings.groq_model,
                    &prompt_system,
                    trimmed_text,
                    true,
                ).await {
                    Ok(response_text) => {
                        debug!("Groq raw response: {}", response_text);
                        match Self::parse_extracted_task(&response_text, trimmed_text) {
                            Ok(task) => return Ok(task),
                            Err(e) => warn!("Failed to parse Groq response JSON: {}. Trying fallback...", e),
                        }
                    }
                    Err(e) => {
                        warn!("Groq API call failed: {}. Checking for fallback...", e);
                    }
                }
            }
        }

        // 2. Try OpenAI fallback if key is available
        if let Some(ref openai_key) = settings.openai_api_key {
            if !openai_key.trim().is_empty() {
                info!("Attempting extraction via OpenAI (model: {})...", settings.openai_model);
                match Self::call_chat_completion(
                    "https://api.openai.com/v1/chat/completions",
                    openai_key,
                    &settings.openai_model,
                    &prompt_system,
                    trimmed_text,
                    true,
                ).await {
                    Ok(response_text) => {
                        debug!("OpenAI raw response: {}", response_text);
                        return Self::parse_extracted_task(&response_text, trimmed_text);
                    }
                    Err(e) => {
                        error!("OpenAI API call failed: {}", e);
                        return Err(format!("OpenAI extraction failed: {}", e));
                    }
                }
            }
        }

        // 3. If no API key configured or all failed
        if settings.groq_api_key.is_none() && settings.openai_api_key.is_none() {
            Err("No API Key configured. Please add your Groq or OpenAI API Key in Settings.".to_string())
        } else {
            Err("Failed to extract task with configured AI providers. Please check your API key and connection.".to_string())
        }
    }

    fn build_system_prompt(current_timestamp_iso: &str, custom_instructions: Option<&str>) -> String {
        let mut prompt = format!(
            "You are a high-speed, deterministic Task Extraction Engine.\n\
            Analyze the user's input text and extract actionable tasks.\n\
            Current Timestamp: {}\n\n\
            Rules:\n\
            1. Extract a clear, imperative action item as 'task_title' (e.g., 'Submit Q3 budget report', 'Call John regarding contract').\n\
            2. Calculate deadlines strictly relative to the current timestamp. Output ISO-8601 string (e.g., '2026-08-20T17:00:00Z') or null if none mentioned.\n\
            3. Infer priority (must be one of: 'low', 'medium', 'high', 'urgent').\n\
            4. Extract single-word category (e.g., 'Work', 'Personal', 'Finance', 'Health', 'Development', 'General').\n\n\
            Return ONLY valid JSON matching this schema:\n\
            {{\n  \
              \"task_title\": \"string\",\n  \
              \"deadline\": \"YYYY-MM-DDTHH:MM:SSZ\" | null,\n  \
              \"priority\": \"low\" | \"medium\" | \"high\" | \"urgent\",\n  \
              \"category\": \"string\"\n\
            }}",
            current_timestamp_iso
        );

        if let Some(extra) = custom_instructions {
            if !extra.trim().is_empty() {
                prompt.push_str(&format!("\n\nAdditional User Guidance:\n{}", extra.trim()));
            }
        }

        prompt
    }

    async fn call_chat_completion(
        endpoint: &str,
        api_key: &str,
        model: &str,
        system_prompt: &str,
        user_content: &str,
        json_mode: bool,
    ) -> Result<String, String> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(20))
            .build()
            .map_err(|e| format!("HTTP client error: {}", e))?;

        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", api_key.trim()))
                .map_err(|e| format!("Invalid API key header: {}", e))?,
        );

        let mut payload = json!({
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_content
                }
            ],
            "temperature": 0.1,
            "max_tokens": 1000
        });

        if json_mode {
            payload["response_format"] = json!({ "type": "json_object" });
        }

        let resp = client
            .post(endpoint)
            .headers(headers)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Network request failed: {}", e))?;

        let status = resp.status();
        let body = resp.text().await.map_err(|e| format!("Failed to read response body: {}", e))?;

        if !status.is_success() {
            return Err(format!("API returned status {}: {}", status, body));
        }

        let json_val: Value = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse JSON response envelope: {}. Body: {}", e, body))?;

        if let Some(content) = json_val["choices"][0]["message"]["content"].as_str() {
            Ok(content.to_string())
        } else {
            Err(format!("Malformed API response: no choices.message.content found in: {}", body))
        }
    }

    /// Resilient JSON deserialization into ExtractedTask
    pub fn parse_extracted_task(raw_response: &str, fallback_raw_text: &str) -> Result<ExtractedTask, String> {
        let cleaned = Self::clean_json_string(raw_response);

        // Try direct deserialization
        if let Ok(task) = serde_json::from_str::<ExtractedTask>(&cleaned) {
            return Ok(Self::sanitize_extracted_task(task, fallback_raw_text));
        }

        // Try loose JSON parsing via Value
        if let Ok(v) = serde_json::from_str::<Value>(&cleaned) {
            let title = v["task_title"].as_str()
                .or_else(|| v["title"].as_str())
                .unwrap_or("")
                .trim()
                .to_string();

            let deadline = v["deadline"].as_str()
                .filter(|s| !s.is_empty() && *s != "null")
                .map(|s| s.to_string());

            let priority = v["priority"].as_str()
                .unwrap_or("medium")
                .to_lowercase();

            let category = v["category"].as_str()
                .unwrap_or("General")
                .trim()
                .to_string();

            let task = ExtractedTask {
                task_title: if title.is_empty() { Self::fallback_title(fallback_raw_text) } else { title },
                deadline,
                priority: if ["low", "medium", "high", "urgent"].contains(&priority.as_str()) { priority } else { "medium".to_string() },
                category: if category.is_empty() { "General".to_string() } else { category },
            };
            return Ok(task);
        }

        // Substring extract between first { and last }
        if let Some(start) = raw_response.find('{') {
            if let Some(end) = raw_response.rfind('}') {
                if end > start {
                    let sub = &raw_response[start..=end];
                    if let Ok(task) = serde_json::from_str::<ExtractedTask>(sub) {
                        return Ok(Self::sanitize_extracted_task(task, fallback_raw_text));
                    }
                }
            }
        }

        // Ultimate fallback if LLM gave non-JSON text
        warn!("LLM output could not be parsed as JSON. Using heuristic fallback.");
        Ok(ExtractedTask {
            task_title: Self::fallback_title(fallback_raw_text),
            deadline: None,
            priority: "medium".to_string(),
            category: "General".to_string(),
        })
    }

    fn clean_json_string(s: &str) -> String {
        let mut trimmed = s.trim();
        if trimmed.starts_with("```json") {
            trimmed = &trimmed[7..];
        } else if trimmed.starts_with("```") {
            trimmed = &trimmed[3..];
        }
        if trimmed.ends_with("```") {
            trimmed = &trimmed[..trimmed.len() - 3];
        }
        trimmed.trim().to_string()
    }

    fn sanitize_extracted_task(mut task: ExtractedTask, raw_text: &str) -> ExtractedTask {
        if task.task_title.trim().is_empty() {
            task.task_title = Self::fallback_title(raw_text);
        }
        let p = task.priority.to_lowercase();
        task.priority = match p.as_str() {
            "urgent" => "urgent".to_string(),
            "high" => "high".to_string(),
            "low" => "low".to_string(),
            _ => "medium".to_string(),
        };
        if task.category.trim().is_empty() {
            task.category = "General".to_string();
        }
        task
    }

    fn fallback_title(raw: &str) -> String {
        let first_line = raw.lines().next().unwrap_or("New Task").trim();
        if first_line.chars().count() > 80 {
            let truncated: String = first_line.chars().take(77).collect();
            format!("{}...", truncated)
        } else if first_line.is_empty() {
            "New Task".to_string()
        } else {
            first_line.to_string()
        }
    }

    pub async fn test_connection(provider: &str, api_key: &str, model: &str) -> Result<String, String> {
        let endpoint = if provider == "groq" {
            "https://api.groq.com/openai/v1/chat/completions"
        } else {
            "https://api.openai.com/v1/chat/completions"
        };

        Self::call_chat_completion(
            endpoint,
            api_key,
            model,
            "You are a connection test agent. Reply with valid JSON: {\"status\": \"ok\", \"message\": \"Connection successful!\"}",
            "Test connection",
            true,
        ).await
    }
}
