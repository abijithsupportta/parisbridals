/**
 * Reorder Categories API
 *
 * PATCH /api/categories/reorder
 * Accepts an array of { id, sort_order } and updates each category.
 *
 * @module app/api/categories/reorder/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const items: { id: string; sort_order: number }[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Update each category's sort_order
    const updates = items.map((item) =>
      supabase
        .from('categories')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return NextResponse.json(
      { error: 'Failed to reorder categories' },
      { status: 500 }
    );
  }
}
