/**
 * Banners List Page
 *
 * Professional datatable for managing promotional banners.
 * Follows the exact UI/UX patterns from the products catalog and orders page.
 *
 * @module app/dashboard/banners/page
 */

"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Trash2,
  Edit,
  Image as ImageIcon,
  Calendar,
  GripVertical,
  Plus,
  Loader2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/admin/Modal";
import { useBanners, useDeleteBanner, useReorderBanners, useRemainingSlots } from "@/hooks";
import { useRouter } from "next/navigation";
import { type Banner, BannerType, BannerPosition, BANNER_TYPE_LIMITS } from "@/domain";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function BannersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading banners...
      </div>
    }>
      <BannersContent />
    </Suspense>
  );
}

function BannersContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<BannerType>(BannerType.HERO);
  const { data: banners, isLoading } = useBanners({ banner_type: activeTab });
  const { data: allHeroBanners } = useBanners({ banner_type: BannerType.HERO });
  const { data: allEditorialBanners } = useBanners({ banner_type: BannerType.EDITORIAL });
  const { data: allSplitBanners } = useBanners({ banner_type: BannerType.SPLIT });
  const { data: remainingSlots } = useRemainingSlots();
  const deleteBanner = useDeleteBanner();
  const reorderBanners = useReorderBanners();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; banner: Banner | null }>({
    open: false,
    banner: null,
  });

  // Sort by position (for hero) or priority
  const sortedBanners = useMemo(() => {
    if (!banners) return [];
    return [...banners].sort((a, b) => {
      // For hero banners, sort by position
      if (activeTab === BannerType.HERO) {
        const posA = a.position ? parseInt(a.position) : 999;
        const posB = b.position ? parseInt(b.position) : 999;
        return posA - posB;
      }
      // For split, sort left then right
      if (activeTab === BannerType.SPLIT) {
        if (a.position === BannerPosition.LEFT) return -1;
        if (b.position === BannerPosition.LEFT) return 1;
      }
      // For editorial and others, sort by priority
      return (b.priority || 0) - (a.priority || 0);
    });
  }, [banners, activeTab]);

  const filtered = useMemo(() => {
    if (!searchQuery) return sortedBanners;
    const query = searchQuery.toLowerCase();
    return sortedBanners.filter((b: Banner) =>
      b.title?.toLowerCase().includes(query) ||
      b.subtitle?.toLowerCase().includes(query)
    );
  }, [sortedBanners, searchQuery]);

  const handleDelete = useCallback((banner: Banner) => {
    setDeleteDialog({ open: true, banner });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteDialog.banner) {
      await deleteBanner.mutateAsync(deleteDialog.banner.id);
      setDeleteDialog({ open: false, banner: null });
    }
  }, [deleteDialog.banner, deleteBanner]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && activeTab === BannerType.HERO) {
      const oldIndex = filtered.findIndex((b) => b.id === active.id);
      const newIndex = filtered.findIndex((b) => b.id === over.id);

      const reordered = arrayMove(filtered, oldIndex, newIndex);

      // Update positions based on new order (1-based)
      const updates = reordered.map((banner, index) => ({
        id: banner.id,
        position: (index + 1).toString(),
      }));

      reorderBanners.mutate(updates);
    }
  }, [filtered, activeTab, reorderBanners]);

  const canAddBanner = (type: BannerType) => {
    if (remainingSlots && remainingSlots[type] !== undefined) {
      return remainingSlots[type] > 0;
    }
    return true;
  };

  // Stats
  const stats = useMemo(() => {
    const heroCount = allHeroBanners?.length || 0;
    const editorialCount = allEditorialBanners?.length || 0;
    const splitCount = allSplitBanners?.length || 0;
    const allBanners = [...(allHeroBanners || []), ...(allEditorialBanners || []), ...(allSplitBanners || [])];
    const activeCount = allBanners.filter((b) => b.is_active).length;
    return { heroCount, editorialCount, splitCount, activeCount, total: allBanners.length };
  }, [allHeroBanners, allEditorialBanners, allSplitBanners]);

  const filterChips = [
    { label: "Hero", value: BannerType.HERO, count: stats.heroCount },
    { label: "Editorial", value: BannerType.EDITORIAL, count: stats.editorialCount },
    { label: "Split", value: BannerType.SPLIT, count: stats.splitCount },
  ];

  const showShimmer = isLoading;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Banners</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            <span>Manage promotional banners for your storefront</span>
            <span>• {stats.total} total</span>
          </p>
        </div>
        <Button
          asChild
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
          disabled={!canAddBanner(activeTab)}
        >
          <Link href="/dashboard/banners/create">
            <Plus className="w-4 h-4" />
            Add Banner
          </Link>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Hero Banners"
          value={showShimmer ? null : `${stats.heroCount} / ${BANNER_TYPE_LIMITS[BannerType.HERO]}`}
          subtext="Main carousel banners"
        />
        <StatCard
          label="Editorial"
          value={showShimmer ? null : `${stats.editorialCount} / ${BANNER_TYPE_LIMITS[BannerType.EDITORIAL]}`}
          subtext="Featured content section"
        />
        <StatCard
          label="Split Banners"
          value={showShimmer ? null : `${stats.splitCount} / ${BANNER_TYPE_LIMITS[BannerType.SPLIT]}`}
          subtext="Side-by-side promotions"
        />
        <StatCard
          label="Active Banners"
          value={showShimmer ? null : String(stats.activeCount)}
          subtext="Currently visible on site"
          highlight={stats.activeCount > 0}
        />
      </div>

      {/* Filters & Search */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-4 space-y-4">
          {/* Type Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {filterChips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setActiveTab(chip.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  activeTab === chip.value
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {chip.label}
                <span className="ml-1.5 opacity-70">{chip.count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 border-t border-slate-100">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search banners by title or subtitle..."
                className="pl-9 border-slate-200 focus:border-slate-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banners Table */}
      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
        {showShimmer ? (
          <div className="divide-y divide-slate-100">
            {/* Table header skeleton */}
            <div className="hidden md:grid grid-cols-[auto_1fr_160px_140px_120px_120px] gap-4 p-4 bg-slate-50/50">
              <div className="h-4 w-8 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse justify-self-end" />
            </div>
            {/* Rows skeleton */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="h-4 w-4 bg-slate-100 rounded animate-pulse shrink-0" />
                <div className="h-12 w-20 bg-slate-100 rounded-lg animate-pulse shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-1/4 bg-slate-50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="p-16 text-center">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {searchQuery ? "No Banners Found" : "No Banners Yet"}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No banners matched your search for "${searchQuery}".`
                : `Create your first ${activeTab} banner to get started.`}
            </p>
            {!searchQuery && (
              <Button
                className="mt-6 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => router.push("/dashboard/banners/create")}
              >
                Add New Banner
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3">Preview</th>
                    <th className="px-4 py-3">Title</th>
                    {activeTab === BannerType.HERO && (
                      <th className="px-4 py-3">Position</th>
                    )}
                    {activeTab === BannerType.SPLIT && (
                      <th className="px-4 py-3">Side</th>
                    )}
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <SortableContext
                  items={filtered.map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((banner: Banner) => (
                      <SortableBannerRow
                        key={banner.id}
                        banner={banner}
                        activeTab={activeTab}
                        isDraggable={activeTab === BannerType.HERO}
                        onEdit={() => router.push(`/dashboard/banners/edit/${banner.id}`)}
                        onDelete={() => handleDelete(banner)}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </div>
          </DndContext>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, banner: null })}
        title="Delete Banner"
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Confirm Deletion</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete <span className="font-semibold text-slate-900">{deleteDialog.banner?.title || 'this banner'}</span>? This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, banner: null })} className="border-slate-200">Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteBanner.isPending}>
              {deleteBanner.isPending ? "Deleting..." : "Delete Banner"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const SortableBannerRow = ({ banner, activeTab, isDraggable, onEdit, onDelete }: {
  banner: Banner;
  activeTab: BannerType;
  isDraggable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="hover:bg-slate-50 transition-colors group"
    >
      <td className="px-4 py-4">
        {isDraggable && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded"
          >
            <GripVertical className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="w-20 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
          <img
            src={banner.web_image_url}
            alt={banner.alt_text || banner.title || 'Banner'}
            className="w-full h-full object-cover"
          />
        </div>
      </td>
      <td className="px-4 py-4">
        <div>
          <p className="font-semibold text-slate-900 group-hover:text-slate-600 transition-colors">{banner.title || 'Untitled'}</p>
          {banner.subtitle && <p className="text-xs text-slate-400 mt-0.5">{banner.subtitle}</p>}
        </div>
      </td>
      {activeTab === BannerType.HERO && (
        <td className="px-4 py-4">
          <Badge variant="outline" className="text-slate-700 border-slate-200">
            #{banner.position || '-'}
          </Badge>
        </td>
      )}
      {activeTab === BannerType.SPLIT && (
        <td className="px-4 py-4">
          <Badge variant="outline" className={banner.position === BannerPosition.LEFT
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-purple-50 text-purple-700 border-purple-200"
          }>
            {banner.position === BannerPosition.LEFT ? 'Left' : 'Right'}
          </Badge>
        </td>
      )}
      <td className="px-4 py-4">
        {banner.start_date || banner.end_date ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {banner.start_date && new Date(banner.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              {banner.start_date && banner.end_date && ' – '}
              {banner.end_date && new Date(banner.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Always on</span>
        )}
      </td>
      <td className="px-4 py-4">
        <Badge
          variant="secondary"
          className={`text-xs font-medium px-2 py-0.5 ${
            banner.is_active
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          {banner.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 hover:text-slate-900"
            onClick={onEdit}
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-red-400 hover:text-red-700 hover:bg-red-50"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

/* ── Minimalist Professional Stat Card ──────────────────── */
function StatCard({
  label,
  value,
  subtext,
  highlight,
  alert
}: {
  label: string;
  value: string | null;
  subtext?: string;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          {highlight && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
          {alert && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          )}
        </div>
        <div className="space-y-1">
          {value === null ? (
            <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
          ) : (
            <p className={`text-2xl font-bold tracking-tight ${alert ? "text-red-600" : "text-slate-900"}`}>
              {value}
            </p>
          )}
          {subtext && (
            <p className="text-xs font-medium text-slate-500">{subtext}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
