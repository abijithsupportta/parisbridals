/**
 * Product Can Delete API Route
 *
 * GET /api/products/[id]/can-delete
 * 
 * READ-ONLY safety check — verifies whether a product can be deleted
 * by checking for dependent records (orders, rentals, etc.) WITHOUT
 * actually performing any deletion.
 *
 * @module app/api/products/[id]/can-delete/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { productRepository } from '@/repository';
import { apiGuard } from '@/lib/apiGuard';

/**
 * GET /api/products/[id]/can-delete
 * 
 * Returns deletion safety information including:
 * - canDelete: boolean indicating if deletion is safe
 * - reason: string explaining why deletion is not safe (if applicable)
 * - relatedData: object with counts of dependent records
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Read-only check — does NOT delete anything
    const result = await productRepository.canDelete(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error?.message || 'Failed to check deletion safety' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        canDelete: result.data?.canDelete ?? false,
        reason: result.data?.reason,
        relatedData: result.data?.relatedData || {},
      },
    });
  } catch (error) {
    console.error('Product Can Delete API - GET Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
