import 'package:flutter_test/flutter_test.dart';

// ─── We test the slug generation logic independently ───────────────────────
// The _generateSlug() method is private in CategoryFormView, so we replicate
// the exact same logic here. If you ever change it in the form, update here.

String generateSlug(String name) {
  return name
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-|-$'), '');
}

void main() {
  group('Slug Generation Logic', () {
    test('converts basic name to lowercase hyphenated slug', () {
      expect(generateSlug('Bridal Wear'), 'bridal-wear');
    });

    test('handles multiple spaces between words', () {
      expect(generateSlug('Bridal   Wear'), 'bridal-wear');
    });

    test('strips leading and trailing hyphens', () {
      expect(generateSlug('  Bridal Wear  '), 'bridal-wear');
    });

    test('strips special characters', () {
      expect(generateSlug('Bridal & Wear!'), 'bridal-wear');
    });

    test('handles numbers correctly', () {
      expect(generateSlug('Category 2024'), 'category-2024');
    });

    test('handles already lowercase input', () {
      expect(generateSlug('lehenga'), 'lehenga');
    });

    test('collapses multiple hyphens into one', () {
      expect(generateSlug('Bridal -- Wear'), 'bridal-wear');
    });

    test('handles empty string', () {
      expect(generateSlug(''), '');
    });

    test('handles single word', () {
      expect(generateSlug('Lehenga'), 'lehenga');
    });

    test('handles Tamil/Unicode characters (strips them)', () {
      // Unicode letters outside a-z0-9 are stripped
      final slug = generateSlug('Bridal மணப்பெண்');
      expect(slug.contains(' '), isFalse);
      expect(slug, startsWith('bridal'));
    });

    test('handles full category hierarchy names', () {
      expect(generateSlug('Main Category'), 'main-category');
      expect(generateSlug('Sub Category'), 'sub-category');
      expect(generateSlug('Variant Type A'), 'variant-type-a');
    });
  });
}
