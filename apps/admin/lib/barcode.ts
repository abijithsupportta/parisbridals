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
  options?: {
    width?: number;
    height?: number;
  }
): Promise<void> {
  try {
    // Create a temporary container for the barcode
    const container = document.createElement('div');
    container.style.padding = '20px';
    container.style.backgroundColor = 'white';
    container.style.display = 'inline-block';
    
    // Create barcode canvas
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcode, {
      width: options?.width || 2,
      height: options?.height || 100,
      format: 'CODE128',
      displayValue: true,
      fontSize: 14,
      margin: 10,
    });
    
    // Create product name label
    const label = document.createElement('div');
    label.textContent = productName;
    label.style.textAlign = 'center';
    label.style.marginTop = '10px';
    label.style.fontSize = '12px';
    label.style.fontFamily = 'Arial, sans-serif';
    
    container.appendChild(canvas);
    container.appendChild(label);
    
    // Convert to image and download
    const dataUrl = await html2canvas(container).then(canvas => canvas.toDataURL());
    
    const link = document.createElement('a');
    link.download = `barcode-${barcode}-${productName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
    
    // Clean up
    container.remove();
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
  options?: {
    width?: number;
    height?: number;
  }
): Promise<void> {
  try {
    const container = document.createElement('div');
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    
    for (const product of products) {
      const productContainer = document.createElement('div');
      productContainer.style.marginBottom = '30px';
      productContainer.style.pageBreakInside = 'avoid';
      
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, product.barcode, {
        width: options?.width || 2,
        height: options?.height || 80,
        format: 'CODE128',
        displayValue: true,
        fontSize: 12,
        margin: 10,
      });
      
      const label = document.createElement('div');
      label.textContent = product.name;
      label.style.textAlign = 'center';
      label.style.marginTop = '5px';
      label.style.fontSize = '11px';
      label.style.fontFamily = 'Arial, sans-serif';
      
      productContainer.appendChild(canvas);
      productContainer.appendChild(label);
      container.appendChild(productContainer);
    }
    
    const dataUrl = await html2canvas(container).then(canvas => canvas.toDataURL());
    
    const link = document.createElement('a');
    link.download = `barcodes-bulk-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    
    container.remove();
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
