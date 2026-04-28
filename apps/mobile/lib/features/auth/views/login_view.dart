import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/responsive.dart';
import '../../../core/main_layout.dart';
import '../../../core/providers/auth_provider.dart';

class LoginView extends ConsumerStatefulWidget {
  const LoginView({super.key});

  @override
  ConsumerState<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends ConsumerState<LoginView> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isPasswordVisible = false;

  static const _primary = Color(0xFF434343);

  void _handleLogin() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter email and password'), backgroundColor: Colors.redAccent),
      );
      return;
    }

    final success = await ref.read(authProvider.notifier).login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainLayout()),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Login failed. Please check your credentials.'), backgroundColor: Colors.redAccent),
      );
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    
    Responsive.init(context);
    
    return Scaffold(
      backgroundColor: const Color(0xFFFAEBCD), // Light premium background
      body: SafeArea(
        child: SingleChildScrollView(
          child: Container(
            height: MediaQuery.of(context).size.height - MediaQuery.of(context).padding.top,
            padding: Responsive.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),
                
                // ── Logo Area ──
                Center(
                  child: Container(
                    padding: Responsive.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: _primary.withValues(alpha: 0.15),
                          blurRadius: Responsive.r(30),
                          offset: Offset(0, Responsive.h(10)),
                        ),
                      ],
                    ),
                    child: SvgPicture.asset(
                      'assets/images/logo_paris.svg',
                      width: Responsive.icon(56),
                      height: Responsive.icon(56),
                      colorFilter: const ColorFilter.mode(_primary, BlendMode.srcIn),
                    ),
                  ),
                ),
                SizedBox(height: Responsive.h(32)),

                // ── Welcome Text ──
                Text(
                  'Welcome Back',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: Responsive.sp(28),
                    fontWeight: FontWeight.w800,
                    color: Colors.black87,
                    letterSpacing: -0.5,
                  ),
                ),
                SizedBox(height: Responsive.h(8)),
                Text(
                  'Sign in to your administration panel',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: Responsive.sp(14),
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(height: Responsive.h(48)),

                // ── Form Area ──
                Container(
                  padding: Responsive.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(Responsive.r(24)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: Responsive.r(24),
                        offset: Offset(0, Responsive.h(8)),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Email Field
                      _buildTextField(
                        controller: _emailController,
                        label: 'Email Address',
                        hint: 'admin@parisbridals.com',
                        icon: Icons.email_rounded,
                        keyboardType: TextInputType.emailAddress,
                      ),
                      SizedBox(height: Responsive.h(20)),
                      
                      // Password Field
                      _buildTextField(
                        controller: _passwordController,
                        label: 'Password',
                        hint: 'Enter your password',
                        icon: Icons.lock_rounded,
                        isPassword: true,
                      ),
                      SizedBox(height: Responsive.h(32)),

                      // Login Button
                      SizedBox(
                        width: double.infinity,
                        height: Responsive.h(56),
                        child: ElevatedButton(
                          onPressed: authState.isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _primary,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(Responsive.r(16)),
                            ),
                          ),
                          child: authState.isLoading
                              ? SizedBox(
                                  height: Responsive.icon(24),
                                  width: Responsive.icon(24),
                                  child: const CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
                                )
                              : Text(
                                  'Sign In',
                                  style: TextStyle(
                                    fontSize: Responsive.sp(16),
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const Spacer(flex: 2),
                
                // Footer
                Padding(
                  padding: Responsive.only(bottom: 24),
                  child: Text(
                    '© ${DateTime.now().year} Paris Bridals. All rights reserved.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: Responsive.sp(11),
                      color: Colors.grey[500],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    bool isPassword = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: Responsive.sp(13),
            fontWeight: FontWeight.w700,
            color: Colors.black87,
          ),
        ),
        SizedBox(height: Responsive.h(8)),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFF8F8F8),
            borderRadius: BorderRadius.circular(Responsive.r(14)),
            border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
          ),
          child: TextField(
            controller: controller,
            obscureText: isPassword && !_isPasswordVisible,
            keyboardType: keyboardType,
            style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w500),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey[400]),
              prefixIcon: Icon(icon, size: Responsive.icon(22), color: _primary.withValues(alpha: 0.7)),
              suffixIcon: isPassword
                  ? IconButton(
                      icon: Icon(
                        _isPasswordVisible ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                        color: Colors.grey[400],
                        size: Responsive.icon(22),
                      ),
                      onPressed: () => setState(() => _isPasswordVisible = !_isPasswordVisible),
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: Responsive.symmetric(horizontal: 16, vertical: 16),
            ),
          ),
        ),
      ],
    );
  }
}
