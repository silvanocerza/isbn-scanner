use serde::Deserialize;
use serde::Serialize;
use sqlx::FromRow;
use std::collections::HashMap;
use tauri::Manager;
use uuid::Uuid;

use crate::utils::get_identifier_type;

#[derive(Debug, Serialize, FromRow)]
pub struct Book {
    pub volume_id: String,
    pub title: String,
    pub number: Option<i64>,
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
    #[sqlx(skip)]
    pub groups: Vec<String>,
    #[sqlx(skip)]
    pub custom_fields: HashMap<String, String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct Author {
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct BookWithThumbnail {
    pub book: Book,
    pub authors: Vec<Author>,
    pub isbns: Vec<String>,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBookPayload {
    pub volume_id: String,
    pub title: String,
    pub number: Option<i64>,
    pub publisher: Option<String>,
    pub published_date: Option<String>,
    pub description: Option<String>,
    pub page_count: Option<i64>,
    pub language: Option<String>,
    pub authors: Vec<String>,
    pub groups: Vec<String>,
    pub custom_fields: HashMap<String, String>,
}

#[derive(sqlx::FromRow)]
struct Category {
    name: String,
}

#[derive(sqlx::FromRow)]
struct Identifier {
    #[sqlx(rename = "type")]
    type_: String,
    identifier: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct CustomField {
    pub field_id: i64,
    pub name: String,
}

#[derive(Debug, Serialize, FromRow)]
struct CustomFieldValue {
    pub name: String,
    pub value: String,
}

#[derive(sqlx::FromRow)]
struct BookRow {
    pub volume_id: String,
    pub title: String,
    pub number: Option<i64>,
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

async fn load_custom_fields_for_book(
    pool: &sqlx::SqlitePool,
    volume_id: &str,
) -> anyhow::Result<HashMap<String, String>> {
    let fields = sqlx::query_as::<_, CustomFieldValue>(
        r#"
        SELECT cf.name, bcf.value
        FROM book_custom_fields bcf
        JOIN custom_fields cf ON bcf.field_id = cf.field_id
        WHERE bcf.volume_id = ?
        "#,
    )
    .bind(volume_id)
    .fetch_all(pool)
    .await?;

    Ok(fields.into_iter().map(|f| (f.name, f.value)).collect())
}

pub async fn fetch_all_books(
    pool: &tauri_plugin_sql::DbPool,
    app_handle: &tauri::AppHandle,
) -> anyhow::Result<Vec<BookWithThumbnail>> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let books = sqlx::query_as::<_, Book>(
        r#"
        SELECT
            volume_id, title, number, publisher, published_date, description,
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
    for mut book in books {
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

        let groups = sqlx::query_scalar::<_, String>(
            r#"
            SELECT g.name
            FROM groups g
            JOIN book_groups bg ON g.group_id = bg.group_id
            WHERE bg.volume_id = ?
            ORDER BY g.name
            "#,
        )
        .bind(&book.volume_id)
        .fetch_all(sqlite_pool)
        .await?;

        let custom_fields = load_custom_fields_for_book(sqlite_pool, &book.volume_id).await?;

        let isbns = sqlx::query_scalar::<_, String>(
            r#"
            SELECT identifier
            FROM book_identifiers
            WHERE volume_id = ?
            ORDER BY type DESC
            "#,
        )
        .bind(&book.volume_id)
        .fetch_all(sqlite_pool)
        .await?;

        let thumbnail_path = books_dir.join(format!("{}.jpg", book.volume_id));
        let thumbnail = if thumbnail_path.exists() {
            Some(thumbnail_path.to_string_lossy().to_string())
        } else {
            None
        };

        book.groups = groups;
        book.custom_fields = custom_fields;

        result.push(BookWithThumbnail {
            book,
            authors,
            isbns,
            thumbnail,
        });
    }

    Ok(result)
}

pub async fn get_book(pool: &tauri_plugin_sql::DbPool, volume_id: &str) -> anyhow::Result<Book> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let mut book = sqlx::query_as::<_, Book>(
        r#"
        SELECT
            volume_id, title, number, publisher, published_date, description,
            page_count, print_type, maturity_rating, language,
            preview_link, info_link, canonical_link, small_thumbnail,
            thumbnail, country, saleability, is_ebook, viewability,
            embeddable, public_domain, text_to_speech_permission,
            epub_available, pdf_available, web_reader_link,
            access_view_status, quote_sharing_allowed
        FROM books
        WHERE volume_id = ?
        "#,
    )
    .bind(volume_id)
    .fetch_one(sqlite_pool)
    .await?;

    let groups = sqlx::query_scalar::<_, String>(
        r#"
        SELECT g.name
        FROM groups g
        JOIN book_groups bg ON g.group_id = bg.group_id
        WHERE bg.volume_id = ?
        ORDER BY g.name
        "#,
    )
    .bind(volume_id)
    .fetch_all(sqlite_pool)
    .await?;

    let custom_fields = load_custom_fields_for_book(sqlite_pool, volume_id).await?;

    book.groups = groups;
    book.custom_fields = custom_fields;
    Ok(book)
}

pub async fn find_books_containing_title(
    pool: &tauri_plugin_sql::DbPool,
    title: &str,
) -> anyhow::Result<Vec<Book>> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let mut books = sqlx::query_as::<_, Book>(
        r#"
        SELECT
            volume_id, title, number, publisher, published_date, description,
            page_count, print_type, maturity_rating, language,
            preview_link, info_link, canonical_link, small_thumbnail,
            thumbnail, country, saleability, is_ebook, viewability,
            embeddable, public_domain, text_to_speech_permission,
            epub_available, pdf_available, web_reader_link,
            access_view_status, quote_sharing_allowed
        FROM books
        WHERE LOWER(title) LIKE ?
        "#,
    )
    .bind(format!("%{title}%"))
    .fetch_all(sqlite_pool)
    .await?;

    for book in &mut books {
        let groups = sqlx::query_scalar::<_, String>(
            r#"
            SELECT g.name
            FROM groups g
            JOIN book_groups bg ON g.group_id = bg.group_id
            WHERE bg.volume_id = ?
            ORDER BY g.name
            "#,
        )
        .bind(&book.volume_id)
        .fetch_all(sqlite_pool)
        .await?;

        let custom_fields = load_custom_fields_for_book(sqlite_pool, &book.volume_id).await?;

        book.groups = groups;
        book.custom_fields = custom_fields;
    }

    Ok(books)
}

pub async fn set_book_number(
    pool: &tauri_plugin_sql::DbPool,
    volume_id: &str,
    number: i64,
) -> anyhow::Result<()> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    sqlx::query(
        r#"
        UPDATE books
        SET number = ?
        WHERE volume_id = ?
        "#,
    )
    .bind(number)
    .bind(volume_id)
    .execute(sqlite_pool)
    .await?;

    Ok(())
}

pub async fn insert_book(
    pool: &tauri_plugin_sql::DbPool,
    title: &str,
    number: Option<i64>,
    authors: &[String],
    groups: &[String],
    publisher: Option<&str>,
    year: Option<&str>,
    identifier: Option<&str>,
    custom_fields: HashMap<String, String>,
) -> anyhow::Result<String> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let mut tx = sqlite_pool.begin().await?;

    // Generate a synthetic volume_id
    let volume_id = Uuid::new_v4().to_string();

    // Insert into books with minimal fields
    sqlx::query(
        r#"
        INSERT INTO books (
          volume_id, title, number, publisher, published_date,
          description, page_count, print_type, maturity_rating,
          language, preview_link, info_link, canonical_link,
          small_thumbnail, thumbnail, country, saleability, is_ebook,
          viewability, embeddable, public_domain, text_to_speech_permission,
          epub_available, pdf_available, web_reader_link, access_view_status, quote_sharing_allowed
        ) VALUES (
          ?, ?, ?, ?, ?,
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
    .bind(number)
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

    // Groups (optional)
    if !groups.is_empty() {
        for group_name in groups {
            sqlx::query(r#"INSERT INTO groups (name) VALUES (?) ON CONFLICT(name) DO NOTHING"#)
                .bind(group_name)
                .execute(&mut *tx)
                .await?;

            sqlx::query(
                r#"
                INSERT INTO book_groups (volume_id, group_id)
                SELECT ?, group_id
                FROM groups WHERE name = ?
                "#,
            )
            .bind(&volume_id)
            .bind(group_name)
            .execute(&mut *tx)
            .await?;
        }
    }

    // Save ISBN/EAN-13 if present
    if let Some(id_value) = identifier.filter(|s| !s.is_empty()) {
        let id_type = get_identifier_type(id_value)?;
        sqlx::query(
            r#"
            INSERT INTO book_identifiers (volume_id, type, identifier)
            VALUES (?, ?, ?)
            "#,
        )
        .bind(&volume_id)
        .bind(id_type)
        .bind(id_value)
        .execute(&mut *tx)
        .await?;
    }

    for (field_name, value) in custom_fields {
        sqlx::query(r#"INSERT INTO custom_fields (name) VALUES (?) ON CONFLICT(name) DO NOTHING"#)
            .bind(&field_name)
            .execute(&mut *tx)
            .await?;

        sqlx::query(
            r#"
            INSERT INTO book_custom_fields (volume_id, field_id, value)
            SELECT ?, field_id, ?
            FROM custom_fields WHERE name = ?
            "#,
        )
        .bind(&volume_id)
        .bind(value)
        .bind(&field_name)
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

pub async fn update_book(
    pool: &tauri_plugin_sql::DbPool,
    payload: UpdateBookPayload,
) -> anyhow::Result<()> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let mut tx = sqlite_pool.begin().await?;

    sqlx::query(
        r#"
        UPDATE books
        SET title = ?, number = ?, publisher = ?, published_date = ?, description = ?,
            page_count = ?, language = ?
        WHERE volume_id = ?
        "#,
    )
    .bind(&payload.title)
    .bind(payload.number)
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

    // Replace groups list
    sqlx::query("DELETE FROM book_groups WHERE volume_id = ?")
        .bind(&payload.volume_id)
        .execute(&mut *tx)
        .await?;

    for group_name in &payload.groups {
        sqlx::query(r#"INSERT INTO groups (name) VALUES (?) ON CONFLICT(name) DO NOTHING"#)
            .bind(group_name)
            .execute(&mut *tx)
            .await?;

        sqlx::query(
            r#"
            INSERT INTO book_groups (volume_id, group_id)
            SELECT ?, group_id
            FROM groups WHERE name = ?
            "#,
        )
        .bind(&payload.volume_id)
        .bind(group_name)
        .execute(&mut *tx)
        .await?;
    }

    sqlx::query("DELETE FROM book_custom_fields WHERE volume_id = ?")
        .bind(&payload.volume_id)
        .execute(&mut *tx)
        .await?;

    for (field_name, value) in &payload.custom_fields {
        sqlx::query(r#"INSERT INTO custom_fields (name) VALUES (?) ON CONFLICT(name) DO NOTHING"#)
            .bind(field_name)
            .execute(&mut *tx)
            .await?;

        sqlx::query(
            r#"
            INSERT INTO book_custom_fields (volume_id, field_id, value)
            SELECT ?, field_id, ?
            FROM custom_fields WHERE name = ?
            "#,
        )
        .bind(&payload.volume_id)
        .bind(value)
        .bind(field_name)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn export_books_to_csv(
    pool: &tauri_plugin_sql::DbPool,
    save_path: &std::path::Path,
    app_handle: &tauri::AppHandle,
) -> anyhow::Result<()> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;

    // First, collect all unique custom field names
    let all_custom_field_names =
        sqlx::query_scalar::<_, String>("SELECT DISTINCT name FROM custom_fields ORDER BY name")
            .fetch_all(sqlite_pool)
            .await?;

    let books = sqlx::query_as::<_, BookRow>(
        r#"
        SELECT
            volume_id, title, number, publisher, published_date, description,
            page_count, print_type, maturity_rating, language,
            preview_link, info_link, canonical_link, small_thumbnail,
            thumbnail, country, saleability, is_ebook, viewability,
            embeddable, public_domain, text_to_speech_permission,
            epub_available, pdf_available, web_reader_link,
            access_view_status, quote_sharing_allowed
        FROM books
        ORDER BY title
        "#,
    )
    .fetch_all(sqlite_pool)
    .await?;

    let file = std::fs::File::create(save_path)?;
    let mut wtr = csv::Writer::from_writer(file);

    // Create images directory next to CSV file
    let csv_parent = save_path.parent().unwrap_or(std::path::Path::new("."));
    let images_dir = csv_parent.join("images");
    std::fs::create_dir_all(&images_dir)?;

    // Get app books directory
    let app_data_dir = app_handle.path().app_data_dir()?;
    let books_dir = app_data_dir.join("books");

    // Write header
    let mut headers = vec![
        "volume_id",
        "title",
        "number",
        "authors",
        "categories",
        "identifiers",
        "groups",
        "publisher",
        "published_date",
        "description",
        "page_count",
        "print_type",
        "maturity_rating",
        "language",
        "preview_link",
        "info_link",
        "canonical_link",
        "small_thumbnail",
        "thumbnail",
        "country",
        "saleability",
        "is_ebook",
        "viewability",
        "embeddable",
        "public_domain",
        "text_to_speech_permission",
        "epub_available",
        "pdf_available",
        "web_reader_link",
        "access_view_status",
        "quote_sharing_allowed",
    ];

    for field_name in &all_custom_field_names {
        headers.push(field_name);
    }

    wtr.write_record(&headers)?;

    // Write data rows
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

        let categories = sqlx::query_as::<_, Category>(
            r#"
            SELECT c.name
            FROM categories c
            JOIN book_categories bc ON c.category_id = bc.category_id
            WHERE bc.volume_id = ?
            "#,
        )
        .bind(&book.volume_id)
        .fetch_all(sqlite_pool)
        .await?;

        let identifiers = sqlx::query_as::<_, Identifier>(
            r#"
            SELECT type, identifier
            FROM book_identifiers
            WHERE volume_id = ?
            "#,
        )
        .bind(&book.volume_id)
        .fetch_all(sqlite_pool)
        .await?;

        let groups = sqlx::query_scalar::<_, String>(
            r#"
            SELECT g.name
            FROM groups g
            JOIN book_groups bg ON g.group_id = bg.group_id
            WHERE bg.volume_id = ?
            "#,
        )
        .bind(&book.volume_id)
        .fetch_all(sqlite_pool)
        .await?;

        let custom_fields = load_custom_fields_for_book(sqlite_pool, &book.volume_id).await?;

        // Copy thumbnail if it exists
        let source_path = books_dir.join(format!("{}.jpg", book.volume_id));
        if source_path.exists() {
            let dest_path = images_dir.join(format!("{}.jpg", book.volume_id));
            std::fs::copy(&source_path, &dest_path).ok();
        }

        let mut record = vec![
            book.volume_id.clone(),
            book.title.clone(),
            book.number.map(|n| n.to_string()).unwrap_or_default(),
            authors
                .iter()
                .map(|a| a.name.clone())
                .collect::<Vec<_>>()
                .join("; "),
            categories
                .iter()
                .map(|c| c.name.clone())
                .collect::<Vec<_>>()
                .join("; "),
            identifiers
                .iter()
                .map(|i| format!("{}:{}", i.type_, i.identifier))
                .collect::<Vec<_>>()
                .join("; "),
            groups.join("; "),
            book.publisher.unwrap_or_default(),
            book.published_date.unwrap_or_default(),
            book.description.unwrap_or_default(),
            book.page_count.map(|n| n.to_string()).unwrap_or_default(),
            book.print_type.unwrap_or_default(),
            book.maturity_rating.unwrap_or_default(),
            book.language.unwrap_or_default(),
            book.preview_link.unwrap_or_default(),
            book.info_link.unwrap_or_default(),
            book.canonical_link.unwrap_or_default(),
            book.small_thumbnail.unwrap_or_default(),
            book.thumbnail.unwrap_or_default(),
            book.country.unwrap_or_default(),
            book.saleability.unwrap_or_default(),
            book.is_ebook.map(|n| n.to_string()).unwrap_or_default(),
            book.viewability.unwrap_or_default(),
            book.embeddable.map(|n| n.to_string()).unwrap_or_default(),
            book.public_domain
                .map(|n| n.to_string())
                .unwrap_or_default(),
            book.text_to_speech_permission.unwrap_or_default(),
            book.epub_available
                .map(|n| n.to_string())
                .unwrap_or_default(),
            book.pdf_available
                .map(|n| n.to_string())
                .unwrap_or_default(),
            book.web_reader_link.unwrap_or_default(),
            book.access_view_status.unwrap_or_default(),
            book.quote_sharing_allowed
                .map(|n| n.to_string())
                .unwrap_or_default(),
        ];

        // Add custom field values in the same order as headers
        for field_name in &all_custom_field_names {
            record.push(custom_fields.get(field_name).cloned().unwrap_or_default());
        }

        wtr.write_record(&record)?;
    }

    wtr.flush()?;
    Ok(())
}

pub async fn find_comic_by_ean(
    pool: &tauri_plugin_sql::DbPool,
    ean: &str,
) -> anyhow::Result<Option<Book>> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let mut book = sqlx::query_as::<_, Book>(
        r#"
        SELECT DISTINCT b.*
        FROM books b
        JOIN book_identifiers bi ON b.volume_id = bi.volume_id
        WHERE bi.type = 'EAN_13' AND bi.identifier = ?
        "#,
    )
    .bind(ean)
    .fetch_optional(sqlite_pool)
    .await?;

    if let Some(ref mut b) = book {
        let groups = sqlx::query_scalar::<_, String>(
            r#"
            SELECT g.name
            FROM groups g
            JOIN book_groups bg ON g.group_id = bg.group_id
            WHERE bg.volume_id = ?
            ORDER BY g.name
            "#,
        )
        .bind(&b.volume_id)
        .fetch_all(sqlite_pool)
        .await?;

        let custom_fields = load_custom_fields_for_book(sqlite_pool, &b.volume_id).await?;

        b.groups = groups;
        b.custom_fields = custom_fields;
    }

    Ok(book)
}

pub async fn clone_book(
    pool: &tauri_plugin_sql::DbPool,
    volume_id: &str,
) -> anyhow::Result<String> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let mut tx = sqlite_pool.begin().await?;

    // Get the original book
    let book = sqlx::query_as::<_, Book>(
        r#"
        SELECT
            volume_id, title, number, publisher, published_date, description,
            page_count, print_type, maturity_rating, language,
            preview_link, info_link, canonical_link, small_thumbnail,
            thumbnail, country, saleability, is_ebook, viewability,
            embeddable, public_domain, text_to_speech_permission,
            epub_available, pdf_available, web_reader_link,
            access_view_status, quote_sharing_allowed
        FROM books
        WHERE volume_id = ?
        "#,
    )
    .bind(volume_id)
    .fetch_one(&mut *tx)
    .await?;

    let new_volume_id = Uuid::new_v4().to_string();

    // Insert cloned book
    sqlx::query(
        r#"
        INSERT INTO books (
          volume_id, title, number, publisher, published_date,
          description, page_count, print_type, maturity_rating,
          language, preview_link, info_link, canonical_link,
          small_thumbnail, thumbnail, country, saleability, is_ebook,
          viewability, embeddable, public_domain, text_to_speech_permission,
          epub_available, pdf_available, web_reader_link, access_view_status, quote_sharing_allowed
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
        "#,
    )
    .bind(&new_volume_id)
    .bind(&book.title)
    .bind(book.number)
    .bind(&book.publisher)
    .bind(&book.published_date)
    .bind(&book.description)
    .bind(book.page_count)
    .bind(&book.print_type)
    .bind(&book.maturity_rating)
    .bind(&book.language)
    .bind(&book.preview_link)
    .bind(&book.info_link)
    .bind(&book.canonical_link)
    .bind(&book.small_thumbnail)
    .bind(&book.thumbnail)
    .bind(&book.country)
    .bind(&book.saleability)
    .bind(book.is_ebook)
    .bind(&book.viewability)
    .bind(book.embeddable)
    .bind(book.public_domain)
    .bind(&book.text_to_speech_permission)
    .bind(book.epub_available)
    .bind(book.pdf_available)
    .bind(&book.web_reader_link)
    .bind(&book.access_view_status)
    .bind(book.quote_sharing_allowed)
    .execute(&mut *tx)
    .await?;

    // Clone authors
    sqlx::query(
        r#"
        INSERT INTO book_authors (volume_id, author_id, position)
        SELECT ?, author_id, position
        FROM book_authors
        WHERE volume_id = ?
        "#,
    )
    .bind(&new_volume_id)
    .bind(volume_id)
    .execute(&mut *tx)
    .await?;

    // Clone groups
    sqlx::query(
        r#"
        INSERT INTO book_groups (volume_id, group_id)
        SELECT ?, group_id
        FROM book_groups
        WHERE volume_id = ?
        "#,
    )
    .bind(&new_volume_id)
    .bind(volume_id)
    .execute(&mut *tx)
    .await?;

    // Clone identifiers
    sqlx::query(
        r#"
        INSERT INTO book_identifiers (volume_id, type, identifier)
        SELECT ?, type, identifier
        FROM book_identifiers
        WHERE volume_id = ?
        "#,
    )
    .bind(&new_volume_id)
    .bind(volume_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO book_custom_fields (volume_id, field_id, value)
        SELECT ?, field_id, value
        FROM book_custom_fields
        WHERE volume_id = ?
        "#,
    )
    .bind(&new_volume_id)
    .bind(volume_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(new_volume_id)
}

pub async fn get_all_groups(pool: &tauri_plugin_sql::DbPool) -> anyhow::Result<Vec<String>> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let groups = sqlx::query_scalar::<_, String>("SELECT name FROM groups ORDER BY name")
        .fetch_all(sqlite_pool)
        .await?;
    Ok(groups)
}

pub async fn get_all_custom_fields(pool: &tauri_plugin_sql::DbPool) -> anyhow::Result<Vec<String>> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let fields = sqlx::query_scalar::<_, String>("SELECT name FROM custom_fields ORDER BY name")
        .fetch_all(sqlite_pool)
        .await?;
    Ok(fields)
}

pub async fn set_book_groups(
    pool: &tauri_plugin_sql::DbPool,
    volume_id: &str,
    groups: &[String],
) -> anyhow::Result<()> {
    let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;
    let mut tx = sqlite_pool.begin().await?;

    // Remove existing groups
    sqlx::query("DELETE FROM book_groups WHERE volume_id = ?")
        .bind(volume_id)
        .execute(&mut *tx)
        .await?;

    // Insert new groups
    for group_name in groups {
        sqlx::query(r#"INSERT INTO groups (name) VALUES (?) ON CONFLICT(name) DO NOTHING"#)
            .bind(group_name)
            .execute(&mut *tx)
            .await?;

        sqlx::query(
            r#"
            INSERT INTO book_groups (volume_id, group_id)
            SELECT ?, group_id
            FROM groups WHERE name = ?
            "#,
        )
        .bind(volume_id)
        .bind(group_name)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}
