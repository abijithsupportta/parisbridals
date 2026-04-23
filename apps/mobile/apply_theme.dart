import 'dart:io';

void main() {
  final directory = Directory('c:/Personal Projects/parisbridals/apps/mobile/lib');
  
  for (final entity in directory.listSync(recursive: true)) {
    if (entity is File && entity.path.endsWith('.dart')) {
      String content = entity.readAsStringSync();
      bool changed = false;

      // User said: "F8F8F8, FAEBCD, F7C873, 434343... the first color is the primary"
      // Primary: F8F8F8 (Off-white)
      // Since F8F8F8 is primary, we will replace the main accents with F8F8F8.
      // BUT if we replace _purple (which was used for buttons and icons) with F8F8F8, 
      // we must also change text/icons on it to 434343 for contrast.
      // Actually, if F8F8F8 is primary, the background must be something else, or F8F8F8 is BOTH primary and background.
      // Let's use F8F8F8 as the main accent, 434343 as the text/background contrast.
      // To be safe and beautiful, let's assign:
      // F8F8F8 -> _primary
      // FAEBCD -> Secondary / Cards
      // F7C873 -> Tertiary / Highlights
      // 434343 -> Dark Text / Appbar / Buttons
      
      // I'll make the old purple 434343 (Charcoal) so buttons are dark. It's premium.
      if (content.contains('Color(0xFF6C63FF)')) {
        content = content.replaceAll('Color(0xFF6C63FF)', 'Color(0xFF434343)');
        changed = true;
      }
      
      // Old background F8F9FE -> F8F8F8
      if (content.contains('Color(0xFFF8F9FE)')) {
        content = content.replaceAll('Color(0xFFF8F9FE)', 'Color(0xFFF8F8F8)');
        changed = true;
      }
      
      // Old Surface F5F6FA -> FAEBCD
      if (content.contains('Color(0xFFF5F6FA)')) {
        content = content.replaceAll('Color(0xFFF5F6FA)', 'Color(0xFFFAEBCD)');
        changed = true;
      }

      if (content.contains('_purple')) {
        content = content.replaceAll('_purple', '_primary');
        changed = true;
      }

      if (changed) {
        entity.writeAsStringSync(content);
      }
    }
  }
  print('Theme colors updated globally.');
}
