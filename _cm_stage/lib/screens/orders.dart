import 'package:flutter/material.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final List<String> _orders = [];

  void _addOrder() async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('New Order'),
        content: TextField(controller: controller, decoration: const InputDecoration(hintText: 'e.g. 5kg Raw Chicken Mix')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Add')),
        ],
      ),
    );
    if (result != null && result.isNotEmpty) {
      setState(() => _orders.add(result));
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order added')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      floatingActionButton: FloatingActionButton(onPressed: _addOrder, child: const Icon(Icons.add)),
      body: _orders.isEmpty
          ? const Center(child: Text('No orders yet. Tap + to add.'))
          : ListView.separated(
              padding: const EdgeInsets.all(12),
              itemBuilder: (_, i) => ListTile(
                leading: const Icon(Icons.receipt_long),
                title: Text(_orders[i]),
                trailing: IconButton(icon: const Icon(Icons.delete), onPressed: () => setState(() => _orders.removeAt(i))),
              ),
              separatorBuilder: (_, __) => const Divider(),
              itemCount: _orders.length,
            ),
    );
  }
}
