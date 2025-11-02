mod db;
mod google_books;
mod migrations;
mod settings;

use tauri::Emitter;
use tauri::Manager;
use tauri::State;
use tauri_plugin_sql::DbInstances;

use crate::google_books::client::GoogleBooksClient;

pub struct AppConfig {
    pub client: GoogleBooksClient,
}

impl AppConfig {
    pub async fn from_env() -> Result<Self, String> {
        Ok(AppConfig {
            client: GoogleBooksClient::new(),
        })
    }
}

#[tauri::command]
fn get_settings(app_handle: tauri::AppHandle) -> Result<crate::settings::AppSettings, String> {
    crate::settings::load_settings(&app_handle)
}

#[tauri::command]
fn set_settings(
    app_handle: tauri::AppHandle,
    next: crate::settings::AppSettings,
) -> Result<(), String> {
    crate::settings::save_settings(&app_handle, &next)
}

#[tauri::command]
async fn fetch_isbn(
    isbn: String,
    config: State<'_, AppConfig>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let instances = app_handle.state::<DbInstances>();
    let guard = instances.0.read().await;
    let pool = guard.get("sqlite:books.db").ok_or("Database not found")?;
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;

    // Load settings on demand from the store
    let settings = crate::settings::load_settings(&app_handle)?;
    let api_key = settings
        .google_books_api_key
        .as_deref()
        .ok_or_else(|| "Google Books API key not configured".to_string())?;

    match config
        .client
        .fetch_and_store_by_isbn(sqlite_pool, &isbn, &app_handle, api_key)
        .await
    {
        Ok(Some(volume_id)) => {
            let _ = app_handle.emit("book-added", &volume_id);
            Ok(volume_id)
        }
        Ok(None) => Err(format!("No results found for ISBN: {isbn}")),
        Err(e) => Err(format!("Failed to import book: {e}")),
    }
}

#[tauri::command]
async fn get_all_books(
    app_handle: tauri::AppHandle,
) -> Result<Vec<crate::db::BookWithThumbnail>, String> {
    let instances = app_handle.state::<DbInstances>();
    let guard = instances.0.read().await;

    let pool = guard.get("sqlite:books.db").ok_or("Database not found")?;

    crate::db::fetch_all_books(&pool, &app_handle)
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![crate::migrations::MIGRATION001];

    let config =
        tauri::async_runtime::block_on(AppConfig::from_env()).expect("Failed to load config");

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:books.db", migrations)
                .build(),
        )
        .manage(config)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            fetch_isbn,
            get_all_books,
            get_settings,
            set_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
