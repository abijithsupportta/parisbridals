import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/categories/models/category.dart';

void main() {
  group('Category Model', () {
    // ── fromJson ──────────────────────────────────────────────────────────────

    test('fromJson parses all required fields correctly', () {
      final json = {
        'id': 'abc-123',
        'name': 'Bridal Wear',
        'slug': 'bridal-wear',
        'created_at': '2026-01-01T00:00:00Z',
      };

      final category = Category.fromJson(json);

      expect(category.id, 'abc-123');
      expect(category.name, 'Bridal Wear');
      expect(category.slug, 'bridal-wear');
    });

    test('fromJson sets defaults when optional fields are missing', () {
      final json = {
        'id': 'abc-123',
        'name': 'Test',
        'slug': 'test',
        'created_at': '2026-01-01T00:00:00Z',
      };

      final category = Category.fromJson(json);

      expect(category.imageUrl, isNull);
      expect(category.parentId, isNull);
      expect(category.sortOrder, 0);
      expect(category.isActive, true);
      expect(category.description, isNull);
    });

    test('fromJson parses parent_id correctly', () {
      final json = {
        'id': 'child-id',
        'name': 'Lehenga',
        'slug': 'lehenga',
        'parent_id': 'parent-uuid-123',
        'created_at': '2026-01-01T00:00:00Z',
      };

      final category = Category.fromJson(json);

      expect(category.parentId, 'parent-uuid-123');
    });

    test('fromJson handles null values gracefully (does not throw)', () {
      final json = <String, dynamic>{
        'id': null,
        'name': null,
        'slug': null,
        'created_at': null,
      };

      // Should not throw — falls back to empty string defaults
      expect(() => Category.fromJson(json), returnsNormally);
      final category = Category.fromJson(json);
      expect(category.id, '');
      expect(category.name, '');
    });

    test('fromJson parses nested parent object', () {
      final json = {
        'id': 'child-id',
        'name': 'Lehenga',
        'slug': 'lehenga',
        'created_at': '2026-01-01T00:00:00Z',
        'parent': {
          'id': 'parent-id',
          'name': 'Bridal Wear',
          'slug': 'bridal-wear',
          'created_at': '2026-01-01T00:00:00Z',
        },
      };

      final category = Category.fromJson(json);

      expect(category.parent, isNotNull);
      expect(category.parent!.name, 'Bridal Wear');
      expect(category.parent!.id, 'parent-id');
    });

    test('fromJson parses children list', () {
      final json = {
        'id': 'main-id',
        'name': 'Bridal Wear',
        'slug': 'bridal-wear',
        'created_at': '2026-01-01T00:00:00Z',
        'children': [
          {'id': 'child-1', 'name': 'Lehenga', 'slug': 'lehenga', 'created_at': '2026-01-01T00:00:00Z'},
          {'id': 'child-2', 'name': 'Saree', 'slug': 'saree', 'created_at': '2026-01-01T00:00:00Z'},
        ],
      };

      final category = Category.fromJson(json);

      expect(category.children, hasLength(2));
      expect(category.children![0].name, 'Lehenga');
      expect(category.children![1].name, 'Saree');
    });

    // ── isMain getter ─────────────────────────────────────────────────────────

    test('isMain returns true when parentId is null (root category)', () {
      final category = Category(
        id: '1',
        name: 'Bridal Wear',
        slug: 'bridal-wear',
        createdAt: '2026-01-01T00:00:00Z',
        parentId: null, // root
      );

      expect(category.isMain, isTrue);
    });

    test('isMain returns false when parentId is set (sub-category)', () {
      final category = Category(
        id: '2',
        name: 'Lehenga',
        slug: 'lehenga',
        createdAt: '2026-01-01T00:00:00Z',
        parentId: 'parent-uuid-123',
      );

      expect(category.isMain, isFalse);
    });

    // ── toJson ────────────────────────────────────────────────────────────────

    test('toJson returns correct map with all fields', () {
      final category = Category(
        id: 'abc-123',
        name: 'Bridal Wear',
        slug: 'bridal-wear',
        description: 'For weddings',
        imageUrl: 'https://cdn.example.com/img.jpg',
        parentId: null,
        sortOrder: 2,
        isActive: true,
        isGlobal: false,
        createdAt: '2026-01-01T00:00:00Z',
      );

      final json = category.toJson();

      expect(json['name'], 'Bridal Wear');
      expect(json['slug'], 'bridal-wear');
      expect(json['description'], 'For weddings');
      expect(json['image_url'], 'https://cdn.example.com/img.jpg');
      expect(json['sort_order'], 2);
      expect(json['is_active'], true);
    });

    // ── Equatable ─────────────────────────────────────────────────────────────

    test('two categories with same fields are equal (Equatable)', () {
      final a = Category(
        id: '1', name: 'A', slug: 'a', createdAt: '2026-01-01T00:00:00Z',
      );
      final b = Category(
        id: '1', name: 'A', slug: 'a', createdAt: '2026-01-01T00:00:00Z',
      );

      expect(a, equals(b));
    });

    test('two categories with different ids are not equal', () {
      final a = Category(id: '1', name: 'A', slug: 'a', createdAt: '2026-01-01T00:00:00Z');
      final b = Category(id: '2', name: 'A', slug: 'a', createdAt: '2026-01-01T00:00:00Z');

      expect(a, isNot(equals(b)));
    });
  });
}
