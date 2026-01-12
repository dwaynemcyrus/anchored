"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./TagInput.module.css";

export type TagInputProps = {
  /** Comma-separated tags string */
  value: string;
  /** Called with updated comma-separated tags string */
  onChange: (value: string) => void;
  /** All available tags for autocomplete */
  suggestions?: string[];
  /** Placeholder text */
  placeholder?: string;
  /** Input id for label association */
  id?: string;
};

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add tag...",
  id,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse comma-separated string to array
  const tags = useMemo(() => {
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [value]);

  // Filter suggestions based on input and exclude already added tags
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const query = inputValue.toLowerCase();
    return suggestions
      .filter(
        (s) =>
          s.toLowerCase().includes(query) &&
          !tags.includes(s)
      )
      .slice(0, 6);
  }, [inputValue, suggestions, tags]);

  // Update parent with new tags array
  const updateTags = useCallback(
    (newTags: string[]) => {
      onChange(newTags.join(", "));
    },
    [onChange]
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().toLowerCase();
      if (!trimmed || tags.includes(trimmed)) return;
      updateTags([...tags, trimmed]);
      setInputValue("");
      setShowSuggestions(false);
      setSelectedIndex(0);
    },
    [tags, updateTags]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      updateTags(tags.filter((t) => t !== tagToRemove));
    },
    [tags, updateTags]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredSuggestions.length > 0 && showSuggestions) {
          addTag(filteredSuggestions[selectedIndex]);
        } else if (inputValue.trim()) {
          addTag(inputValue);
        }
      } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      } else if (e.key === "ArrowDown" && showSuggestions) {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp" && showSuggestions) {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      } else if (e.key === ",") {
        e.preventDefault();
        if (inputValue.trim()) {
          addTag(inputValue);
        }
      }
    },
    [
      inputValue,
      tags,
      filteredSuggestions,
      showSuggestions,
      selectedIndex,
      addTag,
      removeTag,
    ]
  );

  // Show suggestions when typing
  useEffect(() => {
    if (inputValue.trim() && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [inputValue, filteredSuggestions.length]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        className={styles.inputWrapper}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
            <button
              type="button"
              className={styles.removeButton}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim() && filteredSuggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
          autoComplete="off"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className={styles.suggestions}>
          {filteredSuggestions.map((suggestion, index) => (
            <li key={suggestion}>
              <button
                type="button"
                className={`${styles.suggestion} ${
                  index === selectedIndex ? styles.suggestionSelected : ""
                }`}
                onClick={() => addTag(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
