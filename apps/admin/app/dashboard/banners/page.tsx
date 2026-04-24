"use client";

import { Search, Trash2, Edit, Image as ImageIcon, Calendar, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddButton from "@/components/admin/AddButton";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { useBanners, useDeleteBanner, useReorderBanners, useRemainingSlots } from "@/hooks";
import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<BannerType>(BannerType.HERO);
  const { data: banners, isLoading } = useBanners({ banner_type: activeTab });
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Banners</h1>
          <p className="text-slate-500 mt-1">Manage promotional banners ({banners?.length || 0} total)</p>
        </div>
        <AddButton
          label="Add Banner"
          onClick={() => router.push("/dashboard/banners/create")}
          disabled={!canAddBanner(activeTab)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {Object.values(BannerType).map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === type
                ? 'text-primary border-primary'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className="capitalize">{type}</span>
            <span className="ml-2 text-xs">
              {remainingSlots ? `${BANNER_TYPE_LIMITS[type] - remainingSlots[type]}/${BANNER_TYPE_LIMITS[type]}` : ''}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search banners..."
              className="pl-10 bg-slate-50 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-slate-500 mt-2">Loading banners...</p>
            </div>
          ) : !filtered || filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">{searchQuery ? "No banners found" : "No banners yet. Create your first banner."}</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-700 w-12"></th>
                    <th className="text-left p-4 font-semibold text-slate-700">Preview</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Title</th>
                    {activeTab === BannerType.HERO && (
                      <th className="text-left p-4 font-semibold text-slate-700">Position</th>
                    )}
                    {activeTab === BannerType.SPLIT && (
                      <th className="text-left p-4 font-semibold text-slate-700">Side</th>
                    )}
                    <th className="text-left p-4 font-semibold text-slate-700">Schedule</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <SortableContext
                  items={filtered.map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
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
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, banner: null })}
        onConfirm={handleConfirmDelete}
        entityName={deleteDialog.banner?.title || 'this banner'}
        entityType="banner"
      />
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
      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
    >
      <td className="p-4">
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
      <td className="p-4">
        <div className="w-20 h-12 rounded-lg overflow-hidden bg-slate-100">
          <img
            src={banner.web_image_url}
            alt={banner.alt_text || banner.title || 'Banner'}
            className="w-full h-full object-cover"
          />
        </div>
      </td>
      <td className="p-4">
        <div>
          <p className="font-semibold text-slate-900">{banner.title || 'Untitled'}</p>
          {banner.subtitle && <p className="text-sm text-slate-500">{banner.subtitle}</p>}
        </div>
      </td>
      {activeTab === BannerType.HERO && (
        <td className="p-4">
          <Badge variant="outline" className="text-slate-700">
            #{banner.position || '-'}
          </Badge>
        </td>
      )}
      {activeTab === BannerType.SPLIT && (
        <td className="p-4">
          <Badge className={banner.position === BannerPosition.LEFT
            ? "bg-blue-100 text-blue-700"
            : "bg-purple-100 text-purple-700"
          }>
            {banner.position === BannerPosition.LEFT ? 'Left' : 'Right'}
          </Badge>
        </td>
      )}
      <td className="p-4">
        {banner.start_date || banner.end_date ? (
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {banner.start_date && new Date(banner.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              {banner.start_date && banner.end_date && ' - '}
              {banner.end_date && new Date(banner.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>
      <td className="p-4">
        <Badge className={banner.is_active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-gray-100 text-gray-700"
        }>
          {banner.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="p-4">
        <div className="flex gap-1">
          <button
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={onEdit}
            title="Edit"
          >
            <Edit className="w-4 h-4 text-slate-400" />
          </button>
          <button
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </td>
    </tr>
  );
};
