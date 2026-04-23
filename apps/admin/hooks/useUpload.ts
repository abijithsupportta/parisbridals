/**
 * Upload Hooks
 *
 * Custom React hooks for file upload operations using TanStack Query.
 *
 * @module hooks/useUpload
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { ImageUploadResult, FileUpload } from '@/domain';
import { uploadService } from '@/services';
import { useAppStore } from '@/stores';
import { useCallback, useState } from 'react';

/**
 * Hook for uploading a single file
 */
export function useUploadFile(options?: {
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
}) {
  const { showError, showSuccess } = useAppStore();

  const mutation = useMutation({
    mutationFn: (file: File) => uploadService.uploadFile(file, options),
    onSuccess: (result) => {
      if (result.success) {
        showSuccess('File uploaded successfully');
      } else {
        showError('Failed to upload file', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to upload file', error.message);
    },
  });

  return {
    ...mutation,
    uploadFile: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for uploading multiple files with progress tracking
 */
export function useUploadMultipleFiles(options?: {
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
}) {
  const { showError, showSuccess } = useAppStore();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: (files: File[]) => 
      uploadService.uploadMultipleFiles(files, {
        ...options,
        onProgress: (index, progressPercent) => {
          setProgress(progressPercent);
        },
      }),
    onSuccess: (result) => {
      if (result.success) {
        const successful = result.data!.filter(r => r.result).length;
        const failed = result.data!.filter(r => r.error).length;
        
        if (failed === 0) {
          showSuccess(`Successfully uploaded ${successful} files`);
        } else {
          showError(`Uploaded ${successful} files, ${failed} failed`);
        }
      } else {
        showError('Failed to upload files', result.error?.message);
      }
      setProgress(0);
    },
    onError: (error) => {
      showError('Failed to upload files', error.message);
      setProgress(0);
    },
  });

  return {
    ...mutation,
    uploadFiles: mutation.mutate,
    isLoading: mutation.isPending,
    progress,
  };
}

/**
 * Hook for uploading product images
 */
export function useUploadProductImages() {
  const { showError, showSuccess } = useAppStore();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: (files: File[]) => 
      uploadService.uploadProductImages(files, (index, progressPercent) => {
        setProgress(progressPercent);
      }),
    onSuccess: (result) => {
      if (result.success) {
        const successful = result.data!.filter(r => r.result).length;
        const failed = result.data!.filter(r => r.error).length;
        
        if (failed === 0) {
          showSuccess(`Successfully uploaded ${successful} product images`);
        } else {
          showError(`Uploaded ${successful} images, ${failed} failed`);
        }
      } else {
        showError('Failed to upload product images', result.error?.message);
      }
      setProgress(0);
    },
    onError: (error) => {
      showError('Failed to upload product images', error.message);
      setProgress(0);
    },
  });

  return {
    ...mutation,
    uploadImages: mutation.mutateAsync,
    isLoading: mutation.isPending,
    progress,
  };
}

/**
 * Hook for uploading category image
 */
