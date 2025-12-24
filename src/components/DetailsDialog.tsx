import { cn, getColorForGroup } from "../utils";
import { useEffect, useMemo, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { BookWithThumbnail } from "../types";

export interface DetailsDialogProps {
  open: boolean;
  onClose: () => void;
  initial: BookWithThumbnail;
  editMode?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  knownGroups?: string[];
}

export function DetailsDialog({
  open,
  onClose,
  initial,
  editMode = false,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  knownGroups = [],
}: DetailsDialogProps) {
  const [saving, setSaving] = useState(false);
  const [groupInput, setGroupInput] = useState("");
  const [groupSelectedIndex, setGroupSelectedIndex] = useState(-1);
  const groupInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: initial.book.title,
    number: initial.book.number,
    publisher: initial.book.publisher ?? "",
    published_date: initial.book.published_date ?? "",
    description: initial.book.description ?? "",
    page_count: initial.book.page_count,
    language: initial.book.language ?? "",
    authors: initial.authors.map((a) => a.name.trim()).join(", "),
    groups: initial.book.groups.join(", "),
  });

  useEffect(() => {
    setForm({
      title: initial.book.title,
      number: initial.book.number,
      publisher: initial.book.publisher ?? "",
      published_date: initial.book.published_date ?? "",
      description: initial.book.description ?? "",
      page_count: initial.book.page_count,
      language: initial.book.language ?? "",
      authors: initial.authors.map((a) => a.name.trim()).join(", "),
      groups: initial.book.groups.join(", "),
    });
    setGroupInput("");
    setGroupSelectedIndex(-1);
  }, [initial, editMode]);

  const currentGroups = useMemo(
    () =>
      form.groups
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [form.groups],
  );

  const allKnownGroups = useMemo(
    () => Array.from(new Set([...knownGroups, ...initial.book.groups])),
    [knownGroups, initial.book.groups],
  );

  const filteredGroupSuggestions = useMemo(
    () =>
      allKnownGroups.filter(
        (group) =>
          groupInput.trim() &&
          group.toLowerCase().includes(groupInput.toLowerCase()) &&
          !currentGroups.includes(group),
      ),
    [allKnownGroups, groupInput, currentGroups],
  );

  useEffect(() => {
    setGroupSelectedIndex(-1);
  }, [groupInput]);

  const handleGroupAdd = (group: string) => {
    if (!currentGroups.includes(group)) {
      const newGroups = [...currentGroups, group].join(", ");
      setForm((f) => ({ ...f, groups: newGroups }));
    }
    setGroupInput("");
    setGroupSelectedIndex(-1);
  };

  const handleGroupRemove = (group: string) => {
    const newGroups = currentGroups.filter((g) => g !== group).join(", ");
    setForm((f) => ({ ...f, groups: newGroups }));
  };

  const handleGroupKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredGroupSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setGroupSelectedIndex((prev) =>
          prev < filteredGroupSuggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setGroupSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (groupSelectedIndex >= 0) {
          handleGroupAdd(filteredGroupSuggestions[groupSelectedIndex]);
        } else if (groupInput.trim()) {
          handleGroupAdd(groupInput.trim());
        }
        return;
      }
    } else if (e.key === "Enter" && groupInput.trim()) {
      e.preventDefault();
      handleGroupAdd(groupInput.trim());
    }
  };

  const dirty = useMemo(() => {
    const authorsArr = form.authors
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const origAuthors = initial.authors.map((a) => a.name.trim());
    const eqAuthors =
      authorsArr.length === origAuthors.length &&
      authorsArr.every((a, i) => a === origAuthors[i]);

    const groupsArr = form.groups
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const origGroups = initial.book.groups;
    const eqGroups =
      groupsArr.length === origGroups.length &&
      groupsArr.every((g, i) => g === origGroups[i]);

    return !(
      form.title === initial.book.title &&
      form.number === initial.book.number &&
      (form.publisher || "") === (initial.book.publisher || "") &&
      (form.published_date || "") === (initial.book.published_date || "") &&
      (form.description || "") === (initial.book.description || "") &&
      form.page_count === initial.book.page_count &&
      (form.language || "") === (initial.book.language || "") &&
      eqAuthors &&
      eqGroups
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
      const groupsArr = form.groups
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await invoke("update_book", {
        payload: {
          volume_id: initial.book.volume_id,
          title: form.title,
          number: form.number,
          publisher: form.publisher || null,
          published_date: form.published_date || null,
          description: form.description || null,
          page_count: form.page_count,
          language: form.language || null,
          authors: authorsArr,
          groups: groupsArr,
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
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative w-full max-w-3xl mx-4 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="rounded-xl bg-white dark:bg-zinc-800 shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onNext}
                disabled={!hasNext}
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="min-w-0 flex-1 px-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                {form.title}
                {form.number && <> - {form.number}</>}
              </h2>
              <h2 className="text-md font-medium text-gray-900 dark:text-gray-200 truncate">
                {form.authors}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {initial.book.volume_id.slice(0, 12)} ·{" "}
                {initial.isbns.join(", ")} ·{" "}
                {form.language || "Unknown language"}
              </p>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <button
                className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-[180px,1fr] gap-8 p-6 max-h-[calc(100dvh-16rem)] overflow-y-hidden">
            <div className="flex flex-row gap-4">
              <div className="w-[180px] aspect-2/3 overflow-hidden rounded-xl bg-linear-to-br from-gray-100 dark:from-zinc-700 to-gray-200 dark:to-zinc-800 ring-1 ring-gray-300/50 dark:ring-white/10 shadow-sm">
                {initial.thumbnail ? (
                  <img
                    src={initial.thumbnail}
                    alt={initial.book.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-gray-400 dark:text-gray-500">
                    No cover
                  </div>
                )}
              </div>
              <div className="flex-1 rounded-xl bg-linear-to-br from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 p-4 text-sm ring-1 ring-blue-100 dark:ring-blue-500/20 shadow-sm">
                <div className="space-y-2.5">
                  <InfoRow label="Pages" value={initial.book.page_count} />
                  <div className="h-px bg-blue-100/50 dark:bg-blue-500/20" />
                  <InfoRow label="Publisher" value={initial.book.publisher} />
                  <div className="h-px bg-blue-100/50 dark:bg-blue-500/20" />
                  <InfoRow label="Year" value={initial.book.published_date} />
                  <div className="h-px bg-blue-100/50 dark:bg-blue-500/20" />
                  <InfoRow label="Print Type" value={initial.book.print_type} />
                  <div className="h-px bg-blue-100/50 dark:bg-blue-500/20" />
                  <InfoRow label="Language" value={initial.book.language} />
                </div>
              </div>
            </div>

            {editMode ? (
              <div className="space-y-5 max-h-[400px] overflow-y-scroll">
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Title"
                    value={form.title}
                    onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                  />
                  <Field
                    label="Number"
                    value={form.number}
                    type="number"
                    step="1"
                    onChange={(v) => {
                      const value = v === "" ? undefined : parseInt(v, 10);
                      if (value !== undefined) {
                        setForm((f) => ({ ...f, number: value }));
                      }
                    }}
                  />
                </div>
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

                <div className="block group">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Groups
                  </span>
                  <div className="relative">
                    <input
                      ref={groupInputRef}
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      value={groupInput}
                      onChange={(e) => setGroupInput(e.target.value)}
                      onKeyDown={handleGroupKeyDown}
                      placeholder="Add a group..."
                      className={cn(
                        "w-full rounded-lg border border-gray-300 dark:border-zinc-600 px-3.5 py-2.5 text-sm outline-none transition-all",
                        "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                        "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white",
                        "focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20",
                      )}
                    />
                    {filteredGroupSuggestions.length > 0 && (
                      <div
                        className={cn(
                          "absolute top-full left-0 right-0 mt-2 rounded-lg z-10",
                          "bg-white dark:bg-zinc-700",
                          "border border-gray-300 dark:border-zinc-600",
                          "shadow-lg max-h-48 overflow-y-auto",
                        )}
                      >
                        {filteredGroupSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleGroupAdd(suggestion)}
                            className={cn(
                              "w-full text-left px-3 py-2",
                              "text-sm text-gray-900 dark:text-white",
                              "transition-colors",
                              "first:rounded-t-lg last:rounded-b-lg",
                              groupSelectedIndex === index
                                ? "bg-blue-500 text-white"
                                : "hover:bg-gray-100 dark:hover:bg-zinc-600",
                            )}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentGroups.map((group) => (
                      <span
                        key={group}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
                          "text-xs font-medium transition-all duration-300",
                          getColorForGroup(group),
                        )}
                      >
                        {group}
                        <button
                          type="button"
                          onClick={() => handleGroupRemove(group)}
                          className={cn(
                            "rounded-full p-0.5",
                            "hover:bg-black/10 dark:hover:bg-white/10",
                            "transition-colors",
                          )}
                          aria-label={`Remove ${group}`}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <TextArea
                  label="Description"
                  value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Pages"
                    value={form.page_count}
                    type="number"
                    step="1"
                    onChange={(v) => {
                      const value = v === "" ? undefined : parseInt(v, 10);
                      if (value !== undefined) {
                        setForm((f) => ({ ...f, page_count: value }));
                      }
                    }}
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
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Title" value={form.title} />
                  <ViewField label="Number" value={form.number} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Publisher" value={form.publisher} />
                  <ViewField label="Year" value={form.published_date} />
                </div>
                <ViewField label="Authors" value={form.authors} />
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Groups
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {initial.book.groups.length > 0 ? (
                      initial.book.groups.map((group) => (
                        <span
                          key={group}
                          className={cn(
                            "inline-flex items-center rounded-full px-3 py-1.5",
                            "text-xs font-medium transition-all duration-300",
                            getColorForGroup(group),
                          )}
                        >
                          {group}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-900 dark:text-gray-100 text-sm">
                        —
                      </span>
                    )}
                  </div>
                </div>
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
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50">
            <button
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
              onClick={onClose}
            >
              Close
            </button>
            {editMode && (
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
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
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type,
  step,
}: {
  label: string;
  value?: string | number;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  step?: React.InputHTMLAttributes<HTMLInputElement>["step"];
}) {
  return (
    <label className="block group">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <input
        className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-zinc-800 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:border-gray-200 dark:disabled:border-zinc-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        type={type}
        step={step}
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
      <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <textarea
        className="min-h-32 w-full resize-y rounded-lg border border-gray-300 dark:border-zinc-600 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-zinc-800 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:border-gray-200 dark:disabled:border-zinc-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
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
      <span className="text-gray-600 dark:text-gray-400 font-medium">
        {label}
      </span>
      <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
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
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </h3>
      <p
        className={`text-gray-900 dark:text-gray-100 text-sm ${
          multiline ? "whitespace-pre-wrap" : ""
        }`}
      >
        {isLink && value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all"
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
