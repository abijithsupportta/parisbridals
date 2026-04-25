/**
 * Upload Repository
 *
 * Data access layer for file uploads using Cloudflare R2.
 *
 * @module repository/uploadRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { ImageUploadResult, FileUpload } from '@/domain';

export class UploadRepository extends BaseRepository {
  /**
   * Upload file to Cloudflare R2
   */
  async uploadFile(file: File, folder: string = 'uploads'): Promise<RepositoryResult<ImageUploadResult>> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const filename = `${timestamp}_${randomString}.${extension}`;
      const key = `${folder}/${filename}`;

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('key', key);

      // Upload via API route
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
      }

      const json = await response.json();
      const payload = json.data || json;

      const uploadResult: ImageUploadResult = {
        url: payload.url,
        public_id: payload.key || payload.public_id || key,
        format: payload.format || extension || 'unknown',
        size: payload.size || file.size,
        width: payload.width || 0,
        height: payload.height || 0,
      };

      return {
        data: uploadResult,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as any,
        success: false,
      };
    }
  }

  /**
   * Delete file from R2
   */
  async deleteFile(publicId: string): Promise<RepositoryResult<void>> {
    try {
      const response = await fetch('/api/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Delete failed: ${response.statusText}`);
      }

      return {
        data: null,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as any,
        success: false,
      };
    }
  }

  /**
   * Get file info from R2
   */
  async getFileInfo(publicId: string): Promise<RepositoryResult<Partial<ImageUploadResult>>> {
    try {
      const response = await fetch(`/api/upload?publicId=${encodeURIComponent(publicId)}`);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            data: null,
            error: { message: 'File not found', code: 'NOT_FOUND' } as any,
            success: false,
          };
        }
        throw new Error(`Get file info failed: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        data: result,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as any,
        success: false,
      };
    }
  }

  /**
   * Validate file type and size
   */
  validateFile(file: File, options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}): RepositoryResult<void> {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = ['image/*'] } = options;

    // Check file size
    if (file.size > maxSize) {
      return {
        data: null,
        error: {
          message: `File size exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
          code: 'FILE_TOO_LARGE',
        } as any,
        success: false,
      };
    }

    // Check file type
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return {
        data: null,
        error: {
          message: `File type ${file.type} is not allowed`,
          code: 'INVALID_FILE_TYPE',
        } as any,
        success: false,
      };
    }

    return {
      data: null,
      error: null,
      success: true,
    };
  }

  /**
   * Create upload progress tracker
   */
  createUploadTracker(file: File): FileUpload {
    return {
      file,
      status: 'pending',
      progress: 0,
    };
  }

  /**
   * Update upload progress
   */
  updateUploadProgress(upload: FileUpload, progress: number, status: FileUpload['status']): FileUpload {
    return {
      ...upload,
      progress,
      status,
    };
  }

  /**
   * Generate image variants (different sizes)
   */
  async generateImageVariants(
    originalUrl: string,
    sizes: Array<{ width: number; height: number; name: string }>
  ): Promise<RepositoryResult<Array<{ name: string; url: string }>>> {
    try {
      const variants = await Promise.all(
        sizes.map(async ({ width, height, name }) => {
          // For now, return the original URL with size parameters
          // In a real implementation, you'd use an image processing service
          const separator = originalUrl.includes('?') ? '&' : '?';
          const variantUrl = `${originalUrl}${separator}w=${width}&h=${height}`;
          return { name, url: variantUrl };
        })
      );

      return {
        data: variants,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: [],
        error: error as any,
        success: false,
      };
    }
  }

  /**
   * Batch upload multiple files
   */
  async uploadMultipleFiles(
    files: File[],
    folder: string = 'uploads',
    onProgress?: (index: number, progress: number) => void
  ): Promise<RepositoryResult<Array<{ file: File; result?: ImageUploadResult; error?: string }>>> {
    const results: Array<{ file: File; result?: ImageUploadResult; error?: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Validate file first
        const validation = this.validateFile(file);
        if (!validation.success) {
          results.push({
            file,
            error: validation.error?.message || 'Validation failed',
          });
          continue;
        }

        // Upload file
        const uploadResult = await this.uploadFile(file, folder);
        
        if (uploadResult.success && uploadResult.data) {
          results.push({
            file,
            result: uploadResult.data,
          });
        } else {
          results.push({
            file,
            error: uploadResult.error?.message || 'Upload failed',
          });
        }
      } catch (error) {
        results.push({
          file,
          error: (error as Error).message || 'Unexpected error',
        });
      }

      // Report progress
      if (onProgress) {
        onProgress(i, Math.round(((i + 1) / files.length) * 100));
      }
    }

    return {
      data: results,
      error: null,
      success: true,
    };
  }
}

// Export singleton instance
export const uploadRepository = new UploadRepository();
