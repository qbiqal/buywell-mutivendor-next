"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { AvailableMenuTarget, MenuKey } from "@/lib/cms";
import styles from "./menu-manager.module.css";

interface MenuRecord {
  id: string;
  menuKey: MenuKey;
  label: string;
  isEnabled: boolean;
  items: MenuItemDraft[];
}

interface MenuItemDraft {
  id: string;
  label: string;
  href: string;
  itemType: string;
  targetId?: string;
  opensNewTab: boolean;
  isEnabled: boolean;
  pageId?: string | null;
  blogPostId?: string | null;
  productId?: string | null;
}

const MENU_LABELS: Record<MenuKey, string> = {
  landing_header: "Landing Header",
  site_header: "Other Pages Header",
  footer: "Footer",
};

const MENU_KEYS: MenuKey[] = ["landing_header", "site_header", "footer"];

export default function MenuManagerClient() {
  const { success, error: showError } = useToast();
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [targets, setTargets] = useState<AvailableMenuTarget[]>([]);
  const [activeKey, setActiveKey] = useState<MenuKey>("landing_header");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [externalLabel, setExternalLabel] = useState("");
  const [externalHref, setExternalHref] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    fetch("/api/admin/cms/menus")
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) return;
        setMenus(json.data.menus.map((menu: MenuRecord) => ({
          ...menu,
          items: menu.items.map((item) => ({
            ...item,
            targetId: item.pageId ?? item.blogPostId ?? item.productId ?? undefined,
          })),
        })));
        setTargets(json.data.targets);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeMenu = useMemo(
    () => menus.find((menu) => menu.menuKey === activeKey),
    [menus, activeKey],
  );

  function updateActiveItems(updater: (items: MenuItemDraft[]) => MenuItemDraft[]) {
    setMenus((current) => current.map((menu) => (
      menu.menuKey === activeKey ? { ...menu, items: updater(menu.items) } : menu
    )));
  }

  function addTarget(target: AvailableMenuTarget) {
    updateActiveItems((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        label: target.label,
        href: target.href,
        itemType: target.type,
        targetId: target.id,
        opensNewTab: false,
        isEnabled: true,
      },
    ]);
  }

  function addExternal() {
    if (!externalLabel.trim() || !externalHref.trim()) {
      showError("External link needs a label and URL");
      return;
    }
    updateActiveItems((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        label: externalLabel.trim(),
        href: externalHref.trim(),
        itemType: "external",
        opensNewTab: /^https?:\/\//i.test(externalHref),
        isEnabled: true,
      },
    ]);
    setExternalLabel("");
    setExternalHref("");
  }

  function removeItem(id: string) {
    updateActiveItems((items) => items.filter((item) => item.id !== id));
  }

  function updateItem(id: string, patch: Partial<MenuItemDraft>) {
    updateActiveItems((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    updateActiveItems((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  async function saveMenu() {
    if (!activeMenu) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms/menus", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuKey: activeMenu.menuKey,
          isEnabled: activeMenu.isEnabled,
          items: activeMenu.items,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        showError(json.error ?? "Save failed");
        return;
      }
      success("Menu saved");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !activeMenu) return <div className={styles.loadingWrap}><Spinner size="lg" /></div>;

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1 className="admin-page-title">Menu Management</h1>
          <p className="admin-page-subtitle">Build header and footer menus from CMS pages, blog content, products, landing anchors, or external links</p>
        </div>
        <Button variant="primary" loading={saving} onClick={saveMenu}>Save Menu</Button>
      </div>

      <div className={styles.tabs}>
        {MENU_KEYS.map((key) => (
          <button key={key} className={activeKey === key ? styles.activeTab : ""} onClick={() => setActiveKey(key)}>
            {MENU_LABELS[key]}
          </button>
        ))}
      </div>

      <div className={styles.workspace}>
        <aside className={styles.library}>
          <div className={styles.libraryHeader}>
            <h2>Available Pages</h2>
            <span>{targets.length}</span>
          </div>
          <div className={styles.targetList}>
            {targets.map((target) => (
              <button key={`${target.type}-${target.id}`} className={styles.targetCard} onClick={() => addTarget(target)}>
                <strong>{target.label}</strong>
                <span>{target.href}</span>
                {target.meta && <em>{target.meta}</em>}
              </button>
            ))}
          </div>

          <div className={styles.externalBox}>
            <h2>External Link</h2>
            <Input label="Label" value={externalLabel} onChange={(e) => setExternalLabel(e.target.value)} placeholder="Instagram" />
            <Input label="URL" value={externalHref} onChange={(e) => setExternalHref(e.target.value)} placeholder="https://example.com" />
            <Button variant="outline" fullWidth onClick={addExternal}>Add External Link</Button>
          </div>
        </aside>

        <section className={styles.menuCanvas}>
          <div className={styles.canvasHeader}>
            <div>
              <h2>{activeMenu.label}</h2>
              <p>{activeMenu.items.length} menu items</p>
            </div>
            <label className={styles.enableToggle}>
              <input
                type="checkbox"
                checked={activeMenu.isEnabled}
                onChange={(e) => setMenus((current) => current.map((menu) => menu.menuKey === activeKey ? { ...menu, isEnabled: e.target.checked } : menu))}
              />
              Enabled
            </label>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={activeMenu.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className={styles.sortList}>
                {activeMenu.items.length === 0 ? (
                  <div className={styles.emptyCanvas}>Add pages or external links from the library.</div>
                ) : activeMenu.items.map((item) => (
                  <SortableMenuItem
                    key={item.id}
                    item={item}
                    onChange={(patch) => updateItem(item.id, patch)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      </div>
    </div>
  );
}

function SortableMenuItem({
  item,
  onChange,
  onRemove,
}: {
  item: MenuItemDraft;
  onChange: (patch: Partial<MenuItemDraft>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      className={[styles.menuItem, isDragging ? styles.dragging : ""].join(" ")}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button className={styles.dragHandle} type="button" {...attributes} {...listeners} aria-label="Drag menu item">::</button>
      <div className={styles.itemFields}>
        <Input label="Label" value={item.label} onChange={(e) => onChange({ label: e.target.value })} />
        <Input label="URL" value={item.href} onChange={(e) => onChange({ href: e.target.value })} />
      </div>
      <div className={styles.itemControls}>
        <label><input type="checkbox" checked={item.opensNewTab} onChange={(e) => onChange({ opensNewTab: e.target.checked })} /> New tab</label>
        <label><input type="checkbox" checked={item.isEnabled} onChange={(e) => onChange({ isEnabled: e.target.checked })} /> Enabled</label>
        <button type="button" onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}
