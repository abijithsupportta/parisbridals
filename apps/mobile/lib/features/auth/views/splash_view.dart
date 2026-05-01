import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../core/responsive.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/main_layout.dart';
import '../../../core/api_client.dart';
import 'login_view.dart';

class SplashView extends StatefulWidget {
  const SplashView({super.key});

  @override
  State<SplashView> createState() => _SplashViewState();
}

class _SplashViewState extends State<SplashView> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  String _statusMessage = 'Loading...';

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );

    _slideAnimation = Tween<Offset>(begin: const Offset(0, 0.5), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );

    _controller.forward();

    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    try {
      setState(() => _statusMessage = 'Connecting...');

      // Preload token into cache immediately
      await apiClientInstance.preloadToken();

      setState(() => _statusMessage = 'Verifying...');

      // Check if user is logged in
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');

      // Small delay to show animation completing
      await Future.delayed(const Duration(milliseconds: 300));

      final hasToken = token != null;
      final message = hasToken ? 'Welcome back!' : 'Please sign in';
      final destination = hasToken
          ? MaterialPageRoute(builder: (_) => const MainLayout())
          : MaterialPageRoute(builder: (_) => const LoginView());

      if (mounted) {
        setState(() => _statusMessage = message);
      }
      await Future.delayed(const Duration(milliseconds: 200));

      if (mounted) {
        Navigator.of(context).pushReplacement(destination);
      }
    } catch (e) {
      const storage = FlutterSecureStorage();
      await storage.deleteAll();

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginView()),
        );
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    return Scaffold(
      backgroundColor: const Color(0xFF434343),
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: SlideTransition(
            position: _slideAnimation,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SvgPicture.asset(
                  'assets/images/logo_paris.svg',
                  width: Responsive.w(100),
                  height: Responsive.w(100),
                  colorFilter: const ColorFilter.mode(Color(0xFFF7C873), BlendMode.srcIn),
                ),
                SizedBox(height: Responsive.h(24)),
                Text(
                  'PARIS BRIDALS',
                  style: TextStyle(
                    fontSize: Responsive.sp(26),
                    fontWeight: FontWeight.w800,
                    letterSpacing: Responsive.w(4),
                    color: const Color(0xFFF8F8F8),
                  ),
                ),
                SizedBox(height: Responsive.h(8)),
                Text(
                  'ADMINISTRATION',
                  style: TextStyle(
                    fontSize: Responsive.sp(11),
                    fontWeight: FontWeight.w400,
                    letterSpacing: Responsive.w(5),
                    color: const Color(0xFFFAEBCD).withValues(alpha: 0.8),
                  ),
                ),
                SizedBox(height: Responsive.h(32)),
                SizedBox(
                  width: Responsive.w(100),
                  child: LinearProgressIndicator(
                    backgroundColor: Colors.white24,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFF7C873)),
                  ),
                ),
                SizedBox(height: Responsive.h(12)),
                Text(
                  _statusMessage,
                  style: TextStyle(
                    fontSize: Responsive.sp(12),
                    color: Colors.white54,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
