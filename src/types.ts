export interface Book {
  volume_id: string;
  title: string;
  number?: number;
  publisher?: string;
  authors?: string[];
  year?: string;
  published_date?: string | null;
  description?: string | null;
  page_count?: number | null;
  language?: string | null;
  print_type?: string | null;
  maturity_rating?: string | null;
  preview_link?: string | null;
  info_link?: string | null;
  canonical_link?: string | null;
  country?: string | null;
  saleability?: string | null;
  is_ebook?: boolean | null;
  viewability?: string | null;
  embeddable?: boolean | null;
  public_domain?: boolean | null;
  text_to_speech_permission?: string | null;
  epub_available?: boolean | null;
  pdf_available?: boolean | null;
  web_reader_link?: string | null;
  access_view_status?: string | null;
  quote_sharing_allowed?: boolean | null;
}

export interface BookWithThumbnail {
  book: Book;
  authors: { name: string }[];
  isbns: string[];
  // This can either be the path to the thumbnail file or the object URL
  // of the blob for this book.
  // If it's an empty string or not set the book doesn't have an thumbnail.
  thumbnail?: string;
}
