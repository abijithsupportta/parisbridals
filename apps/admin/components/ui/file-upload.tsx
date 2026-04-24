/**
 * FileUpload Component
 *
 * Reusable drag-and-drop file upload with image preview, validation,
 * and R2 integration. Supports single and multiple file modes.
 *
 * Used by CategoryForm (single image), ProductForm (multiple images),
 * and BannerForm (web + mobile images).
 *
 * @module components/ui/file-upload
 */

"use client";

import * as React from "react";
import { useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, ImageIcon, FileVideo, Loader2, AlertCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadedFile {
  /** Public URL of the uploaded file (from R2) */
  url: string;
  /** S3 object key for future reference / deletion */
  key?: string;
}

export interface FileUploadProps {
  /** Accepted MIME types (e.g., "image/*", "video/*") */
  accept?: string;
  /** Allow multiple files */
  multiple?: boolean;
  /** Maximum number of files (only relevant when multiple=true) */
  maxFiles?: number;
  /** Maximum file size in bytes (default: 5MB) */
  maxSize?: number;
  /** R2 folder to upload to (e.g., "categories", "products", "banners") */
  folder?: string;
  /** Whether to upload immediately on file selection (default: true) */
  uploadImmediately?: boolean;
  /** Already-uploaded file URLs (for edit mode pre-population) */
  value?: string[];
  /** Callback when uploaded files change (array of URLs) */
  onChange?: (urls: string[]) => void;
  /** Callback when files are selected but not yet uploaded (for deferred upload) */
  onFilesSelected?: (files: File[]) => void;
  /** Label displayed above the drop zone */
  label?: string;
  /** Helper text displayed below the drop zone */
  helperText?: string;
  /** Disable the component */
  disabled?: boolean;
  /** Additional class names for the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

function isVideoType(type: string): boolean {
  return type.startsWith("video/");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface PreviewItemProps {
  url: string;
  isVideo?: boolean;
  onRemove: () => void;
  disabled?: boolean;
}

function PreviewItem({ url, isVideo, onRemove, disabled }: PreviewItemProps) {
  return (
    <div className="group relative w-24 h-24">
      <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
        {isVideo ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100">
            <FileVideo className="w-8 h-8 text-slate-400" />
            <span className="text-[10px] text-slate-400 mt-1">Video</span>
          </div>
        ) : (
          <img
            src={url}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm z-10"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

interface UploadingItemProps {
  name: string;
  progress?: number;
}

function UploadingItem({ name }: UploadingItemProps) {
  return (
    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center">
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
      <span className="text-[10px] text-primary/70 mt-1 truncate w-20 text-center">
        {name}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      accept = "image/*",
      multiple = false,
      maxFiles = 10,
      maxSize = 5 * 1024 * 1024,
      folder = "uploads",
      uploadImmediately = true,
      value = [],
      onChange,
      onFilesSelected,
      label,
      helperText,
      disabled = false,
      className,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Maximum files the user can still add
    const remainingSlots = multiple ? maxFiles - value.length : value.length === 0 ? 1 : 0;
    const canAddMore = remainingSlots > 0 && !disabled;

    // ------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------

    const validateFiles = useCallback(
      (files: File[]): { valid: File[]; errors: string[] } => {
        const valid: File[] = [];
        const errors: string[] = [];

        for (const file of files) {
          // Check file type against accept string
          if (accept !== "*") {
            const acceptTypes = accept.split(",").map((t) => t.trim());
            const matches = acceptTypes.some((type) => {
              if (type.endsWith("/*")) {
                return file.type.startsWith(type.replace("/*", "/"));
              }
              return file.type === type;
            });
            if (!matches) {
              errors.push(`"${file.name}" is not an accepted file type`);
              continue;
            }
          }

          // Check file size
          if (file.size > maxSize) {
            errors.push(
              `"${file.name}" exceeds ${formatFileSize(maxSize)} limit (${formatFileSize(file.size)})`
            );
            continue;
          }

          valid.push(file);
        }

        // Check max files
        if (valid.length > remainingSlots) {
          errors.push(
            `Can only add ${remainingSlots} more file${remainingSlots === 1 ? "" : "s"} (max ${maxFiles})`
          );
          return { valid: valid.slice(0, remainingSlots), errors };
        }

        return { valid, errors };
      },
      [accept, maxSize, maxFiles, remainingSlots]
    );

    // ------------------------------------------------------------------
    // Upload to R2
    // ------------------------------------------------------------------

    const uploadToR2 = useCallback(
      async (file: File): Promise<string | null> => {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", folder);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Upload failed: ${res.statusText}`);
          }

          const data = await res.json();
          return data.url;
        } catch (err) {
          console.error("Upload error:", err);
          return null;
        }
      },
      [folder]
    );

    // ------------------------------------------------------------------
    // Handle file selection
    // ------------------------------------------------------------------

    const handleFiles = useCallback(
      async (fileList: FileList | File[]) => {
        const files = Array.from(fileList);
        if (files.length === 0) return;

        setError(null);

        const { valid, errors } = validateFiles(files);

        if (errors.length > 0) {
          setError(errors[0]);
        }

        if (valid.length === 0) return;

        // Deferred upload mode — let parent handle upload
        if (!uploadImmediately) {
          onFilesSelected?.(valid);
          return;
        }

        // Immediate upload mode — upload ALL files in parallel
        const fileNames = valid.map((f) => f.name);
        setUploadingFiles(fileNames);

        const results = await Promise.all(
          valid.map(async (file) => {
            const url = await uploadToR2(file);
            if (!url) {
              setError(`Failed to upload "${file.name}"`);
            }
            return url;
          })
        );

        const uploadedUrls = results.filter(Boolean) as string[];

        setUploadingFiles([]);

        if (uploadedUrls.length > 0) {
          const newValue = multiple
            ? [...value, ...uploadedUrls]
            : uploadedUrls.slice(0, 1);
          onChange?.(newValue);
        }
      },
      [validateFiles, uploadImmediately, uploadToR2, onFilesSelected, onChange, value, multiple]
    );

    // ------------------------------------------------------------------
    // Remove a file
    // ------------------------------------------------------------------

    const handleRemove = useCallback(
      (index: number) => {
        const newValue = value.filter((_, i) => i !== index);
        onChange?.(newValue);
      },
      [value, onChange]
    );

    // ------------------------------------------------------------------
    // Drag & Drop handlers
    // ------------------------------------------------------------------

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (canAddMore) setIsDragging(true);
      },
      [canAddMore]
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (!canAddMore) return;

        const files = e.dataTransfer.files;
        handleFiles(files);
      },
      [canAddMore, handleFiles]
    );

    // ------------------------------------------------------------------
    // Click to browse
    // ------------------------------------------------------------------

    const handleClick = useCallback(() => {
      if (canAddMore) {
        inputRef.current?.click();
      }
    }, [canAddMore]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
          handleFiles(e.target.files);
        }
        // Reset input so selecting the same file again triggers onChange
        e.target.value = "";
      },
      [handleFiles]
    );

    // ------------------------------------------------------------------
    // Determine if a URL is a video
    // ------------------------------------------------------------------

    const isVideoUrl = (url: string) => {
      const videoExts = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
      return videoExts.some((ext) => url.toLowerCase().includes(ext));
    };

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

    const isUploading = uploadingFiles.length > 0;
    const hasFiles = value.length > 0 || isUploading;

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {/* Label */}
        {label && (
          <label className="text-sm font-semibold text-slate-700 block">
            {label}
          </label>
        )}

        {/* Previews */}
        {hasFiles && (
          <div className="flex flex-wrap gap-3">
            {value.map((url, index) => (
              <PreviewItem
                key={url + index}
                url={url}
                isVideo={isVideoUrl(url)}
                onRemove={() => handleRemove(index)}
                disabled={disabled}
              />
            ))}
            {uploadingFiles.map((name) => (
              <UploadingItem key={name} name={name} />
            ))}
          </div>
        )}

        {/* Drop zone */}
        {canAddMore && (
          <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleClick();
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-all",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100",
              isUploading && "pointer-events-none opacity-60",
              disabled && "pointer-events-none opacity-50 cursor-not-allowed"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-primary font-medium">
                  Uploading {uploadingFiles.length} file{uploadingFiles.length > 1 ? "s" : ""}…
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-slate-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">
                    <span className="text-primary">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {accept === "image/*"
                      ? "PNG, JPG, WebP"
                      : accept === "image/*,video/*"
                      ? "PNG, JPG, WebP, MP4"
                      : accept}{" "}
                    up to {formatFileSize(maxSize)}
                    {multiple && ` · Max ${maxFiles} files`}
                  </p>
                </div>
              </>
            )}

            {/* Hidden file input */}
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleInputChange}
              className="hidden"
              disabled={disabled || isUploading}
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p className="text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export { FileUpload };
