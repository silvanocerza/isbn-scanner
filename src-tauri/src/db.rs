use serde::Serialize;
use sqlx::FromRow;
use tauri::Manager;

#[derive(Debug, Serialize, FromRow)]
pub struct Book {
    pub volume_id: String,
    pub title: String,
    pub publisher: Option<String>,
    pub published_date: Option<String>,
    pub description: Option<String>,
    pub page_count: Option<i64>,
    pub print_type: Option<String>,
    pub maturity_rating: Option<String>,
    pub language: Option<String>,
    pub preview_link: Option<String>,
    pub info_link: Option<String>,
    pub canonical_link: Option<String>,
    pub small_thumbnail: Option<String>,
    pub thumbnail: Option<String>,
    pub country: Option<String>,
    pub saleability: Option<String>,
    pub is_ebook: Option<i64>,
    pub viewability: Option<String>,
    pub embeddable: Option<i64>,
    pub public_domain: Option<i64>,
    pub text_to_speech_permission: Option<String>,
    pub epub_available: Option<i64>,
    pub pdf_available: Option<i64>,
    pub web_reader_link: Option<String>,
    pub access_view_status: Option<String>,
    pub quote_sharing_allowed: Option<i64>,
}
#[derive(Debug, Serialize, FromRow)]
pub struct Author {
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct BookWithThumbnail {
    pub book: Book,
    pub authors: Vec<Author>,
    pub thumbnail_path: String,
}

pub async fn fetch_all_books(
    pool: &tauri_plugin_sql::DbPool,
    app_handle: &tauri::AppHandle,
) -> anyhow::Result<Vec<BookWithThumbnail>> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let books = sqlx::query_as::<_, Book>(
        r#"
        SELECT
            volume_id, title, publisher, published_date, description,
            page_count, print_type, maturity_rating, language,
            preview_link, info_link, canonical_link, small_thumbnail,
            thumbnail, country, saleability, is_ebook, viewability,
            embeddable, public_domain, text_to_speech_permission,
            epub_available, pdf_available, web_reader_link,
            access_view_status, quote_sharing_allowed
        FROM books
        "#,
    )
    .fetch_all(sqlite_pool)
    .await?;

    let app_data_dir = app_handle.path().app_data_dir()?;
    let books_dir = app_data_dir.join("books");

    let mut result = Vec::new();
    for book in books {
        let authors = sqlx::query_as::<_, Author>(
            r#"
            SELECT a.name
            FROM authors a
            JOIN book_authors ba ON a.author_id = ba.author_id
            WHERE ba.volume_id = ?
            ORDER BY ba.position
            "#,
        )
        .bind(&book.volume_id)
        .fetch_all(sqlite_pool)
        .await?;

        let thumbnail_path = books_dir.join(format!("{}.jpg", book.volume_id));
        result.push(BookWithThumbnail {
            book,
            authors,
            thumbnail_path: thumbnail_path.to_string_lossy().to_string(),
        });
    }

    Ok(result)
}
