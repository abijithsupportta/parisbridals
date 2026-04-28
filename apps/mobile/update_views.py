import os

def update_categories_view():
    with open('apps/mobile/lib/features/categories/views/categories_view.dart', 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'package:shimmer/shimmer.dart' not in content:
        content = content.replace("import 'package:flutter/material.dart';", "import 'package:flutter/material.dart';\nimport 'package:shimmer/shimmer.dart';")
        
    content = content.replace('loading: () => const Center(child: CircularProgressIndicator(color: _primary)),', 'loading: () => _buildShimmerList(),')
    
    shimmer = """
  Widget _buildShimmerList() {
    return ListView.builder(
      padding: Responsive.only(left: 16, right: 16, top: 16, bottom: 80),
      itemCount: 6,
      itemBuilder: (_, __) => Container(
        margin: Responsive.only(bottom: 12),
        padding: Responsive.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(14)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: Responsive.r(8), offset: Offset(0, Responsive.h(2)))],
        ),
        child: Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: Row(
            children: [
              Container(width: Responsive.w(56), height: Responsive.w(56), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(14)))),
              SizedBox(width: Responsive.w(16)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(width: Responsive.w(120), height: Responsive.h(16), color: Colors.white),
                    SizedBox(height: Responsive.h(10)),
                    Container(width: Responsive.w(80), height: Responsive.h(12), color: Colors.white),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
"""
    if '_buildShimmerList' not in content:
        # insert before the last closing brace
        content = content.rsplit('}', 1)[0] + shimmer + '}\n'
        
    with open('apps/mobile/lib/features/categories/views/categories_view.dart', 'w', encoding='utf-8') as f:
        f.write(content)


def update_detail_view():
    with open('apps/mobile/lib/features/categories/views/category_detail_view.dart', 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'package:shimmer/shimmer.dart' not in content:
        content = content.replace("import 'package:flutter/material.dart';", "import 'package:flutter/material.dart';\nimport 'package:shimmer/shimmer.dart';")
        
    content = content.replace('loading: () => const Center(child: CircularProgressIndicator()),', 'loading: () => _buildChildrenShimmerList(),')
    
    shimmer = """
  Widget _buildChildrenShimmerList() {
    return Column(
      children: List.generate(3, (index) => Container(
        margin: Responsive.only(bottom: 12),
        padding: Responsive.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          border: Border.all(color: Colors.grey.withValues(alpha: 0.1)),
        ),
        child: Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: Row(
            children: [
              Container(width: Responsive.w(40), height: Responsive.w(40), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(8)))),
              SizedBox(width: Responsive.w(12)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(width: Responsive.w(100), height: Responsive.h(14), color: Colors.white),
                    SizedBox(height: Responsive.h(6)),
                    Container(width: Responsive.w(60), height: Responsive.h(10), color: Colors.white),
                  ],
                ),
              ),
            ],
          ),
        ),
      )),
    );
  }
"""
    if '_buildChildrenShimmerList' not in content:
        content = content.rsplit('}', 1)[0] + shimmer + '}\n'
        
    with open('apps/mobile/lib/features/categories/views/category_detail_view.dart', 'w', encoding='utf-8') as f:
        f.write(content)

def update_form_view():
    with open('apps/mobile/lib/features/categories/views/category_form_view.dart', 'r', encoding='utf-8') as f:
        content = f.read()

    # Default to true
    content = content.replace('_isGlobal = c?.isGlobal ?? false;', '_isGlobal = c?.isGlobal ?? true;')
    
    # Remove Global UI toggle row
    import re
    # We find _buildLabel('Global Category') down to SizedBox(height: Responsive.h(16))
    ui_regex = r"// Global Category\s*_buildToggleRow\(\s*'Global Category',\s*'Available across all branches',\s*_isGlobal,\s*\(val\) => setState\(\(\) => _isGlobal = val\),\s*\),\s*SizedBox\(height: Responsive\.h\(16\)\),"
    content = re.sub(ui_regex, '', content)

    with open('apps/mobile/lib/features/categories/views/category_form_view.dart', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    update_categories_view()
    update_detail_view()
    update_form_view()
    print("Done")
