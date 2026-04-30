/**
 * CategoryTree Component
 *
 * Interactive collapsible tree view of the 3-level category hierarchy:
 *   Main → Sub → Variant.
 *
 * Features:
 *   - Drag-and-drop sorting within each level (mains, subs within a main, variants within a sub)
 *   - Each Main category card has a chevron to expand/collapse its Subs.
 *   - Each Sub category row has a chevron to expand/collapse its Variants.
 *   - Variants are leaf nodes (no toggle).
 *   - All sections start expanded by default.
 *   - Uses CSS transitions for smooth open/close feel.
 *
 * @component
 * @param {Object} props
 * @param {Category[]} props.categories - Flat list of all categories from Supabase
 *
 * @example
 * <CategoryTree categories={allCategories} />
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  GripVertical,
  Layers,
  Tag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Category } from "@/domain/types/category";
import CategoryTreeActions from "@/components/admin/CategoryTreeActions";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useAppStore } from "@/stores";

/** Thumbnail or fallback icon for a category row. */
function CategoryImage({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-10 h-10 rounded-lg object-cover border border-slate-200"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
      <Folder className="w-5 h-5 text-slate-400" />
    </div>
  );
}

/** Split flat list into mains, subs, variants. */
function buildHierarchy(categories: Category[]) {
  const mains = categories.filter((c) => !c.parent_id);
  const subs = categories.filter(
    (c) =>
      c.parent_id &&
      categories.find((p) => p.id === c.parent_id && !p.parent_id)
  );
  const variants = categories.filter((c) => {
    const parent = categories.find((p) => p.id === c.parent_id);
    return parent?.parent_id != null;
  });
  return { mains, subs, variants };
}

/** Sortable wrapper for any category row */
function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (props: {
    dragHandleProps: Record<string, any>;
    style: React.CSSProperties;
    ref: (node: HTMLElement | null) => void;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <>
      {children({
        dragHandleProps: { ...attributes, ...listeners },
        style,
        ref: setNodeRef,
      })}
    </>
  );
}

interface CategoryTreeProps {
  categories: Category[];
}

