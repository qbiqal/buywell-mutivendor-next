"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./NestedCategoryPicker.module.css";

export interface NestedCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  color?: string | null;
  sortOrder?: number;
}

interface NestedCategoryPickerProps {
  endpoint: string;
  value: string;
  onChange: (categoryId: string) => void;
  label?: string;
  emptyLabel?: string;
  defaultColor?: string;
}

export function NestedCategoryPicker({
  endpoint,
  value,
  onChange,
  label = "Category",
  emptyLabel = "Uncategorized",
  defaultColor = "#D97706",
}: NestedCategoryPickerProps) {
  const [categories, setCategories] = useState<NestedCategory[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [saving, setSaving] = useState(false);

  async function load() {
    const json = await fetch(endpoint).then((res) => res.json());
    if (json.success) setCategories(json.data);
  }

  useEffect(() => { load().catch(() => {}); }, [endpoint]);

  const options = useMemo(() => flattenCategories(categories), [categories]);

  async function createCategory() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, parentId: parentId || null, color }),
      });
      const json = await res.json();
      if (json.success) {
        await load();
        onChange(json.data.id);
        setName("");
        setParentId("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <label className={styles.field}>
        <span>{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{emptyLabel}</option>
          {options.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.creator}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New category name" />
        <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
          <option value="">Top level</option>
          {options.map((category) => (
            <option key={category.id} value={category.id}>{category.label}</option>
          ))}
        </select>
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Category color" />
        <button type="button" onClick={createCategory} disabled={saving || !name.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}

function flattenCategories(categories: NestedCategory[]) {
  const byParent = new Map<string, NestedCategory[]>();
  for (const category of categories) {
    const key = category.parentId || "root";
    byParent.set(key, [...(byParent.get(key) ?? []), category]);
  }
  for (const group of byParent.values()) {
    group.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  }
  const result: Array<NestedCategory & { label: string }> = [];
  function walk(parentId: string, depth: number) {
    for (const category of byParent.get(parentId) ?? []) {
      result.push({ ...category, label: `${"  ".repeat(depth)}${depth > 0 ? "- " : ""}${category.name}` });
      walk(category.id, depth + 1);
    }
  }
  walk("root", 0);
  return result;
}
