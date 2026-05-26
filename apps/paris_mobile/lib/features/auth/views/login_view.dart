import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/components/index.dart';
import '../../../../core/responsive.dart';
import '../../../../core/theme.dart';
import '../providers/auth_provider.dart';

class LoginView extends ConsumerStatefulWidget {
  const LoginView({super.key});

  @override
  ConsumerState<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends ConsumerState<LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _togglePasswordVisibility() {
    setState(() {
      _obscurePassword = !_obscurePassword;
    });
  }

  Future<void> _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      final authNotifier = ref.read(authProvider.notifier);
      await authNotifier.signIn(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
    }
  }

  Future<void> _copyErrorToClipboard(String error) async {
    await Clipboard.setData(ClipboardData(text: error));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error copied to clipboard'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState.isLoading;
    final error = authState.error;
    final isAuthenticated = authState.isAuthenticated;

    // Navigate to home on successful authentication
    if (isAuthenticated && mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.go('/');
      });
    }

    return AppAuthContainer(
      logo: SvgPicture.asset(
        'assets/images/logo_paris.svg',
        width: context.ws(120),
        height: context.hs(120),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            const AppHeader(
              title: 'Welcome Back',
              subtitle: 'Sign in to continue',
            ),
            SizedBox(height: context.hs(40)),

            // Error Message
            if (error != null) ...[
              GestureDetector(
                onTap: () => _copyErrorToClipboard(error!),
                child: Container(
                  padding: EdgeInsets.all(context.sp(12)),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(context.sr(8)),
                    border: Border.all(color: AppColors.error),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: AppColors.error, size: context.sicon(20)),
                      SizedBox(width: context.ws(8)),
                      Expanded(
                        child: Text(
                          error!,
                          style: AppTextStyles.bodySmall(context).copyWith(
                            color: AppColors.error,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.close, size: context.sicon(16)),
                        color: AppColors.error,
                        onPressed: () => ref.read(authProvider.notifier).clearError(),
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(height: context.hs(16)),
            ],

            // Email Field
            AppTextField(
              label: 'Email',
              hint: 'Enter your email',
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              prefixIcon: Icon(Icons.email_outlined, size: context.sicon(24)),
              prefixIconColor: AppColors.secondary,
              height: context.hs(60),
              fontSize: context.ssp(18),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter your email';
                }
                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                  return 'Please enter a valid email';
                }
                return null;
              },
            ),
            SizedBox(height: context.hs(24)),

            // Password Field
            AppTextField(
              label: 'Password',
              hint: 'Enter your password',
              controller: _passwordController,
              obscureText: _obscurePassword,
              prefixIcon: Icon(Icons.lock_outline, size: context.sicon(24)),
              prefixIconColor: AppColors.secondary,
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                  size: context.sicon(24),
                  color: AppColors.secondary,
                ),
                onPressed: _togglePasswordVisibility,
              ),
              suffixIconColor: AppColors.secondary,
              height: context.hs(60),
              fontSize: context.ssp(18),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter your password';
                }
                if (value.length < 6) {
                  return 'Password must be at least 6 characters';
                }
                return null;
              },
            ),
            SizedBox(height: context.hs(32)),

            // Login Button
            AppButton(
              text: 'Login',
              onPressed: _handleLogin,
              isLoading: isLoading,
              height: context.hs(60),
              fontSize: context.ssp(18),
            ),
            SizedBox(height: context.hs(40)),

            // Footer
            const AppFooter(),
          ],
        ),
      ),
    );
  }
}
