use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct AppSettings {
    #[serde(rename = "googleBooksApiKey")]
    pub google_books_api_key: Option<String>,
}

const STORE_PATH: &str = ".settings.json";
const SETTINGS_KEY: &str = "settings";

pub fn load_settings(app: &AppHandle) -> Result<AppSettings, String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;

    // get returns Option<&serde_json::Value>; clone the inner Value
    let value = store
        .get(SETTINGS_KEY)
        .map(|v| v.clone())
        .unwrap_or_else(|| json!({}));

    serde_json::from_value(value).map_err(|e| e.to_string())
}

pub fn save_settings(app: &AppHandle, next: &AppSettings) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let value = serde_json::to_value(next).map_err(|e| e.to_string())?;
    store.set(SETTINGS_KEY, value);
    store.save().map_err(|e| e.to_string())
}
