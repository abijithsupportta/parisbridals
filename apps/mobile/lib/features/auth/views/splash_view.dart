import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../core/responsive.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/main_layout.dart';
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

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
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
    // Wait for the animation to finish
    await Future.delayed(const Duration(milliseconds: 1500));
    
    try {
      // Check if user is logged in
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      
      if (mounted) {
        if (token != null) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const MainLayout()),
          );
        } else {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const LoginView()),
          );
        }
      }
    } catch (e) {
      // SELF-HEALING: If anything goes wrong reading local storage
      // (corrupt data, crash), automatically clear the cache and force login.
      // This prevents the dreaded "infinite loading screen" issue.
      const storage = FlutterSecureStorage();
      await storage.deleteAll(); // Nuclear wipe of local secure storage
      
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
      backgroundColor: const Color(0xFF434343), // Charcoal
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
                  colorFilter: const ColorFilter.mode(Color(0xFFF7C873), BlendMode.srcIn), // Golden Accent
                ),
                SizedBox(height: Responsive.h(24)),
                Text(
                  'PARIS BRIDALS',
                  style: TextStyle(
                    fontSize: Responsive.sp(26),
                    fontWeight: FontWeight.w800,
                    letterSpacing: Responsive.w(4),
                    color: const Color(0xFFF8F8F8), // Off-white
                  ),
                ),
                SizedBox(height: Responsive.h(8)),
                Text(
                  'ADMINISTRATION',
                  style: TextStyle(
                    fontSize: Responsive.sp(11),
                    fontWeight: FontWeight.w400,
                    letterSpacing: Responsive.w(5),
                    color: const Color(0xFFFAEBCD).withValues(alpha: 0.8), // Almond, semi-transparent
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
