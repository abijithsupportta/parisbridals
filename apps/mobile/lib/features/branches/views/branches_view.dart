import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/branch.dart';
import '../providers/branch_provider.dart';
import 'branch_detail_view.dart';
import 'branch_form_view.dart';

class BranchesView extends ConsumerWidget {
  const BranchesView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final branchesAsync = ref.watch(branchesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Branches'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => BranchFormView(),
                ),
              );
            },
          ),
        ],
      ),
      body: branchesAsync.when(
        data: (branches) {
          if (branches.isEmpty) {
            return const Center(
              child: Text('No branches found'),
            );
          }
          return ListView.builder(
            itemCount: branches.length,
            itemBuilder: (context, index) {
              final branch = branches[index];
              return BranchListItem(
                branch: branch,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => BranchDetailView(branch: branch),
                    ),
                  );
                },
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Error: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(branchesProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class BranchListItem extends StatelessWidget {
  final Branch branch;
  final VoidCallback onTap;

  const BranchListItem({
    super.key,
    required this.branch,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        title: Text(branch.name),
        subtitle: Text(branch.address),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (branch.isMain)
              const Chip(
                label: Text('Main', style: TextStyle(fontSize: 12)),
                backgroundColor: Colors.blue,
                labelStyle: TextStyle(color: Colors.white),
              ),
            if (!branch.isActive)
              const Chip(
                label: Text('Inactive', style: TextStyle(fontSize: 12)),
                backgroundColor: Colors.grey,
                labelStyle: TextStyle(color: Colors.white),
              ),
          ],
        ),
        onTap: onTap,
      ),
    );
  }
}
