/**
 * Upload Service
 *
 * Business logic layer for file upload operations.
 *
 * @module services/uploadService
 */

import { 
  uploadRepository,
  RepositoryResult
} from '@/repository';
import { 
  ImageUploadResult, 
  FileUpload 
} from '@/domain';

export class UploadService {
  /**
   * Upload single file with validation
   */
  async uploadFile(
    file: File, 
    options: {
      folder?: string;
      maxSize?: number;
      allowedTypes?: string[];
    } = {}
  ): Promise<RepositoryResult<ImageUploadResult>> {
    const { folder = 'uploads', maxSize, allowedTypes } = options;

    // Validate file
    const validation = uploadRepository.validateFile(file, { maxSize, allowedTypes });
    if (!validation.success) {
      return {
        success: false,
        data: null,
        error: validation.error
      };
    }

    // Upload file
    return await uploadRepository.uploadFile(file, folder);
  }

  /**
   * Upload multiple files with progress tracking
   */
  async uploadMultipleFiles(
    files: File[],
    options: {
      folder?: string;
      maxSize?: number;
      allowedTypes?: string[];
      onProgress?: (index: number, progress: number) => void;
    } = {}
  ): Promise<RepositoryResult<Array<{ file: File; result?: ImageUploadResult; error?: string }>>> {
    const { folder = 'uploads', maxSize, allowedTypes, onProgress } = options;

    // Validate all files first
    const validationResults = files.map(file => 
      uploadRepository.validateFile(file, { maxSize, allowedTypes })
    );

    const invalidFiles = validationResults
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => !result.success);

    if (invalidFiles.length > 0) {
      return {
        data: null,
        error: {
          message: 'Some files are invalid',
          details: invalidFiles.map(({ index, result }) => ({
            fileIndex: index,
            fileName: files[index].name,
            error: result.error?.message,
          })),
          code: 'INVALID_FILES'
        } as any,
        success: false,
      };
    }

    // Upload files
    return await uploadRepository.uploadMultipleFiles(files, folder, onProgress);
  }

  /**
   * Upload product images with specific validation
   */
  async uploadProductImages(
    files: File[],
    onProgress?: (index: number, progress: number) => void
  ): Promise<RepositoryResult<Array<{ file: File; result?: ImageUploadResult; error?: string }>>> {
    return await this.uploadMultipleFiles(files, {
      folder: 'products',
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      onProgress,
    });
  }

  /**
   * Upload category image with specific validation
   */
  async uploadCategoryImage(
    file: File
  ): Promise<RepositoryResult<ImageUploadResult>> {
    return await this.uploadFile(file, {
      folder: 'categories',
      maxSize: 2 * 1024 * 1024, // 2MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    });
  }

  /**
   * Delete file
   */
  async deleteFile(publicId: string): Promise<RepositoryResult<void>> {
    return await uploadRepository.deleteFile(publicId);
  }

  /**
   * Get file info
   */
  async getFileInfo(publicId: string): Promise<RepositoryResult<Partial<ImageUploadResult>>> {
    return await uploadRepository.getFileInfo(publicId);
  }

  /**
   * Generate image variants for different sizes
   */
  async generateImageVariants(
    originalUrl: string,
    type: 'product' | 'category' | 'banner'
  ): Promise<RepositoryResult<Array<{ name: string; url: string }>>> {
    let sizes: Array<{ width: number; height: number; name: string }>;

    switch (type) {
      case 'product':
        sizes = [
          { width: 400, height: 400, name: 'thumbnail' },
          { width: 800, height: 800, name: 'medium' },
          { width: 1200, height: 1200, name: 'large' },
        ];
        break;
      case 'category':
        sizes = [
          { width: 300, height: 200, name: 'small' },
          { width: 600, height: 400, name: 'medium' },
          { width: 1200, height: 800, name: 'large' },
        ];
        break;
      case 'banner':
        sizes = [
          { width: 768, height: 400, name: 'mobile' },
          { width: 1200, height: 600, name: 'tablet' },
          { width: 1920, height: 800, name: 'desktop' },
        ];
        break;
      default:
        sizes = [
          { width: 800, height: 600, name: 'default' },
        ];
    }

    return await uploadRepository.generateImageVariants(originalUrl, sizes);
  }

  /**
   * Optimize image for web
   */
  async optimizeImage(
    imageUrl: string,
    options: {
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<RepositoryResult<string>> {
    const { quality = 80, format = 'webp', maxWidth, maxHeight } = options;

    try {
      // Build optimization parameters
      const params = new URLSearchParams();
      params.set('q', quality.toString());
      params.set('f', format);
      
      if (maxWidth) params.set('w', maxWidth.toString());
      if (maxHeight) params.set('h', maxHeight.toString());

      const separator = imageUrl.includes('?') ? '&' : '?';
      const optimizedUrl = `${imageUrl}${separator}${params.toString()}`;

      return {
        data: optimizedUrl,
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
   * Create upload progress tracker
   */
  createUploadTracker(file: File): FileUpload {
    return uploadRepository.createUploadTracker(file);
  }

  /**
   * Update upload progress
   */
  updateUploadProgress(upload: FileUpload, progress: number, status: FileUpload['status']): FileUpload {
    return uploadRepository.updateUploadProgress(upload, progress, status);
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): RepositoryResult<void> {
    return uploadRepository.validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    });
  }

  /**
   * Get file extension from MIME type
   */
  getFileExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
    };

    return mimeToExt[mimeType] || 'bin';
  }

  /**
   * Generate unique filename
   */
  generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.replace(`.${extension}`, '');
    
    return `${nameWithoutExt}_${timestamp}_${randomString}.${extension}`;
  }

  /**
   * Get file size in human readable format
   */
  getFormattedFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if file is an image
   */
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Check if file size is within limits
   */
  isFileSizeValid(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }

  /**
   * Get image dimensions from file
   */
  async getImageDimensions(file: File): Promise<RepositoryResult<{ width: number; height: number }>> {
    return new Promise((resolve) => {
      if (!this.isImageFile(file)) {
        resolve({
          data: null,
          error: {
            message: 'File is not an image',
            code: 'NOT_IMAGE'
          } as any,
          success: false,
        });
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          data: { width: img.width, height: img.height },
          error: null,
          success: true,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          data: null,
          error: {
            message: 'Failed to load image',
            code: 'IMAGE_LOAD_ERROR'
          } as any,
          success: false,
        });
      };

      img.src = objectUrl;
    });
  }
}

// Export singleton instance
export const uploadService = new UploadService();
