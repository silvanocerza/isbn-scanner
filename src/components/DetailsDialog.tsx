import { cn, getColorForGroup } from "../utils";
import { useEffect, useMemo, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Save, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Book } from "../types";

export interface DetailsDialogProps {
  open: boolean;
  onClose: () => void;
  initial: Book;
  editMode?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  knownGroups?: string[];
  knownCustomFields?: string[];
  knownSeries?: string[];
  onDelete?: () => void;
  onSaveComplete?: (book: Book) => void;
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
  knownCustomFields = [],
  knownSeries = [],
  onDelete,
  onSaveComplete,
}: DetailsDialogProps) {
  const [saving, setSaving] = useState(false);
  const [groupInput, setGroupInput] = useState("");
  const [groupSelectedIndex, setGroupSelectedIndex] = useState(-1);
  const groupInputRef = useRef<HTMLInputElement>(null);

  const [customFieldInput, setCustomFieldInput] = useState("");
  const [customFieldSelectedIndex, setCustomFieldSelectedIndex] = useState(-1);
  const customFieldInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: initial.title,
    series: initial.series ?? "",
    number: initial.number,
    publisher: initial.publisher ?? "",
    published_date: initial.published_date ?? "",
    description: initial.description ?? "",
    page_count: initial.page_count,
    language: initial.language ?? "",
    authors: initial.authors.map((a) => a.trim()).join(", "),
    groups: initial.groups.join(", "),
    custom_fields: { ...initial.custom_fields },
  });

  useEffect(() => {
    setForm({
      title: initial.title,
      series: initial.series ?? "",
      number: initial.number,
      publisher: initial.publisher ?? "",
      published_date: initial.published_date ?? "",
      description: initial.description ?? "",
      page_count: initial.page_count,
      language: initial.language ?? "",
      authors: initial.authors.map((a) => a.trim()).join(", "),
      groups: initial.groups.join(", "),
      custom_fields: { ...initial.custom_fields },
    });
    setGroupInput("");
    setGroupSelectedIndex(-1);
    setCustomFieldInput("");
    setCustomFieldSelectedIndex(-1);
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
    () => Array.from(new Set([...knownGroups, ...initial.groups])),
    [knownGroups, initial.groups],
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

  const currentCustomFields = useMemo(
    () => Object.keys(form.custom_fields),
    [form.custom_fields],
  );

  const allKnownCustomFields = useMemo(
    () =>
      Array.from(
        new Set([...knownCustomFields, ...Object.keys(initial.custom_fields)]),
      ),
    [knownCustomFields, initial.custom_fields],
  );

  const filteredCustomFieldSuggestions = useMemo(
    () =>
      allKnownCustomFields.filter(
        (field) =>
          customFieldInput.trim() &&
          field.toLowerCase().includes(customFieldInput.toLowerCase()) &&
          !currentCustomFields.includes(field),
      ),
    [allKnownCustomFields, customFieldInput, currentCustomFields],
  );

  useEffect(() => {
    setGroupSelectedIndex(-1);
  }, [groupInput]);

  useEffect(() => {
    setCustomFieldSelectedIndex(-1);
  }, [customFieldInput]);

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

  const handleCustomFieldAdd = (fieldName: string) => {
    if (!currentCustomFields.includes(fieldName)) {
      setForm((f) => ({
        ...f,
        custom_fields: { ...f.custom_fields, [fieldName]: "" },
      }));
    }
    setCustomFieldInput("");
    setCustomFieldSelectedIndex(-1);
  };

  const handleCustomFieldRemove = (fieldName: string) => {
    setForm((f) => {
      const newFields = { ...f.custom_fields };
      delete newFields[fieldName];
      return { ...f, custom_fields: newFields };
    });
  };

  const handleCustomFieldValueChange = (fieldName: string, value: string) => {
    setForm((f) => ({
      ...f,
      custom_fields: { ...f.custom_fields, [fieldName]: value },
    }));
  };

  const handleCustomFieldKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (filteredCustomFieldSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCustomFieldSelectedIndex((prev) =>
          prev < filteredCustomFieldSuggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCustomFieldSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (customFieldSelectedIndex >= 0) {
          handleCustomFieldAdd(
            filteredCustomFieldSuggestions[customFieldSelectedIndex],
          );
        } else if (customFieldInput.trim()) {
          handleCustomFieldAdd(customFieldInput.trim());
        }
        return;
      }
    } else if (e.key === "Enter" && customFieldInput.trim()) {
      e.preventDefault();
      handleCustomFieldAdd(customFieldInput.trim());
    }
  };

  const dirty = useMemo(() => {
    const authorsArr = form.authors
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const origAuthors = initial.authors.map((a) => a.trim());
    const eqAuthors =
      authorsArr.length === origAuthors.length &&
      authorsArr.every((a, i) => a === origAuthors[i]);

    const groupsArr = form.groups
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const origGroups = initial.groups;
    const eqGroups =
      groupsArr.length === origGroups.length &&
      groupsArr.every((g, i) => g === origGroups[i]);

    const origCustomFields = initial.custom_fields;
    const eqCustomFields =
      Object.keys(form.custom_fields).length ===
        Object.keys(origCustomFields).length &&
      Object.keys(form.custom_fields).every(
        (key) => form.custom_fields[key] === origCustomFields[key],
      );

    return !(
      form.title === initial.title &&
      form.number === initial.number &&
      form.series === initial.series &&
      (form.publisher || "") === (initial.publisher || "") &&
      (form.published_date || "") === (initial.published_date || "") &&
      (form.description || "") === (initial.description || "") &&
      form.page_count === initial.page_count &&
      (form.language || "") === (initial.language || "") &&
      eqAuthors &&
      eqGroups &&
      eqCustomFields
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
          volume_id: initial.volume_id,
          title: form.title,
          series: form.series || null,
          number: form.number,
          publisher: form.publisher || null,
          published_date: form.published_date || null,
          description: form.description || null,
          page_count: form.page_count,
          language: form.language || null,
          authors: authorsArr,
          groups: groupsArr,
          custom_fields: form.custom_fields,
        },
      });
      const updatedBook: Book = {
        ...initial,
        title: form.title,
        series: form.series.trim() || undefined,
        number: form.number,
        publisher: form.publisher.trim() || undefined,
        published_date: form.published_date.trim() || undefined,
        description: form.description.trim() || undefined,
        page_count: form.page_count,
        language: form.language.trim() || undefined,
        authors: authorsArr,
        groups: groupsArr,
        custom_fields: form.custom_fields,
      };
      onSaveComplete?.(updatedBook);
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
                {initial.volume_id.slice(0, 12)} · {initial.isbns.join(", ")} ·{" "}
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
                    alt={initial.title}
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
                  <InfoRow label="Pages" value={initial.page_count} />
                  <div className="h-px bg-blue-100/50 dark:bg-blue-500/20" />
                  <InfoRow label="Publisher" value={initial.publisher} />
                  <div className="h-px bg-blue-100/50 dark:bg-blue-500/20" />
                  <InfoRow label="Year" value={initial.published_date} />
                  <div className="h-px bg-blue-100/50 dark:bg-blue-500/20" />
                  <InfoRow label="Print Type" value={initial.print_type} />
                  <div className="h-px bg-blue-100/50 dark:bg-blue-500/20" />
                  <InfoRow label="Language" value={initial.language} />
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
                    label="Series"
                    value={form.series}
                    onChange={(v) => setForm((f) => ({ ...f, series: v }))}
                    suggestions={knownSeries}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    type="number"
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

                <div className="block group">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Custom Fields
                  </span>
                  <div className="relative">
                    <input
                      ref={customFieldInputRef}
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      value={customFieldInput}
                      onChange={(e) => setCustomFieldInput(e.target.value)}
                      onKeyDown={handleCustomFieldKeyDown}
                      placeholder="Add a custom field..."
                      className={cn(
                        "w-full rounded-lg border border-gray-300 dark:border-zinc-600 px-3.5 py-2.5 text-sm outline-none transition-all",
                        "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                        "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white",
                        "focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20",
                      )}
                    />
                    {filteredCustomFieldSuggestions.length > 0 && (
                      <div
                        className={cn(
                          "absolute top-full left-0 right-0 mt-2 rounded-lg z-10",
                          "bg-white dark:bg-zinc-700",
                          "border border-gray-300 dark:border-zinc-600",
                          "shadow-lg max-h-48 overflow-y-auto",
                        )}
                      >
                        {filteredCustomFieldSuggestions.map(
                          (suggestion, index) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => handleCustomFieldAdd(suggestion)}
                              className={cn(
                                "w-full text-left px-3 py-2",
                                "text-sm text-gray-900 dark:text-white",
                                "transition-colors",
                                "first:rounded-t-lg last:rounded-b-lg",
                                customFieldSelectedIndex === index
                                  ? "bg-blue-500 text-white"
                                  : "hover:bg-gray-100 dark:hover:bg-zinc-600",
                              )}
                            >
                              {suggestion}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 mt-2">
                    {currentCustomFields.map((fieldName) => (
                      <div
                        key={fieldName}
                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-zinc-700/50"
                      >
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">
                          {fieldName}
                        </span>
                        <input
                          type="text"
                          value={form.custom_fields[fieldName]}
                          onChange={(e) =>
                            handleCustomFieldValueChange(
                              fieldName,
                              e.target.value,
                            )
                          }
                          className={cn(
                            "flex-1 rounded-lg border border-gray-300 dark:border-zinc-600 px-3 py-1.5 text-sm outline-none transition-all",
                            "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                            "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white",
                            "focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20",
                          )}
                          placeholder="Value..."
                        />
                        <button
                          type="button"
                          onClick={() => handleCustomFieldRemove(fieldName)}
                          className={cn(
                            "rounded-full p-1.5",
                            "text-gray-500 dark:text-gray-400",
                            "hover:bg-red-100 dark:hover:bg-red-900/30",
                            "hover:text-red-600 dark:hover:text-red-400",
                            "transition-colors",
                          )}
                          aria-label={`Remove ${fieldName}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
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
                    value={initial.print_type ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Maturity Rating"
                    value={initial.maturity_rating ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Country"
                    value={initial.country ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Saleability"
                    value={initial.saleability ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Viewability"
                    value={initial.viewability ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Text to Speech"
                    value={initial.text_to_speech_permission ?? ""}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <Field
                  label="Access View Status"
                  value={initial.access_view_status ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <div className="grid grid-cols-3 gap-4">
                  <Field
                    label="Is Ebook"
                    value={initial.is_ebook ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Public Domain"
                    value={initial.public_domain ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Embeddable"
                    value={initial.embeddable ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field
                    label="EPUB Available"
                    value={initial.epub_available ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="PDF Available"
                    value={initial.pdf_available ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                  <Field
                    label="Quote Sharing"
                    value={initial.quote_sharing_allowed ? "Yes" : "No"}
                    onChange={() => {}}
                    disabled
                  />
                </div>

                <ViewField
                  label="Preview Link"
                  value={initial.preview_link}
                  isLink
                />
                <ViewField label="Info Link" value={initial.info_link} isLink />
                <ViewField
                  label="Canonical Link"
                  value={initial.canonical_link}
                  isLink
                />
                <ViewField
                  label="Web Reader Link"
                  value={initial.web_reader_link}
                  isLink
                />
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Title" value={form.title} />
                  <ViewField label="Series" value={form.series} />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    {initial.groups.length > 0 ? (
                      initial.groups.map((group) => (
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
                {Object.keys(initial.custom_fields).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Custom Fields
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(initial.custom_fields).map(
                        ([fieldName, value]) => (
                          <div
                            key={fieldName}
                            className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-zinc-700/50"
                          >
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">
                              {fieldName}
                            </span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {value || "—"}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
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
                  <ViewField label="Print Type" value={initial.print_type} />
                  <ViewField
                    label="Maturity Rating"
                    value={initial.maturity_rating}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Country" value={initial.country} />
                  <ViewField label="Saleability" value={initial.saleability} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <ViewField
                    label="Is Ebook"
                    value={initial.is_ebook ? "Yes" : "No"}
                  />
                  <ViewField
                    label="Public Domain"
                    value={initial.public_domain ? "Yes" : "No"}
                  />
                  <ViewField
                    label="Embeddable"
                    value={initial.embeddable ? "Yes" : "No"}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <ViewField
                    label="EPUB Available"
                    value={initial.epub_available ? "Yes" : "No"}
                  />
                  <ViewField
                    label="PDF Available"
                    value={initial.pdf_available ? "Yes" : "No"}
                  />
                  <ViewField
                    label="Quote Sharing Allowed"
                    value={initial.quote_sharing_allowed ? "Yes" : "No"}
                  />
                </div>
                <ViewField
                  label="Text to Speech"
                  value={initial.text_to_speech_permission}
                />
                <ViewField label="Viewability" value={initial.viewability} />
                <ViewField
                  label="Access View Status"
                  value={initial.access_view_status}
                />
                <ViewField
                  label="Preview Link"
                  value={initial.preview_link}
                  isLink
                />
                <ViewField label="Info Link" value={initial.info_link} isLink />
                <ViewField
                  label="Canonical Link"
                  value={initial.canonical_link}
                  isLink
                />
                <ViewField
                  label="Web Reader Link"
                  value={initial.web_reader_link}
                  isLink
                />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50">
            <div className="flex items-center">
              {editMode && onDelete && (
                <button
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  onClick={onDelete}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
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
  suggestions,
}: {
  label: string;
  value?: string | number;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  step?: React.InputHTMLAttributes<HTMLInputElement>["step"];
  suggestions?: string[];
}) {
  const [inputValue, setInputValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions?.filter(
    (s) =>
      inputValue.trim() &&
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      s !== value,
  );

  useEffect(() => {
    setInputValue(String(value ?? ""));
  }, [value]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredSuggestions && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0) {
          onChange(filteredSuggestions[selectedIndex]);
          setInputValue(filteredSuggestions[selectedIndex]);
        } else if (inputValue.trim()) {
          onChange(inputValue.trim());
        }
        return;
      } else if (e.key === "Escape") {
        setSelectedIndex(-1);
        return;
      }
    } else if (e.key === "Enter" && inputValue.trim()) {
      onChange(inputValue.trim());
    }
  };

  return (
    <label className="block group relative">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <input
        ref={inputRef}
        autoComplete="off"
        autoCorrect="off"
        className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-zinc-800 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:border-gray-200 dark:disabled:border-zinc-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
        value={inputValue}
        onChange={(e) => {
          const value =
            type === "number"
              ? e.target.value.replace(/\D/g, "")
              : e.target.value;
          setInputValue(value);
          onChange(value);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        type="text"
        step={step}
      />
      {filteredSuggestions && filteredSuggestions.length > 0 && (
        <div
          className={cn(
            "absolute top-full left-0 right-0 mt-1 rounded-lg",
            "bg-white dark:bg-zinc-700",
            "border border-zinc-200 dark:border-zinc-600",
            "shadow-lg z-20",
          )}
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                onChange(suggestion);
                setInputValue(suggestion);
              }}
              className={cn(
                "w-full text-left px-3 py-2",
                "text-sm text-gray-900 dark:text-white",
                "transition-colors",
                "first:rounded-t-lg last:rounded-b-lg",
                selectedIndex === index
                  ? "bg-blue-500 text-white"
                  : "hover:bg-gray-100 dark:hover:bg-zinc-600",
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
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
