mod google_books;
mod migrations;

use sqlx::SqlitePool;
use tauri::State;

use crate::google_books::client::GoogleBooksClient;

pub struct AppConfig {
    pub pool: SqlitePool,
    pub client: GoogleBooksClient,
}

impl AppConfig {
    pub async fn from_env() -> Result<Self, String> {
        let db_dir = std::env::var("DB_DIR").unwrap_or_else(|_| {
            let config_dir = if cfg!(target_os = "windows") {
                std::path::PathBuf::from(
                    std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string()),
                )
                .join("books")
            } else if cfg!(target_os = "macos") {
                std::path::PathBuf::from(std::env::home_dir().unwrap_or_default())
                    .join("Library/Application Support/books")
            } else {
                std::path::PathBuf::from(std::env::var("XDG_CONFIG_HOME").unwrap_or_else(|_| {
                    format!(
                        "{}/.config",
                        std::env::home_dir().unwrap_or_default().display()
                    )
                }))
                .join("books")
            };
            config_dir.to_string_lossy().to_string()
        });

        std::fs::create_dir_all(&db_dir).map_err(|e| e.to_string())?;

        let db_path = std::path::Path::new(&db_dir).join("books.db");
        let api_key = std::env::var("GOOGLE_BOOKS_API_KEY")
            .map_err(|_| "GOOGLE_BOOKS_API_KEY not set".to_string())?;

        let pool = SqlitePool::connect(&format!("sqlite://{}?mode=rwc", db_path.display()))
            .await
            .map_err(|e| e.to_string())?;

        let client = GoogleBooksClient::new(&api_key);

        Ok(AppConfig { pool, client })
    }
}

#[tauri::command]
async fn fetch_isbn(isbn: String, config: State<'_, AppConfig>) -> Result<String, String> {
    match config
        .client
        .fetch_and_store_by_isbn(&config.pool, &isbn)
        .await
    {
        Ok(Some(volume_id)) => Ok(volume_id),
        Ok(None) => Err(format!("No results found for ISBN: {isbn}")),
        Err(e) => Err(format!("Failed to import book: {e}")),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![crate::migrations::MIGRATION001];

    let config =
        tauri::async_runtime::block_on(AppConfig::from_env()).expect("Failed to load config");
    let db_name = std::env::var("DB_NAME").unwrap_or_else(|_| "books.db".to_string());

    tauri::Builder::default()
        .manage(config)
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(&format!("sqlite:{}", db_name), migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![fetch_isbn])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
