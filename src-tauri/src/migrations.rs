use tauri_plugin_sql::{Migration, MigrationKind};

pub const MIGRATION001: Migration = Migration {
    version: 1,
    description: "create_initial_tables",
    sql: "
    CREATE TABLE IF NOT EXISTS books (
      volume_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      publisher TEXT,
      published_date TEXT,
      description TEXT,
      page_count INTEGER,
      print_type TEXT,
      maturity_rating TEXT,
      language TEXT,
      preview_link TEXT,
      info_link TEXT,
      canonical_link TEXT,
      small_thumbnail TEXT,
      thumbnail TEXT,
      country TEXT,
      saleability TEXT,
      is_ebook INTEGER CHECK (is_ebook IN (0,1)),
      viewability TEXT,
      embeddable INTEGER CHECK (embeddable IN (0,1)),
      public_domain INTEGER CHECK (public_domain IN (0,1)),
      text_to_speech_permission TEXT,
      epub_available INTEGER CHECK (epub_available IN (0,1)),
      pdf_available INTEGER CHECK (pdf_available IN (0,1)),
      web_reader_link TEXT,
      access_view_status TEXT,
      quote_sharing_allowed INTEGER CHECK (quote_sharing_allowed IN (0,1))
    );

    CREATE TABLE IF NOT EXISTS authors (
      author_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS book_authors (
      volume_id TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (volume_id, author_id),
      FOREIGN KEY (volume_id) REFERENCES books(volume_id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS book_categories (
      volume_id TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (volume_id, category_id),
      FOREIGN KEY (volume_id) REFERENCES books(volume_id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS book_identifiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      volume_id TEXT NOT NULL,
      type TEXT NOT NULL,
      identifier TEXT NOT NULL,
      UNIQUE (type, identifier),
      FOREIGN KEY (volume_id) REFERENCES books(volume_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name);
    CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
    CREATE INDEX IF NOT EXISTS idx_identifiers_identifier ON book_identifiers(identifier);
    CREATE INDEX IF NOT EXISTS idx_book_authors_author ON book_authors(author_id);
    CREATE INDEX IF NOT EXISTS idx_book_categories_category ON book_categories(category_id);
    ",
    kind: MigrationKind::Up,
};
