use serde::Deserialize;
use serde::Serialize;
use sqlx::FromRow;
use tauri::Manager;
use uuid::Uuid;

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

#[derive(Debug, Deserialize)]
pub struct UpdateBookPayload {
    pub volume_id: String,
    pub title: String,
    pub publisher: Option<String>,
    pub published_date: Option<String>,
    pub description: Option<String>,
    pub page_count: Option<i64>,
    pub language: Option<String>,
    pub authors: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct BookCSVRow {
    pub volume_id: String,
    pub title: String,
    pub authors: String,
    pub publisher: Option<String>,
    pub published_date: Option<String>,
    pub description: Option<String>,
    pub page_count: Option<i64>,
    pub language: Option<String>,
    pub preview_link: Option<String>,
    pub info_link: Option<String>,
    pub canonical_link: Option<String>,
    pub web_reader_link: Option<String>,
}

#[derive(sqlx::FromRow)]
struct BookRow {
    pub volume_id: String,
    pub title: String,
    pub publisher: Option<String>,
    pub published_date: Option<String>,
    pub description: Option<String>,
    pub page_count: Option<i64>,
    pub language: Option<String>,
    pub preview_link: Option<String>,
    pub info_link: Option<String>,
    pub canonical_link: Option<String>,
    pub web_reader_link: Option<String>,
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

pub async fn insert_book(
    pool: &tauri_plugin_sql::DbPool,
    title: &str,
    authors: &[String],
    publisher: Option<&str>,
    year: Option<&str>,
    isbn: Option<&str>,
) -> anyhow::Result<String> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let mut tx = sqlite_pool.begin().await?;

    // Generate a synthetic volume_id
    let volume_id = Uuid::new_v4().to_string();

    // Insert into books with minimal fields
    sqlx::query(
        r#"
        INSERT INTO books (
          volume_id, title, publisher, published_date,
          description, page_count, print_type, maturity_rating,
          language, preview_link, info_link, canonical_link,
          small_thumbnail, thumbnail, country, saleability, is_ebook,
          viewability, embeddable, public_domain, text_to_speech_permission,
          epub_available, pdf_available, web_reader_link, access_view_status, quote_sharing_allowed
        ) VALUES (
          ?, ?, ?, ?,
          NULL, NULL, NULL, NULL,
          NULL, NULL, NULL, NULL,
          NULL, NULL, NULL, NULL, NULL,
          NULL, NULL, NULL, NULL,
          NULL, NULL, NULL, NULL, NULL
        )
        "#,
    )
    .bind(&volume_id)
    .bind(title)
    .bind(publisher)
    .bind(year)
    .execute(&mut *tx)
    .await?;

    // Authors (optional)
    if !authors.is_empty() {
        sqlx::query("DELETE FROM book_authors WHERE volume_id = ?")
            .bind(&volume_id)
            .execute(&mut *tx)
            .await?;

        for (pos, name) in authors.iter().enumerate() {
            sqlx::query(r#"INSERT INTO authors (name) VALUES (?) ON CONFLICT(name) DO NOTHING"#)
                .bind(name)
                .execute(&mut *tx)
                .await?;

            sqlx::query(
                r#"
                INSERT INTO book_authors (volume_id, author_id, position)
                SELECT ?, author_id, ?
                FROM authors WHERE name = ?
                ON CONFLICT(volume_id, author_id)
                DO UPDATE SET position = excluded.position
                "#,
            )
            .bind(&volume_id)
            .bind(pos as i64)
            .bind(name)
            .execute(&mut *tx)
            .await?;
        }
    }

    // Save ISBN if present
    if let Some(isbn_val) = isbn.filter(|s| !s.is_empty()) {
        // Infer type by length
        let id_type = match isbn_val.len() {
            10 => "ISBN_10",
            13 => "ISBN_13",
            _ => "UNKNOWN",
        };

        sqlx::query(
            r#"
            INSERT INTO book_identifiers (volume_id, type, identifier)
            VALUES (?, ?, ?)
            ON CONFLICT(type, identifier) DO NOTHING
            "#,
        )
        .bind(&volume_id)
        .bind(id_type)
        .bind(isbn_val)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(volume_id)
}

pub async fn isbn_exists(pool: &tauri_plugin_sql::DbPool, isbn: &str) -> anyhow::Result<bool> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let row = sqlx::query(
        r#"
        SELECT 1
        FROM book_identifiers
        WHERE identifier = ?
        LIMIT 1
        "#,
    )
    .bind(isbn)
    .fetch_optional(sqlite_pool)
    .await?;

    Ok(row.is_some())
}

pub async fn volume_title_by_isbn(
    pool: &tauri_plugin_sql::DbPool,
    isbn: &str,
) -> anyhow::Result<Option<String>> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;

