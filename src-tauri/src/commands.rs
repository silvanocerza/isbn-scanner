use tauri::Emitter;
use tauri::Manager;
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_sql::DbInstances;

use crate::db::find_books_containing_title;
use crate::db::get_book;
use crate::db::Book;
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
            let book = get_book(pool, &volume_id).await.unwrap();
            let books = find_books_containing_title(pool, book.title.as_str())
                .await
                .unwrap();

            // If we find other books with the same or similar title to the one we just
            // added it's very likely that it's a comic book series that uses ISBNs.
            //
            // Google Books recognizes those comics, though they all have the same title
            // and they don't include the number of the single comic.
            //
            // So we must let the user insert it manually. Unlike ISINs we can't try
            // to infer the number from the last digits of the code, so we can't even
            // suggest a possible number to the user.
            //
            // If there's only a book it's the one that we just added.
            if books.len() > 1 {
                let _ = app_handle.emit("possible-comic-found", &book);
            } else {
                let _ = app_handle.emit("book-added", &volume_id);
            }

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
    number: Option<i64>,
    authors: Option<Vec<String>>,
    publisher: Option<String>,
    year: Option<String>,
    identifier: Option<String>,
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
        number,
        &authors.unwrap_or_default(),
        publisher.as_deref(),
        year.as_deref(),
        identifier.as_deref(),
    )
    .await
    .map_err(|e| e.to_string())?;

    let _ = app_handle.emit("book-added", &vol_id);

    Ok(vol_id)
}

#[tauri::command]
pub async fn isbn_exists(isbn: String, app_handle: tauri::AppHandle) -> Result<bool, String> {
    let instances = app_handle.state::<DbInstances>();
    let guard = instances.0.read().await;
    let pool = guard.get("sqlite:books.db").ok_or("Database not found")?;

    let exists = crate::db::isbn_exists(pool, &isbn)
        .await
        .map_err(|e| e.to_string())?;
    Ok(exists)
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

#[tauri::command]
pub async fn set_book_number(
    volume_id: &str,
    number: i64,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let instances = app_handle.state::<DbInstances>();
    let guard = instances.0.read().await;
    let pool = guard.get("sqlite:books.db").ok_or("Database not found")?;
    crate::db::set_book_number(pool, volume_id, number)
        .await
        .map_err(|e| e.to_string())?;
    let _ = app_handle.emit("book-updated", &"ok");
    Ok(())
}

#[tauri::command]
pub async fn export_books_csv(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = app_handle
        .dialog()
        .file()
        .add_filter("CSV", &["csv"])
        .set_file_name("books.csv")
        .blocking_save_file();

    let Some(save_path) = path else {
        return Err("Export cancelled".to_string());
    };

    let path_buf = match save_path {
        tauri_plugin_dialog::FilePath::Path(p) => p,
        tauri_plugin_dialog::FilePath::Url(u) => {
            return Err(format!("URL paths not supported: {}", u));
        }
    };

    let instances = app_handle.state::<DbInstances>();
    let guard = instances.0.read().await;
    let pool = guard.get("sqlite:books.db").ok_or("Database not found")?;

    crate::db::export_books_to_csv(pool, &path_buf)
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!("Books exported to {}", path_buf.display()))
}

#[tauri::command]
pub async fn find_comic_by_ean(
    ean: String,
    app_handle: tauri::AppHandle,
) -> Result<Option<Book>, String> {
    let instances = app_handle.state::<DbInstances>();
    let guard = instances.0.read().await;
    let pool = guard.get("sqlite:books.db").ok_or("Database not found")?;
    let book = crate::db::find_comic_by_ean(pool, &ean)
        .await
        .map_err(|e| e.to_string())?;
    Ok(book)
}

#[tauri::command]
pub async fn clone_book(volume_id: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    let instances = app_handle.state::<DbInstances>();
    let guard = instances.0.read().await;
    let pool = guard.get("sqlite:books.db").ok_or("Database not found")?;
    let new_volume_id = crate::db::clone_book(pool, &volume_id)
        .await
        .map_err(|e| e.to_string())?;
    Ok(new_volume_id)
}
