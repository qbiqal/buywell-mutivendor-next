"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./TagSelector.module.css";

interface TagRow {
  id: string;
  name: string;
  color: string;
  moduleKey: string;
}

interface TagSelectorProps {
  moduleKey: "blog" | "product" | "cms" | "seo";
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function TagSelector({
  moduleKey,
  value,
  onChange,
  label = "Tags",
  placeholder = "Type to search or create",
}: TagSelectorProps) {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/tags?module=${moduleKey}`)
      .then((res) => res.json())
      .then((json) => { if (json.success) setTags(json.data); })
      .catch(() => {});
  }, [moduleKey]);

  const selected = useMemo(() => new Set(value.map((tag) => tag.toLowerCase())), [value]);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tags
      .filter((tag) => !selected.has(tag.name.toLowerCase()))
      .filter((tag) => !term || tag.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [query, selected, tags]);
  const canCreate = query.trim().length > 0 && !tags.some((tag) => tag.name.toLowerCase() === query.trim().toLowerCase());

  function add(name: string) {
    const next = name.trim();
    if (!next || selected.has(next.toLowerCase())) return;
    onChange([...value, next]);
    setQuery("");
  }

  function remove(name: string) {
    onChange(value.filter((tag) => tag !== name));
  }

  async function createTag() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, name }),
      });
      const json = await res.json();
      if (json.success) {
        setTags((current) => current.some((tag) => tag.id === json.data.id) ? current : [...current, json.data]);
        add(json.data.name);
      }
    } finally {
      setCreating(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (matches[0]) add(matches[0].name);
      else if (canCreate) createTag();
    }
    if (event.key === "Backspace" && !query && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{label}</span>
      <div className={styles.box}>
        <div className={styles.chips}>
          {value.map((tag) => {
            const known = tags.find((row) => row.name.toLowerCase() === tag.toLowerCase());
            return (
              <button
                type="button"
                key={tag}
                className={styles.chip}
                style={{ ["--tag-color" as string]: known?.color ?? colorForName(tag) }}
                onClick={() => remove(tag)}
                title={`Remove ${tag}`}
              >
                <span>{tag}</span>
                <strong>x</strong>
              </button>
            );
          })}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
          />
        </div>
        {(query || matches.length > 0) && (
          <div className={styles.suggestions}>
            {matches.map((tag) => (
              <button type="button" key={tag.id} onClick={() => add(tag.name)}>
                <span className={styles.swatch} style={{ background: tag.color }} />
                {tag.name}
              </button>
            ))}
            {canCreate && (
              <button type="button" className={styles.createBtn} onClick={createTag} disabled={creating}>
                Create "{query.trim()}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function colorForName(value: string): string {
  const colors = ["#D97706", "#16A34A", "#2563EB", "#C026D3", "#DC2626", "#0891B2"];
  const sum = Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
}
