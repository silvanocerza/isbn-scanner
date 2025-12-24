mod commands;
mod db;
mod google_books;
mod migrations;
mod settings;
mod utils;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        crate::migrations::MIGRATION001,
        crate::migrations::MIGRATION002,
        crate::migrations::MIGRATION003,
        crate::migrations::MIGRATION004,
        crate::migrations::MIGRATION005,
    ];

    let config =
        tauri::async_runtime::block_on(AppConfig::from_env()).expect("Failed to load config");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
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
            crate::commands::fetch_isbn,
            crate::commands::get_all_books,
            crate::commands::isbn_exists,
            crate::commands::get_settings,
            crate::commands::set_settings,
            crate::commands::add_book,
            crate::commands::update_book,
            crate::commands::set_book_number,
            crate::commands::export_books_csv,
            crate::commands::find_comic_by_ean,
            crate::commands::clone_book,
            crate::commands::get_all_groups,
            crate::commands::get_all_custom_fields,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
