mod db;
mod google_books;
mod migrations;

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
        let api_key = std::env::var("GOOGLE_BOOKS_API_KEY")
            .map_err(|_| "GOOGLE_BOOKS_API_KEY not set".to_string())?;
        Ok(AppConfig {
            client: GoogleBooksClient::new(&api_key),
        })
    }
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

    match config
        .client
        .fetch_and_store_by_isbn(sqlite_pool, &isbn, &app_handle)
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
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:books.db", migrations)
                .build(),
        )
        .manage(config)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![fetch_isbn, get_all_books])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
