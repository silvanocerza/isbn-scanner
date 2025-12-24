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

pub const MIGRATION002: Migration = Migration {
    version: 2,
    description: "add_comic_number",
    sql: "ALTER TABLE books ADD COLUMN number INTEGER;",
    kind: MigrationKind::Up,
};

pub const MIGRATION003: Migration = Migration {
    version: 3,
    description: "allow_multiple_volumes_per_identifier",
    sql: "
    CREATE TABLE IF NOT EXISTS book_identifiers_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      volume_id TEXT NOT NULL,
      type TEXT NOT NULL,
      identifier TEXT NOT NULL,
      FOREIGN KEY (volume_id) REFERENCES books(volume_id) ON DELETE CASCADE
    );

    INSERT INTO book_identifiers_new (id, volume_id, type, identifier)
    SELECT id, volume_id, type, identifier FROM book_identifiers;

    DROP TABLE book_identifiers;

    ALTER TABLE book_identifiers_new RENAME TO book_identifiers;

    CREATE INDEX IF NOT EXISTS idx_identifiers_identifier ON book_identifiers(identifier);
    CREATE INDEX IF NOT EXISTS idx_identifiers_type ON book_identifiers(type);
    CREATE INDEX IF NOT EXISTS idx_identifiers_volume ON book_identifiers(volume_id);
    ",
    kind: MigrationKind::Up,
};

pub const MIGRATION004: Migration = Migration {
    version: 4,
    description: "add_groups",
    sql: "
    CREATE TABLE IF NOT EXISTS groups (
      group_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS book_groups (
      volume_id TEXT NOT NULL,
      group_id INTEGER NOT NULL,
      PRIMARY KEY (volume_id, group_id),
      FOREIGN KEY (volume_id) REFERENCES books(volume_id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
    CREATE INDEX IF NOT EXISTS idx_book_groups_group ON book_groups(group_id);
    CREATE INDEX IF NOT EXISTS idx_book_groups_volume ON book_groups(volume_id);
    ",
    kind: MigrationKind::Up,
};