    // Join identifiers to books to get the title for the matching ISBN
    let row: Option<(String,)> = sqlx::query_as(
        r#"
        SELECT b.title
        FROM book_identifiers bi
        JOIN books b ON b.volume_id = bi.volume_id
        WHERE bi.identifier = ?
          AND bi.type IN ('ISBN_10', 'ISBN_13')
        LIMIT 1
        "#,
    )
    .bind(isbn)
    .fetch_optional(sqlite_pool)
    .await?;

    Ok(row.map(|t| t.0))
}

pub async fn update_book(
    pool: &tauri_plugin_sql::DbPool,
    payload: UpdateBookPayload,
) -> anyhow::Result<()> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let mut tx = sqlite_pool.begin().await?;

    sqlx::query(
        r#"
        UPDATE books
        SET title = ?, publisher = ?, published_date = ?, description = ?,
            page_count = ?, language = ?
        WHERE volume_id = ?
        "#,
    )
    .bind(&payload.title)
    .bind(payload.publisher.as_deref())
    .bind(payload.published_date.as_deref())
    .bind(payload.description.as_deref())
    .bind(payload.page_count)
    .bind(payload.language.as_deref())
    .bind(&payload.volume_id)
    .execute(&mut *tx)
    .await?;

    // Replace authors list
    sqlx::query("DELETE FROM book_authors WHERE volume_id = ?")
        .bind(&payload.volume_id)
        .execute(&mut *tx)
        .await?;

    for (pos, name) in payload.authors.iter().enumerate() {
        sqlx::query(r#"INSERT INTO authors (name) VALUES (?) ON CONFLICT(name) DO NOTHING"#)
            .bind(name)
            .execute(&mut *tx)
            .await?;

        sqlx::query(
            r#"
            INSERT INTO book_authors (volume_id, author_id, position)
            SELECT ?, author_id, ?
            FROM authors WHERE name = ?
            ON CONFLICT(volume_id, author_id)
            DO UPDATE SET position = excluded.position
            "#,
        )
        .bind(&payload.volume_id)
        .bind(pos as i64)
        .bind(name)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn export_books_to_csv(
    pool: &tauri_plugin_sql::DbPool,
    save_path: &std::path::Path,
) -> anyhow::Result<()> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;

    let books = sqlx::query_as::<_, BookRow>(
        r#"
        SELECT
            b.volume_id, b.title, b.publisher, b.published_date,
            b.description, b.page_count, b.language,
            b.preview_link, b.info_link, b.canonical_link, b.web_reader_link
        FROM books b
        ORDER BY b.title
        "#,
    )
    .fetch_all(sqlite_pool)
    .await?;

    let mut csv_rows = Vec::new();

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

        let authors_str = authors
            .iter()
            .map(|a| a.name.clone())
            .collect::<Vec<_>>()
            .join("; ");

        csv_rows.push(BookCSVRow {
            volume_id: book.volume_id,
            title: book.title,
            authors: authors_str,
            publisher: book.publisher,
            published_date: book.published_date,
            description: book.description,
            page_count: book.page_count,
            language: book.language,
            preview_link: book.preview_link,
            info_link: book.info_link,
            canonical_link: book.canonical_link,
            web_reader_link: book.web_reader_link,
        });
    }

    let file = std::fs::File::create(save_path)?;
    let mut wtr = csv::Writer::from_writer(file);

    for row in csv_rows {
        wtr.serialize(&row)?;
    }

    wtr.flush()?;
    Ok(())
}