export default function CategoryTree({ categories }: CategoryTreeProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();
  const { mains, subs, variants } = buildHierarchy(categories);

  // Set of category ids that are currently EXPANDED.
  // Initialise with every main and sub id so tree starts fully open.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    mains.forEach((m) => ids.add(m.id));
    subs.forEach((s) => ids.add(s.id));
    return ids;
  });

  /** Toggle expand/collapse for a single category id. */
  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /** Persist new sort order to the API */
  const persistSortOrder = useCallback(
    async (items: Category[]) => {
      const payload = items.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));
      try {
        const res = await fetch("/api/categories/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: payload }),
        });
        if (!res.ok) throw new Error("Failed to save order");
        await queryClient.invalidateQueries({ queryKey: queryKeys.categories });
        showSuccess("Order updated");
      } catch {
        showError("Failed to save sort order");
      }
    },
    [queryClient, showSuccess, showError]
  );

  /** Handle drag end for main categories */
  const handleMainDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = mains.findIndex((m) => m.id === active.id);
      const newIndex = mains.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...mains];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      persistSortOrder(reordered);
    },
    [mains, persistSortOrder]
  );

  /** Create a drag end handler for sub-categories within a main */
  const createSubDragEnd = useCallback(
    (mainId: string) => (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const mainSubs = subs
        .filter((s) => s.parent_id === mainId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const oldIndex = mainSubs.findIndex((s) => s.id === active.id);
      const newIndex = mainSubs.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...mainSubs];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      persistSortOrder(reordered);
    },
    [subs, persistSortOrder]
  );

  /** Create a drag end handler for variants within a sub */
  const createVariantDragEnd = useCallback(
    (subId: string) => (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const subVariants = variants
        .filter((v) => v.parent_id === subId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const oldIndex = subVariants.findIndex((v) => v.id === active.id);
      const newIndex = subVariants.findIndex((v) => v.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...subVariants];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      persistSortOrder(reordered);
    },
    [variants, persistSortOrder]
  );

  if (categories.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">
            No categories found. Click &quot;Add Category&quot; to create your first category.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedMains = [...mains].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleMainDragEnd}
    >
      <SortableContext
        items={sortedMains.map((m) => m.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-6">
          {sortedMains.map((main) => {
            const mainSubs = subs
              .filter((s) => s.parent_id === main.id)
              .sort((a, b) => a.sort_order - b.sort_order);
            const isMainOpen = expanded.has(main.id);

            return (
              <SortableRow key={main.id} id={main.id}>
                {({ dragHandleProps, style, ref }) => (
                  <div ref={ref} style={style}>
                    <Card className="border-0 shadow-lg overflow-hidden">
                      {/* Main header — clickable to navigate */}
                      <div
                        className="bg-slate-50 border-b border-slate-100 p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() =>
                          router.push(`/dashboard/categories/${main.id}`)
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Drag handle */}
                            <button
                              {...dragHandleProps}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 hover:bg-slate-200 rounded-md transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
                              title="Drag to reorder"
                            >
                              <GripVertical className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggle(main.id);
                              }}
                              className="p-1 hover:bg-slate-200 rounded-md transition-colors flex-shrink-0"
                              title={isMainOpen ? "Collapse" : "Expand"}
                            >
                              {isMainOpen ? (
                                <ChevronDown className="w-5 h-5 text-slate-500" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-slate-500" />
                              )}
                            </button>
                            <CategoryImage
                              url={main.image_url}
                              name={main.name}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-slate-900">
                                  {main.name}
                                </span>
                                <Badge
                                  className={
                                    main.is_active
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-gray-100 text-gray-700"
                                  }
                                >
                                  {main.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-500 mt-0.5">
                                {main.description || main.slug}
                              </p>
                            </div>
                          </div>
                          <CategoryTreeActions category={main} />
                        </div>
                      </div>

                      {/* Sub Categories — hidden when main is collapsed */}
                      {isMainOpen && mainSubs.length > 0 && (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={createSubDragEnd(main.id)}
                        >
                          <SortableContext
                            items={mainSubs.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="divide-y divide-slate-50">
                              {mainSubs.map((sub) => {
                                const subVariants = variants
                                  .filter((v) => v.parent_id === sub.id)
                                  .sort(
                                    (a, b) => a.sort_order - b.sort_order
                                  );
                                const isSubOpen = expanded.has(sub.id);

                                return (
                                  <SortableRow key={sub.id} id={sub.id}>
                                    {({
                                      dragHandleProps: subDragProps,
                                      style: subStyle,
                                      ref: subRef,
                                    }) => (
                                      <div ref={subRef} style={subStyle}>
                                        <div
                                          className="p-4 pl-12 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                                          onClick={() =>
                                            router.push(
                                              `/dashboard/categories/${sub.id}`
                                            )
                                          }
                                        >
                                          <div className="flex items-center gap-3">
                                            {/* Drag handle */}
                                            <button
                                              {...subDragProps}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="p-1 hover:bg-slate-200 rounded-md transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
                                              title="Drag to reorder"
                                            >
                                              <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                                            </button>
                                            {/* Sub toggle chevron */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggle(sub.id);
                                              }}
                                              className="p-1 hover:bg-slate-200 rounded-md transition-colors flex-shrink-0"
                                              title={
                                                isSubOpen
                                                  ? "Collapse variants"
                                                  : "Expand variants"
                                              }
                                            >
                                              {isSubOpen ? (
                                                <ChevronDown className="w-4 h-4 text-slate-400" />
                                              ) : (
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                              )}
                                            </button>
                                            <CategoryImage
                                              url={sub.image_url}
                                              name={sub.name}
                                            />
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-blue-500" />
                                                <span className="font-medium text-slate-800">
                                                  {sub.name}
                                                </span>
                                                <Badge
                                                  variant="outline"
                                                  className="text-xs"
                                                >
                                                  {sub.is_active
                                                    ? "Active"
                                                    : "Inactive"}
                                                </Badge>
                                              </div>
                                              <p className="text-sm text-slate-500">
                                                {sub.description || sub.slug}
                                              </p>
                                            </div>
                                          </div>
                                          <CategoryTreeActions category={sub} />
                                        </div>

                                        {/* Variants — hidden when sub is collapsed */}
                                        {isSubOpen &&
                                          subVariants.length > 0 && (
                                            <DndContext
                                              sensors={sensors}
                                              collisionDetection={
                                                closestCenter
                                              }
                                              onDragEnd={createVariantDragEnd(
                                                sub.id
                                              )}
                                            >
                                              <SortableContext
                                                items={subVariants.map(
                                                  (v) => v.id
                                                )}
                                                strategy={
                                                  verticalListSortingStrategy
                                                }
                                              >
                                                <div className="divide-y divide-slate-50">
                                                  {subVariants.map(
                                                    (variant) => (
                                                      <SortableRow
                                                        key={variant.id}
                                                        id={variant.id}
                                                      >
                                                        {({
                                                          dragHandleProps:
                                                            varDragProps,
                                                          style: varStyle,
                                                          ref: varRef,
                                                        }) => (
                                                          <div
                                                            ref={varRef}
                                                            style={varStyle}
                                                            className="p-4 pl-20 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                                                            onClick={() =>
                                                              router.push(
                                                                `/dashboard/categories/${variant.id}`
                                                              )
                                                            }
                                                          >
                                                            <div className="flex items-center gap-3">
                                                              {/* Drag handle */}
                                                              <button
                                                                {...varDragProps}
                                                                onClick={(e) =>
                                                                  e.stopPropagation()
                                                                }
                                                                className="p-1 hover:bg-slate-200 rounded-md transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
                                                                title="Drag to reorder"
                                                              >
                                                                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                                                              </button>
                                                              {/* Spacer */}
                                                              <div className="w-4 flex-shrink-0" />
                                                              <CategoryImage
                                                                url={
                                                                  variant.image_url
                                                                }
                                                                name={
                                                                  variant.name
                                                                }
                                                              />
                                                              <div>
                                                                <div className="flex items-center gap-2">
                                                                  <Tag className="w-4 h-4 text-amber-500" />
                                                                  <span className="font-medium text-slate-700">
                                                                    {
                                                                      variant.name
                                                                    }
                                                                  </span>
                                                                  <Badge
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                  >
                                                                    {variant.is_active
                                                                      ? "Active"
                                                                      : "Inactive"}
                                                                  </Badge>
                                                                </div>
                                                                <p className="text-sm text-slate-500">
                                                                  {variant.description ||
                                                                    variant.slug}
                                                                </p>
                                                              </div>
                                                            </div>
                                                            <CategoryTreeActions
                                                              category={variant}
                                                            />
                                                          </div>
                                                        )}
                                                      </SortableRow>
                                                    )
                                                  )}
                                                </div>
                                              </SortableContext>
                                            </DndContext>
                                          )}
                                      </div>
                                    )}
                                  </SortableRow>
                                );
                              })}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}

                      {/* Collapsed placeholder showing count */}
                      {!isMainOpen && mainSubs.length > 0 && (
                        <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500">
                          {mainSubs.length} sub{" "}
                          {mainSubs.length === 1 ? "category" : "categories"}{" "}
                          hidden
                        </div>
                      )}
                    </Card>
                  </div>
                )}
              </SortableRow>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
