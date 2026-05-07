import 'dart:collection';

/// In-memory response cache for API calls.
///
/// Implements the Stale-While-Revalidate (SWR) pattern:
/// 1. First call: fetches from network, caches response
/// 2. Subsequent calls within [staleDuration]: returns cached data instantly (0ms)
/// 3. After [staleDuration]: returns cached data instantly AND triggers background refresh
/// 4. After [maxAge]: cache is expired, fetches fresh data
///
/// This makes READ operations feel instant on repeat visits.
///
/// @module core/api_cache
class ApiResponseCache {
  static final ApiResponseCache _instance = ApiResponseCache._();
  factory ApiResponseCache() => _instance;
  ApiResponseCache._();

  /// Cached responses keyed by URL+params
  final LinkedHashMap<String, _CacheEntry> _cache = LinkedHashMap();

  /// Maximum number of cached responses (LRU eviction)
  static const int _maxEntries = 100;

  /// Duration after which data is considered "stale" but still usable.
  /// Stale data is returned instantly while a background refresh happens.
  static const Duration staleDuration = Duration(minutes: 2);

  /// Duration after which data is completely expired and must be re-fetched.
  static const Duration maxAge = Duration(minutes: 10);

  /// Generate a cache key from request path and query parameters.
  String _key(String path, Map<String, dynamic>? queryParams) {
    final params = queryParams?.entries
        .where((e) => e.value != null)
        .map((e) => '${e.key}=${e.value}')
        .join('&');
    return params != null && params.isNotEmpty ? '$path?$params' : path;
  }

  /// Get a cached response if available and not expired.
  /// Returns null if no cache exists or if cache has exceeded [maxAge].
  CacheResult? get(String path, {Map<String, dynamic>? queryParams}) {
    final key = _key(path, queryParams);
    final entry = _cache[key];
    if (entry == null) return null;

    final age = DateTime.now().difference(entry.cachedAt);

    // Expired beyond maxAge — discard
    if (age > maxAge) {
      _cache.remove(key);
      return null;
    }

    // Fresh (within staleDuration) — use directly, no refresh needed
    if (age <= staleDuration) {
      return CacheResult(data: entry.data, isStale: false);
    }

    // Stale but usable — return cached data, caller should refresh in background
    return CacheResult(data: entry.data, isStale: true);
  }

  /// Store a response in the cache.
  void put(String path, dynamic data, {Map<String, dynamic>? queryParams}) {
    final key = _key(path, queryParams);

    // LRU eviction — remove oldest entry if at capacity
    if (_cache.length >= _maxEntries && !_cache.containsKey(key)) {
      _cache.remove(_cache.keys.first);
    }

    // Remove and re-add to move to end (most recent)
    _cache.remove(key);
    _cache[key] = _CacheEntry(data: data, cachedAt: DateTime.now());
  }

  /// Invalidate specific cache entries by path prefix.
  /// e.g., invalidate('/orders') clears all order-related caches.
  void invalidate(String pathPrefix) {
    _cache.removeWhere((key, _) => key.startsWith(pathPrefix));
  }

  /// Clear the entire cache.
  void clear() {
    _cache.clear();
  }

  /// Number of cached entries (for debugging).
  int get size => _cache.length;
}

/// A single cached response entry.
class _CacheEntry {
  final dynamic data;
  final DateTime cachedAt;

  _CacheEntry({required this.data, required this.cachedAt});
}

/// Result from a cache lookup.
class CacheResult {
  /// The cached response data.
  final dynamic data;

  /// Whether the data is stale (past staleDuration but within maxAge).
  /// When true, the caller should trigger a background refresh.
  final bool isStale;

  CacheResult({required this.data, required this.isStale});
}

/// Global singleton instance.
final apiCache = ApiResponseCache();