export function useUploadCategoryImage() {
  const { showError, showSuccess } = useAppStore();

  const mutation = useMutation({
    mutationFn: (file: File) => uploadService.uploadCategoryImage(file),
    onSuccess: (result) => {
      if (result.success) {
        showSuccess('Category image uploaded successfully');
      } else {
        showError('Failed to upload category image', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to upload category image', error.message);
    },
  });

  return {
    ...mutation,
    uploadImage: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for deleting a file
 */
export function useDeleteFile() {
  const { showError, showSuccess } = useAppStore();

  const mutation = useMutation({
    mutationFn: (publicId: string) => uploadService.deleteFile(publicId),
    onSuccess: (result) => {
      if (result.success) {
        showSuccess('File deleted successfully');
      } else {
        showError('Failed to delete file', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to delete file', error.message);
    },
  });

  return {
    ...mutation,
    deleteFile: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for getting file info
 */
export function useFileInfo(publicId: string) {
  const query = useQuery({
    queryKey: ['file-info', publicId],
    queryFn: () => uploadService.getFileInfo(publicId),
    enabled: !!publicId,
    select: (result) => result.data,
  });

  return {
    ...query,
    fileInfo: query.data,
    isLoading: query.isLoading || query.isFetching,
  };
}

/**
 * Hook for generating image variants
 */
export function useGenerateImageVariants() {
  const { showError, showSuccess } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ 
      originalUrl, 
      type 
    }: { 
      originalUrl: string; 
      type: 'product' | 'category' | 'banner' 
    }) => uploadService.generateImageVariants(originalUrl, type),
    onSuccess: (result) => {
      if (result.success) {
        showSuccess('Image variants generated successfully');
      } else {
        showError('Failed to generate image variants', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to generate image variants', error.message);
    },
  });

  return {
    ...mutation,
    generateVariants: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for optimizing images
 */
export function useOptimizeImage() {
  const { showError, showSuccess } = useAppStore();

  const mutation = useMutation({
    mutationFn: ({ 
      imageUrl, 
      options 
    }: { 
      imageUrl: string; 
      options?: {
        quality?: number;
        format?: 'webp' | 'jpeg' | 'png';
        maxWidth?: number;
        maxHeight?: number;
      };
    }) => uploadService.optimizeImage(imageUrl, options),
    onSuccess: (result) => {
      if (result.success) {
        showSuccess('Image optimized successfully');
      } else {
        showError('Failed to optimize image', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to optimize image', error.message);
    },
  });

  return {
    ...mutation,
    optimizeImage: mutation.mutate,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook for file validation
 */
export function useFileValidation() {
  const { showError } = useAppStore();

  const validateFile = useCallback((
    file: File, 
    options?: {
      maxSize?: number;
      allowedTypes?: string[];
    }
  ) => {
    const validation = uploadService.validateImageFile(file);
    
    if (!validation.success) {
      showError('Invalid file', validation.error?.message);
      return false;
    }

    // Additional custom validations
    if (options?.maxSize && file.size > options.maxSize) {
      showError('File too large', `Maximum size is ${uploadService.getFormattedFileSize(options.maxSize)}`);
      return false;
    }

    if (options?.allowedTypes && !options.allowedTypes.includes(file.type)) {
      showError('Invalid file type', `Allowed types: ${options.allowedTypes.join(', ')}`);
      return false;
    }

    return true;
  }, [showError]);

  return { validateFile };
}

/**
 * Hook for image upload with preview
 */
export function useImageUploadWithPreview() {
  const [previews, setPreviews] = useState<Array<{ file: File; preview: string }>>([]);
  const { uploadImages, isLoading, progress } = useUploadProductImages();
  const { showError } = useAppStore();
  const { validateFile } = useFileValidation();

  const addImages = useCallback((files: FileList) => {
    const newPreviews: Array<{ file: File; preview: string }> = [];
    
    Array.from(files).forEach(file => {
      if (!validateFile(file)) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        newPreviews.push({ file, preview });
        
        if (newPreviews.length === files.length) {
          setPreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [validateFile]);

  const removePreview = useCallback((index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearPreviews = useCallback(() => {
    setPreviews([]);
  }, []);

  const uploadSelectedImages = useCallback(async () => {
    if (previews.length === 0) {
      showError('No images selected');
      return;
    }

    const files = previews.map(p => p.file);
    const result = await uploadImages(files);
    
    if (result.success) {
      clearPreviews();
    }
    
    return result;
  }, [previews, uploadImages, clearPreviews, showError]);

  return {
    previews,
    addImages,
    removePreview,
    clearPreviews,
    uploadSelectedImages,
    isLoading,
    progress,
  };
}

/**
 * Hook for getting image dimensions
 */
export function useImageDimensions() {
  const { showError } = useAppStore();

  const getDimensions = useCallback(async (file: File): Promise<{ width: number; height: number } | null> => {
    const result = await uploadService.getImageDimensions(file);
    
    if (!result.success) {
      showError('Failed to get image dimensions', result.error?.message);
      return null;
    }
    
    return result.data;
  }, [showError]);

  return { getDimensions };
}
