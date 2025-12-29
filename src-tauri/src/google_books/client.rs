use reqwest::Client;
use serde::Deserialize;
use sqlx::{Sqlite, Transaction};
use tauri::Manager;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct VolumesResponse {
    items: Option<Vec<Volume>>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Volume {
    id: String,
    #[serde(rename = "volumeInfo")]
    volume_info: VolumeInfo,
    #[serde(rename = "saleInfo")]
    sale_info: Option<SaleInfo>,
    #[serde(rename = "accessInfo")]
    access_info: Option<AccessInfo>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct VolumeInfo {
    title: String,
    authors: Option<Vec<String>>,
    publisher: Option<String>,
    published_date: Option<String>,
    description: Option<String>,
    #[serde(rename = "pageCount")]
    page_count: Option<i64>,
    #[serde(rename = "printType")]
    print_type: Option<String>,
    categories: Option<Vec<String>>,
    #[serde(rename = "maturityRating")]
    maturity_rating: Option<String>,
    language: Option<String>,
    #[serde(rename = "previewLink")]
    preview_link: Option<String>,
    #[serde(rename = "infoLink")]
    info_link: Option<String>,
    #[serde(rename = "canonicalVolumeLink")]
    canonical_volume_link: Option<String>,
    #[serde(rename = "imageLinks")]
    image_links: Option<ImageLinks>,
    #[serde(rename = "industryIdentifiers")]
    industry_identifiers: Option<Vec<IndustryIdentifier>>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct ImageLinks {
    #[serde(rename = "smallThumbnail")]
    small_thumbnail: Option<String>,
    thumbnail: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct IndustryIdentifier {
    #[serde(rename = "type")]
    type_: String,
    identifier: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct SaleInfo {
    country: Option<String>,
    saleability: Option<String>,
    #[serde(rename = "isEbook")]
    is_ebook: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct AccessInfo {
    country: Option<String>,
    viewability: Option<String>,
    embeddable: Option<bool>,
    #[serde(rename = "publicDomain")]
    public_domain: Option<bool>,
    #[serde(rename = "textToSpeechPermission")]
    text_to_speech_permission: Option<String>,
    epub: Option<Availability>,
    pdf: Option<Availability>,
    #[serde(rename = "webReaderLink")]
    web_reader_link: Option<String>,
    #[serde(rename = "accessViewStatus")]
    access_view_status: Option<String>,
    #[serde(rename = "quoteSharingAllowed")]
    quote_sharing_allowed: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Availability {
    #[serde(rename = "isAvailable")]
    is_available: Option<bool>,
}

pub struct GoogleBooksClient {
    http: Client,
}

impl GoogleBooksClient {
    pub fn new() -> Self {
        Self {
            http: Client::new(),
        }
    }

    // Returns Some(volume_id) if inserted/updated, None if no items for ISBN
    pub async fn fetch_and_store_by_isbn(
        &self,
        pool: &tauri_plugin_sql::DbPool,
        isbn: &str,
        app_handle: &tauri::AppHandle,
        api_key: &str,
    ) -> anyhow::Result<Option<String>> {
        let tauri_plugin_sql::DbPool::Sqlite(sqlite_pool) = pool;

        // 1) Fetch using query params
        let resp = self
            .http
            .get("https://www.googleapis.com/books/v1/volumes")
            .query(&[("q", format!("isbn:{isbn}")), ("key", api_key.to_string())])
            .send()
            .await?
            .error_for_status()?
            .json::<VolumesResponse>()
            .await?;

        let Some(items) = resp.items else {
            return Ok(None);
        };
        if items.is_empty() {
            return Ok(None);
        }
        let v = &items[0];
        let vi = &v.volume_info;

        // 2) Begin transaction
        let mut tx: Transaction<'_, Sqlite> = sqlite_pool.begin().await?;

        // Helpers
        let img = vi.image_links.as_ref();
        let as_i64 = |b: Option<bool>| -> i64 {
            if b.unwrap_or(false) {
                1
            } else {
                0
            }
        };

        let (s_country, saleability, is_ebook) = if let Some(s) = &v.sale_info {
            (
                s.country.clone(),
                s.saleability.clone(),
                Some(as_i64(s.is_ebook)),
            )
        } else {
            (None, None, None)
        };

        let (
            a_country,
            viewability,
            embeddable,
            public_domain,
            tts_perm,
            epub_avail,
            pdf_avail,
            web_reader_link,
            access_view_status,
            quote_sharing_allowed,
        ) = if let Some(a) = &v.access_info {
            (
                a.country.clone(),
                a.viewability.clone(),
                Some(as_i64(a.embeddable)),
                Some(as_i64(a.public_domain)),
                a.text_to_speech_permission.clone(),
                Some(as_i64(a.epub.as_ref().and_then(|e| e.is_available))),
                Some(as_i64(a.pdf.as_ref().and_then(|p| p.is_available))),
                a.web_reader_link.clone(),
                a.access_view_status.clone(),
                Some(as_i64(a.quote_sharing_allowed)),
            )
        } else {
            (None, None, None, None, None, None, None, None, None, None)
        };

        let country = s_country.or(a_country);

        // 3) Upsert book
        sqlx::query(
            r#"
            INSERT INTO books (
              volume_id, title, publisher, published_date, description,
              page_count, print_type, maturity_rating, language,
              preview_link, info_link, canonical_link, small_thumbnail,
              thumbnail, country, saleability, is_ebook, viewability,
              embeddable, public_domain, text_to_speech_permission,
              epub_available, pdf_available, web_reader_link,
              access_view_status, quote_sharing_allowed
            ) VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?,
              ?, ?
            )
            ON CONFLICT(volume_id) DO UPDATE SET
              title=excluded.title,
              publisher=excluded.publisher,
              published_date=excluded.published_date,
              description=excluded.description,
              page_count=excluded.page_count,
              print_type=excluded.print_type,
              maturity_rating=excluded.maturity_rating,
              language=excluded.language,
              preview_link=excluded.preview_link,
              info_link=excluded.info_link,
              canonical_link=excluded.canonical_link,
              small_thumbnail=excluded.small_thumbnail,
              thumbnail=excluded.thumbnail,
              country=excluded.country,
              saleability=excluded.saleability,
              is_ebook=excluded.is_ebook,
              viewability=excluded.viewability,
              embeddable=excluded.embeddable,
              public_domain=excluded.public_domain,
              text_to_speech_permission=excluded.text_to_speech_permission,
              epub_available=excluded.epub_available,
              pdf_available=excluded.pdf_available,
              web_reader_link=excluded.web_reader_link,
              access_view_status=excluded.access_view_status,
              quote_sharing_allowed=excluded.quote_sharing_allowed
            "#,
        )
        .bind(&v.id)
        .bind(&vi.title)
        .bind(&vi.publisher)
        .bind(&vi.published_date)
        .bind(&vi.description)
        .bind(&vi.page_count)
        .bind(&vi.print_type)
        .bind(&vi.maturity_rating)
        .bind(&vi.language)
        .bind(&vi.preview_link)
        .bind(&vi.info_link)
        .bind(&vi.canonical_volume_link)
        .bind(img.and_then(|i| i.small_thumbnail.clone()))
        .bind(img.and_then(|i| i.thumbnail.clone()))
        .bind(&country)
        .bind(&saleability)
        .bind(is_ebook)
        .bind(&viewability)
        .bind(embeddable)
        .bind(public_domain)
        .bind(&tts_perm)
        .bind(epub_avail)
        .bind(pdf_avail)
        .bind(&web_reader_link)
        .bind(&access_view_status)
        .bind(quote_sharing_allowed)
        .execute(&mut *tx)
        .await?;

        // 4) Upsert identifiers
        if let Some(ids) = &vi.industry_identifiers {
            for ii in ids {
                sqlx::query(
                    r#"
                    INSERT INTO book_identifiers (volume_id, type, identifier)
                    VALUES (?, ?, ?)
                    "#,
                )
                .bind(&v.id)
                .bind(&ii.type_)
                .bind(&ii.identifier)
                .execute(&mut *tx)
                .await?;
            }
        }

        // 5) Upsert authors and join (preserve order)
        if let Some(authors) = &vi.authors {
            sqlx::query("DELETE FROM book_authors WHERE volume_id = ?")
                .bind(&v.id)
                .execute(&mut *tx)
                .await?;

            for (pos, name) in authors.iter().enumerate() {
                sqlx::query(
                    r#"INSERT INTO authors (name) VALUES (?) ON CONFLICT(name) DO NOTHING"#,
                )
                .bind(name)
                .execute(&mut *tx)
                .await?;

                sqlx::query(
                    r#"
                    INSERT INTO book_authors (volume_id, author_id, position)
                    SELECT ?, author_id, ?
                    FROM authors WHERE name = ?
                    ON CONFLICT(volume_id, author_id)
                    DO UPDATE SET position=excluded.position
                    "#,
                )
                .bind(&v.id)
                .bind(pos as i64)
                .bind(name)
                .execute(&mut *tx)
                .await?;
            }
        }

        // 6) Upsert categories and join
        if let Some(cats) = &vi.categories {
            for name in cats {
                sqlx::query(
                    r#"INSERT INTO categories (name) VALUES (?) ON CONFLICT(name) DO NOTHING"#,
                )
                .bind(name)
                .execute(&mut *tx)
                .await?;

                sqlx::query(
                    r#"
                    INSERT INTO book_categories (volume_id, category_id)
                    SELECT ?, category_id
                    FROM categories WHERE name = ?
                    ON CONFLICT(volume_id, category_id) DO NOTHING
                    "#,
                )
                .bind(&v.id)
                .bind(name)
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;

        if let Some(img) = vi.image_links.as_ref() {
            if let Some(thumb_url) = &img.thumbnail {
                self.download_thumbnail(&v.id, thumb_url, &app_handle)
                    .await
                    .ok();
            }
        } else {
            println!("[DEBUG] Failed downloading thumbnail")
        }

        Ok(Some(v.id.clone()))
    }

    async fn download_thumbnail(
        &self,
        volume_id: &str,
        url: &str,
        app_handle: &tauri::AppHandle,
    ) -> anyhow::Result<()> {
        println!(
            "[DEBUG] Downloading thumbnail for {} from {}",
            volume_id, url
        );

        let img_data = self.http.get(url).send().await?.bytes().await?;
        println!("[DEBUG] Downloaded {} bytes", img_data.len());

        let app_data_dir = app_handle.path().app_data_dir()?;
        let books_dir = app_data_dir.join("books");

        std::fs::create_dir_all(&books_dir)?;

        let file_path = books_dir.join(format!("{}.jpg", volume_id));
        println!("[DEBUG] Saving thumbnail to: {}", file_path.display());

        std::fs::write(&file_path, img_data)?;
        println!("[DEBUG] Thumbnail saved successfully");

        Ok(())
    }
}
