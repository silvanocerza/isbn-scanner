import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Save } from "lucide-react";
import { BookWithThumbnail } from "./BookGrid";

export interface DetailsDialogProps {
  open: boolean;
  onClose: () => void;
  initial: BookWithThumbnail;
  editMode?: boolean;
}

export function DetailsDialog({
  open,
  onClose,
  initial,
  editMode = false,
}: DetailsDialogProps) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: initial.book.title,
    publisher: initial.book.publisher ?? "",
    published_date: initial.book.published_date ?? "",
    description: initial.book.description ?? "",
    page_count: initial.book.page_count?.toString() ?? "",
    language: initial.book.language ?? "",
    authors: initial.authors.join(", "),
  });

  useEffect(() => {
    setForm({
      title: initial.book.title,
      publisher: initial.book.publisher ?? "",
      published_date: initial.book.published_date ?? "",
      description: initial.book.description ?? "",
      page_count: initial.book.page_count?.toString() ?? "",
      language: initial.book.language ?? "",
      authors: initial.authors.map((a) => a.name.trim()).join(", "),
    });
  }, [initial, editMode]);

  const dirty = useMemo(() => {
    const authorsArr = form.authors
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const origAuthors = initial.authors.map((a) => a.name.trim());
    const eqAuthors =
      authorsArr.length === origAuthors.length &&
      authorsArr.every((a, i) => a === origAuthors[i]);

    return !(
      form.title === initial.book.title &&
      (form.publisher || "") === (initial.book.publisher || "") &&
      (form.published_date || "") === (initial.book.published_date || "") &&
      (form.description || "") === (initial.book.description || "") &&
      (form.page_count || "") === (initial.book.page_count?.toString() || "") &&
      (form.language || "") === (initial.book.language || "") &&
      eqAuthors
    );
  }, [form, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (editMode) void onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, editMode, form]);

  const onSave = async () => {
    setSaving(true);
    try {
      const authorsArr = form.authors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await invoke("update_book", {
        payload: {
          volume_id: initial.book.volume_id,
          title: form.title,
          publisher: form.publisher || null,
          published_date: form.published_date || null,
          description: form.description || null,
          page_count: form.page_count ? parseInt(form.page_count, 10) : null,
          language: form.language || null,
          authors: authorsArr,
        },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-center pt-16">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative w-full max-w-3xl mx-4 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="rounded-xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {form.title}
              </h2>
              <h2 className="text-md font-medium text-gray-900 truncate">
                {form.authors}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {initial.book.volume_id.slice(0, 12)} ·{" "}
                {form.language || "Unknown language"}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <button
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-[180px,1fr] gap-8 p-6">
            {/* Left rail */}
            <div className="flex flex-row gap-4 ">
              <div className="w-[180px] aspect-2/3 overflow-hidden rounded-xl bg-linear-to-br from-gray-100 to-gray-200 ring-1 ring-gray-300/50 shadow-sm">
                {initial.thumbnail_path ? (
                  <img
                    src={initial.thumbnail_path}
                    alt={initial.book.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-gray-400">
                    No cover
                  </div>
                )}
              </div>
              <div className="flex-1 rounded-xl bg-linear-to-br from-blue-50 to-indigo-50 p-4 text-sm ring-1 ring-blue-100 shadow-sm">
                <div className="space-y-2.5">
                  <InfoRow label="Pages" value={initial.book.page_count} />
                  <div className="h-px bg-blue-100/50" />
                  <InfoRow label="Publisher" value={initial.book.publisher} />
                  <div className="h-px bg-blue-100/50" />
                  <InfoRow label="Year" value={initial.book.published_date} />
                  <div className="h-px bg-blue-100/50" />
                  <InfoRow label="Print Type" value={initial.book.print_type} />
                  <div className="h-px bg-blue-100/50" />
                  <InfoRow label="Language" value={initial.book.language} />
                </div>
              </div>
            </div>

            {/* Right side */}
            {editMode ? (
              <div className="space-y-5 max-h-[600px] overflow-y-auto">
                <Field
                  label="Title"
                  value={form.title}
                  onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Publisher"
                    value={form.publisher}
                    onChange={(v) => setForm((f) => ({ ...f, publisher: v }))}
                  />
                  <Field
                    label="Year"
                    value={form.published_date}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, published_date: v }))
                    }
                  />
                </div>
                <Field
                  label="Authors (comma-separated)"
                  value={form.authors}
                  onChange={(v) => setForm((f) => ({ ...f, authors: v }))}
                />
                <TextArea
                  label="Description"
                  value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Pages"
                    value={form.page_count}
                    onChange={(v) => setForm((f) => ({ ...f, page_count: v }))}
                    inputMode="numeric"
                  />
                  <Field
                    label="Language"
                    value={form.language}
                    onChange={(v) => setForm((f) => ({ ...f, language: v }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Print Type"
                    value={initial.book.print_type ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Maturity Rating"
                    value={initial.book.maturity_rating ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Country"
                    value={initial.book.country ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Saleability"
                    value={initial.book.saleability ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Viewability"
                    value={initial.book.viewability ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Text to Speech"
                    value={initial.book.text_to_speech_permission ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <Field
                  label="Access View Status"
                  value={initial.book.access_view_status ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <div className="grid grid-cols-3 gap-4">
                  <Field
                    label="Is Ebook"
                    value={initial.book.is_ebook ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Public Domain"
                    value={initial.book.public_domain ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Embeddable"
                    value={initial.book.embeddable ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field
                    label="EPUB Available"
                    value={initial.book.epub_available ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="PDF Available"
                    value={initial.book.pdf_available ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Quote Sharing"
                    value={initial.book.quote_sharing_allowed ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                </div>

                <ViewField
                  label="Preview Link"
                  value={initial.book.preview_link}
                  isLink
                />
                <ViewField
                  label="Info Link"
                  value={initial.book.info_link}
                  isLink
                />
                <ViewField
                  label="Canonical Link"
                  value={initial.book.canonical_link}
                  isLink
                />
                <ViewField
                  label="Web Reader Link"
                  value={initial.book.web_reader_link}
                  isLink
                />
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                <ViewField label="Title" value={form.title} />
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Publisher" value={form.publisher} />
                  <ViewField label="Year" value={form.published_date} />
                </div>
                <ViewField label="Authors" value={form.authors} />
                <ViewField
                  label="Description"
                  value={form.description}
                  multiline
                />
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Pages" value={form.page_count} />
                  <ViewField label="Language" value={form.language} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ViewField
                    label="Print Type"
                    value={initial.book.print_type}
                  />
                  <ViewField
                    label="Maturity Rating"
                    value={initial.book.maturity_rating}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Country" value={initial.book.country} />
                  <ViewField
                    label="Saleability"
                    value={initial.book.saleability}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <ViewField
                    label="Is Ebook"
                    value={initial.book.is_ebook ? "Yes" : "No"}
                  />
                  <ViewField
                    label="Public Domain"
                    value={initial.book.public_domain ? "Yes" : "No"}
                  />
                  <ViewField
                    label="Embeddable"
                    value={initial.book.embeddable ? "Yes" : "No"}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <ViewField
                    label="EPUB Available"
                    value={initial.book.epub_available ? "Yes" : "No"}
                  />
                  <ViewField
                    label="PDF Available"
                    value={initial.book.pdf_available ? "Yes" : "No"}
                  />
                  <ViewField
                    label="Quote Sharing Allowed"
                    value={initial.book.quote_sharing_allowed ? "Yes" : "No"}
                  />
                </div>
                <ViewField
                  label="Text to Speech"
                  value={initial.book.text_to_speech_permission}
                />
                <ViewField
                  label="Viewability"
                  value={initial.book.viewability}
                />
                <ViewField
                  label="Access View Status"
                  value={initial.book.access_view_status}
                />
                <ViewField
                  label="Preview Link"
                  value={initial.book.preview_link}
                  isLink
                />
                <ViewField
                  label="Info Link"
                  value={initial.book.info_link}
                  isLink
                />
                <ViewField
                  label="Canonical Link"
                  value={initial.book.canonical_link}
                  isLink
                />
                <ViewField
                  label="Web Reader Link"
                  value={initial.book.web_reader_link}
                  isLink
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={onClose}
              >
                Close
              </button>
              {editMode && (
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                  onClick={onSave}
                  disabled={
                    !editMode || saving || !dirty || form.title.trim() === ""
                  }
                >
                  <Save size={16} />
                  {saving ? "Saving…" : "Save"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block group">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </span>
      <input
        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        inputMode={inputMode}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block group">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </span>
      <textarea
        className="min-h-32 w-full resize-y rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}
function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600 font-medium">{label}</span>
      <span className="text-gray-900 font-semibold truncate">
        {value || "—"}
      </span>
    </div>
  );
}

function ViewField({
  label,
  value,
  multiline,
  isLink,
}: {
  label: string;
  value: any;
  multiline?: boolean;
  isLink?: boolean;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{label}</h3>
      <p
        className={`text-gray-900 text-sm ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {isLink && value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          value || "—"
        )}
      </p>
    </div>
  );
}
