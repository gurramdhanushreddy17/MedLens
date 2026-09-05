"use client";

import { useState, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  id?: string;
  label: string;
  placeholder?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  noneOption?: string; // e.g. "No known allergies"
  noneSelected?: boolean;
  onNoneChange?: (selected: boolean) => void;
  error?: string;
}

export function TagInput({
  id,
  label,
  placeholder,
  tags,
  onChange,
  disabled = false,
  noneOption,
  noneSelected = false,
  onNoneChange,
  error,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const inputId = id ?? `tag-input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-ink/70 block">
        {label}
      </label>

      {/* None option checkbox */}
      {noneOption && (
        <label className="flex items-center gap-2 text-xs text-ink/70 cursor-pointer">
          <input
            type="checkbox"
            checked={noneSelected}
            onChange={(e) => {
              onNoneChange?.(e.target.checked);
              if (e.target.checked) onChange([]);
            }}
            className="rounded border-line text-accent focus:ring-accent/30 focus:ring-2"
          />
          {noneOption}
        </label>
      )}

      {!noneSelected && (
        <div
          className={cn(
            "min-h-[2.5rem] flex flex-wrap gap-1.5 p-2 border rounded",
            "focus-within:outline focus-within:outline-2 focus-within:outline-accent",
            error ? "border-flag-high" : "border-line",
            disabled && "bg-ink/5 cursor-not-allowed"
          )}
          role="group"
          aria-label={label}
        >
          {/* Tags */}
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent border border-accent/20 rounded px-2 py-0.5"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-accent/60 hover:text-accent transition-colors ml-0.5"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}

          {/* Input */}
          {!disabled && (
            <input
              id={inputId}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
              placeholder={tags.length === 0 ? (placeholder ?? "Type and press Enter…") : "Add more…"}
              className="flex-1 min-w-24 text-xs bg-transparent outline-none placeholder:text-ink/30 text-ink"
              aria-invalid={!!error}
              aria-describedby={error ? `${inputId}-error` : undefined}
            />
          )}

          {/* Add button */}
          {!disabled && inputValue.trim() && (
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
              aria-label="Add tag"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {error && (
        <p id={`${inputId}-error`} className="text-xs text-flag-high" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
