use tauri::Emitter;
use tauri::Manager;
use tauri::State;
use tauri_plugin_sql::DbInstances;

use crate::AppConfig;

#[tauri::command]
pub fn get_settings(app_handle: tauri::AppHandle) -> Result<crate::settings::AppSettings, String> {
    crate::settings::load_settings(&app_handle)
}

#[tauri::command]
pub fn set_settings(
    app_handle: tauri::AppHandle,
    next: crate::settings::AppSettings,
) -> Result<(), String> {
    crate::settings::save_settings(&app_handle, &next)
}

#[tauri::command]
pub async fn fetch_isbn(
    isbn: String,
    config: State<'_, AppConfig>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let instances = app_handle.state::<DbInstances>();
    let guard = instances.0.read().await;
    let pool = guard.get("sqlite:books.db").ok_or("Database not found")?;

    // Load settings on demand from the store
    let settings = crate::settings::load_settings(&app_handle)?;
    let api_key = settings
        .google_books_api_key
        .as_deref()
        .ok_or_else(|| "Google Books API key not configured".to_string())?;

    match config
        .client
        .fetch_and_store_by_isbn(pool, &isbn, &app_handle, api_key)
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
pub async fn get_all_books(
    app_handle: tauri::AppHandle,
) -> Result<Vec<crate::db::BookWithThumbnail>, String> {
    let instances = app_handle.state::<DbInstances>();
    let guard = instances.0.read().await;

    let pool = guard.get("sqlite:books.db").ok_or("Database not found")?;

    crate::db::fetch_all_books(&pool, &app_handle)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_book(
    title: String,
    authors: Option<Vec<String>>,
    publisher: Option<String>,
    year: Option<String>,
    isbn: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let instances = app_handle.state::<DbInstances>();
    let guard = instances.0.read().await;
    let pool = guard
        .get("sqlite:books.db")
        .ok_or("Database not found")
        .map_err(|e| e.to_string())?;

    let vol_id = crate::db::insert_book(
        pool,
        &title,
        &authors.unwrap_or_default(),
        publisher.as_deref(),
        year.as_deref(),
        isbn.as_deref(),
    )
    .await
    .map_err(|e| e.to_string())?;

    let _ = app_handle.emit("book-added", &vol_id);

    Ok(vol_id)
}

#[tauri::command]
pub async fn update_book(
    payload: crate::db::UpdateBookPayload,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let instances = app_handle.state::<DbInstances>();
    let guard = instances.0.read().await;
    let pool = guard.get("sqlite:books.db").ok_or("Database not found")?;
    crate::db::update_book(pool, payload)
        .await
        .map_err(|e| e.to_string())?;
    let _ = app_handle.emit("book-updated", &"ok");
    Ok(())
}
