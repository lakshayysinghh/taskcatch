use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParsedTaskResult {
    pub title: String,
    pub priority: String,
    pub category: String,
}

#[derive(Serialize)]
struct GroqMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct GroqRequest {
    model: String,
    messages: Vec<GroqMessage>,
    temperature: f32,
    response_format: Option<ResponseFormat>,
}

#[derive(Serialize)]
struct ResponseFormat {
    #[serde(rename = "type")]
    format_type: String,
}

#[derive(Deserialize)]
struct GroqResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: Message,
}

#[derive(Deserialize)]
struct Message {
    content: String,
}

/// Fallback local heuristic parser when offline or when API fails
pub fn fallback_heuristic_parse(text: &str) -> ParsedTaskResult {
    let lower = text.to_lowercase();

    // Priority Heuristics
    let priority = if lower.contains("urgent") || lower.contains("asap") || lower.contains("critical") || lower.contains("!") {
        "Urgent".to_string()
    } else if lower.contains("high") || lower.contains("important") || lower.contains("p1") {
        "High".to_string()
    } else if lower.contains("low") || lower.contains("someday") || lower.contains("p3") {
        "Low".to_string()
    } else {
        "Medium".to_string()
    };

    // Category Heuristics
    let category = if lower.contains("#dev") || lower.contains("bug") || lower.contains("fix") || lower.contains("deploy") || lower.contains("code") {
        "Development".to_string()
    } else if lower.contains("#finance") || lower.contains("invoice") || lower.contains("budget") || lower.contains("tax") || lower.contains("$") {
        "Finance".to_string()
    } else if lower.contains("#security") || lower.contains("auth") || lower.contains("vault") || lower.contains("token") || lower.contains("key") {
        "Security".to_string()
    } else if lower.contains("#personal") || lower.contains("buy") || lower.contains("call") || lower.contains("home") {
        "Personal".to_string()
    } else {
        "General".to_string()
    };

    // Title: Take first clean sentence or up to 80 characters
    let first_line = text.lines().next().unwrap_or(text).trim();
    let title = if first_line.chars().count() > 85 {
        let truncated: String = first_line.chars().take(80).collect();
        format!("{}...", truncated.trim())
    } else if !first_line.is_empty() {
        first_line.to_string()
    } else {
        "Captured Action Item".to_string()
    };

    ParsedTaskResult {
        title,
        priority,
        category,
    }
}

pub async fn process_text(api_key: &str, text: &str) -> ParsedTaskResult {
    if api_key.trim().is_empty() {
        return fallback_heuristic_parse(text);
    }

    let client = match Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
    {
        Ok(c) => c,
        Err(_) => return fallback_heuristic_parse(text),
    };

    let system_prompt = "You are an AI task extraction engine. Given messy highlight text, extract a clean actionable task.\n\
        You must respond in valid JSON format with three fields:\n\
        - \"title\": A concise, professional action item summary (max 12 words)\n\
        - \"priority\": Exactly one of \"Urgent\", \"High\", \"Medium\", or \"Low\"\n\
        - \"category\": Exactly one of \"Development\", \"Finance\", \"Security\", \"Personal\", or \"General\"";

    let user_prompt = format!("Extract task from this text:\n\"\"\"\n{}\n\"\"\"", text);

    let request_body = GroqRequest {
        model: "llama3-8b-8192".to_string(),
        messages: vec![
            GroqMessage {
                role: "system".to_string(),
                content: system_prompt.to_string(),
            },
            GroqMessage {
                role: "user".to_string(),
                content: user_prompt,
            },
        ],
        temperature: 0.2,
        response_format: Some(ResponseFormat {
            format_type: "json_object".to_string(),
        }),
    };

    let response = match client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
    {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Groq network request failed, falling back to heuristic: {}", e);
            return fallback_heuristic_parse(text);
        }
    };

    if !response.status().is_success() {
        eprintln!("Groq API non-success status: {}", response.status());
        return fallback_heuristic_parse(text);
    }

    let groq_res: GroqResponse = match response.json().await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Failed to deserialize Groq response: {}", e);
            return fallback_heuristic_parse(text);
        }
    };

    if let Some(choice) = groq_res.choices.first() {
        let content = choice.message.content.trim();
        if let Ok(parsed) = serde_json::from_str::<ParsedTaskResult>(content) {
            return parsed;
        }
    }

    fallback_heuristic_parse(text)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMutation {
    pub task_id: String,
    pub action: String, // "update"
    pub update_priority: Option<String>,
    pub update_timestamp: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatResponseData {
    pub reply: String,
    pub mutations: Vec<ChatMutation>,
}

pub async fn process_chat(api_key: &str, tasks_json: &str, prompt: &str) -> Result<ChatResponseData, String> {
    if api_key.trim().is_empty() {
        return Err("Groq API key is not configured. Please set it in Settings.".to_string());
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let system_prompt = "You are the Morning Standup Bot, an executive AI assistant managing the user's tasks.
You are provided with the current tasks in JSON format.
The user will chat with you. Answer their questions based on the tasks.
If they ask you to push a task, reschedule it, or change priority, generate a mutation block for it.
IMPORTANT: You MUST respond in valid JSON format with EXACTLY two fields:
- `reply`: Your conversational response to the user in Markdown format. Keep it concise, executive, and helpful. If listing tasks, make it highly readable.
- `mutations`: An array of objects for tasks to update. Each object MUST have:
  - `task_id`: The ID of the task to update.
  - `action`: `update`
  - `update_priority`: (optional) The new priority (`Urgent`, `High`, `Medium`, `Low`)
  - `update_timestamp`: (optional) The new ISO timestamp (e.g. pushed by 24 hours, or to 9pm today). Today's date context: use the provided context to calculate the new timestamp.

Example JSON output:
{
  \"reply\": \"I have pushed the hotfix task to tomorrow.\",
  \"mutations\": [
    { \"task_id\": \"sample-1\", \"action\": \"update\", \"update_timestamp\": \"2026-08-21T00:00:00.000Z\" }
  ]
}";

    let context_prompt = format!("Current Tasks Context:\n{}\n\nUser Prompt: {}", tasks_json, prompt);

    let request_body = GroqRequest {
        model: "llama-3.3-70b-versatile".to_string(), // Use the larger model for better JSON adherence
        messages: vec![
            GroqMessage {
                role: "system".to_string(),
                content: system_prompt.to_string(),
            },
            GroqMessage {
                role: "user".to_string(),
                content: context_prompt,
            },
        ],
        temperature: 0.1,
        response_format: Some(ResponseFormat {
            format_type: "json_object".to_string(),
        }),
    };

    let response = client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("API Error: {}", response.status()));
    }

    let groq_res: GroqResponse = response.json().await.map_err(|e| e.to_string())?;

    if let Some(choice) = groq_res.choices.first() {
        let content = choice.message.content.trim();
        if let Ok(parsed) = serde_json::from_str::<ChatResponseData>(content) {
            return Ok(parsed);
        } else {
            return Err("Failed to parse JSON schema from LLM.".to_string());
        }
    }

    Err("No response from LLM.".to_string())
}
