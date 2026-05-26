import 'package:supabase_flutter/supabase_flutter.dart';

/// Supabase Client Configuration
/// 
/// This initializes the Supabase client with direct credentials.
/// The app connects directly to Supabase (not through Next.js API).
class AppSupabaseClient {
  static final AppSupabaseClient _instance = AppSupabaseClient._internal();

  factory AppSupabaseClient() {
    return _instance;
  }

  AppSupabaseClient._internal();

  /// Initialize Supabase with credentials
  Future<void> initialize() async {
    await Supabase.initialize(
      url: 'https://oxydrjfvrlnfhntkzefj.supabase.co',
      anonKey: 'sb_publishable_LcC9KOdgdOoBaDK2xRWFNQ_DnODPfLk',
      debug: true,
    );
  }

  /// Get the Supabase client instance
  SupabaseClient get client => Supabase.instance.client;

  /// Get the Auth client
  GoTrueClient get auth => Supabase.instance.client.auth;

  /// Get the Database client
  SupabaseClient get database => Supabase.instance.client;

  /// Get the Storage client
  SupabaseStorageClient get storage => Supabase.instance.client.storage;
}

/// Global instance
final supabaseClient = AppSupabaseClient();
