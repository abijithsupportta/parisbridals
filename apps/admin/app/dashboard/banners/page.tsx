"use client";

import { Search, Trash2, Edit, Image as ImageIcon, Calendar, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddButton from "@/components/admin/AddButton";
import { useBanners, useDeleteBanner, useReorderBanners } from "@/hooks";
import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import { type Banner } from "@/domain";
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
  const { data: banners, isLoading } = useBanners();
  const deleteBanner = useDeleteBanner();
  const reorderBanners = useReorderBanners();

  // Sort by priority (highest first)
  const sortedBanners = useMemo(() => {
    if (!banners) return [];
    return [...banners].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [banners]);

  const filtered = useMemo(() => {
    if (!searchQuery) return sortedBanners;
    const query = searchQuery.toLowerCase();
    return sortedBanners.filter((b: Banner) =>
      b.title?.toLowerCase().includes(query) ||
      b.subtitle?.toLowerCase().includes(query)
    );
  }, [sortedBanners, searchQuery]);

  const handleDelete = useCallback((banner: Banner) => {
    if (!confirm(`Delete "${banner.title || 'this banner'}"? This cannot be undone.`)) return;
    deleteBanner.mutate(banner.id);
  }, [deleteBanner]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filtered.findIndex((b) => b.id === active.id);
      const newIndex = filtered.findIndex((b) => b.id === over.id);

      const reordered = arrayMove(filtered, oldIndex, newIndex);
      
      // Update priorities based on new order
      const updates = reordered.map((banner, index) => ({
        id: banner.id,
        priority: reordered.length - index, // Higher index = higher priority
      }));

      reorderBanners.mutate(updates);
    }
  }, [filtered, reorderBanners]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Banners</h1>
          <p className="text-slate-500 mt-1">Manage hero banners and promotional images ({banners?.length || 0} total)</p>
        </div>
        <AddButton 
          label="Add Banner" 
          onClick={() => router.push("/dashboard/banners/create")} 
        />
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
    </div>
  );
}

const SortableBannerRow = ({ banner, onEdit, onDelete }: { 
  banner: Banner; 
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
  } = useSortable({ id: banner.id });

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
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded"
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </button>
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
