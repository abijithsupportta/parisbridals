/**
 * Barcode Utilities
 *
 * Utilities for generating and managing product barcodes.
 * Supports automatic barcode generation and manual barcode input.
 *
 * @module lib/barcode
 */

import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';

/**
 * Generate a random barcode number
 */
export function generateBarcodeNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PRD${timestamp.slice(-6)}${random}`;
}

/**
 * Validate barcode format
 */
export function validateBarcode(barcode: string): boolean {
  // Basic validation - alphanumeric, 8-20 characters
  return /^[A-Z0-9]{8,20}$/.test(barcode);
}

/**
 * Generate barcode SVG as data URL
 */
export function generateBarcodeSVG(barcode: string, options?: {
  width?: number;
  height?: number;
  format?: string;
}): string {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, barcode, {
    width: options?.width || 2,
    height: options?.height || 100,
    format: options?.format || 'CODE128',
    displayValue: true,
    fontSize: 14,
    margin: 10,
  });
  
  return canvas.toDataURL();
}

/**
 * Generate barcode and download as PNG
 */
export async function downloadBarcode(
  barcode: string, 
  productName: string,
  options?: { width?: number; height?: number; }
): Promise<void> {
  try {
    const barcodeCanvas = document.createElement('canvas');
    JsBarcode(barcodeCanvas, barcode, {
      width: options?.width || 2,
      height: options?.height || 100,
      format: 'CODE128',
      displayValue: true,
      fontSize: 14,
      margin: 10,
    });
    
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    const padding = 20;
    const textSpace = 30;
    
    finalCanvas.width = barcodeCanvas.width + (padding * 2);
    finalCanvas.height = barcodeCanvas.height + textSpace + (padding * 2);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(barcodeCanvas, padding, padding);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    
    let displayName = productName;
    if (displayName.length > 40) {
      displayName = displayName.substring(0, 37) + '...';
    }
    
    ctx.fillText(displayName, finalCanvas.width / 2, finalCanvas.height - padding);
    
    const link = document.createElement('a');
    link.download = `barcode-${barcode}-${productName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = finalCanvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Error generating barcode:', error);
    throw new Error('Failed to generate barcode');
  }
}

/**
 * Generate multiple barcodes for bulk download
 */
export async function downloadMultipleBarcodes(
  products: Array<{ barcode: string; name: string }>,
  options?: { width?: number; height?: number; }
): Promise<void> {
  try {
    for (const product of products) {
      await downloadBarcode(product.barcode, product.name, options);
    }
  } catch (error) {
    console.error('Error generating bulk barcodes:', error);
    throw new Error('Failed to generate bulk barcodes');
  }
}

/**
 * Check if barcode is unique (placeholder for API call)
 */
export async function checkBarcodeUniqueness(barcode: string, excludeId?: string): Promise<boolean> {
  // This would typically make an API call to check uniqueness
  // For now, return true (assume unique)
  return true;
}
