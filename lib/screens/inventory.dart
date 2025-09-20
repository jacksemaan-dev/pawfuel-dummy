import 'package:flutter/material.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});
  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  final Map<String, double> _stock = {
    'Beef Mince': 2.0,
    'Chicken Mix': 5.0,
    'Lamb Organs': 1.0,
  };

  void _adjust(String k) async {
    final controller = TextEditingController(text: _stock[k]!.toStringAsFixed(1));
    final result = await showDialog<double>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Adjust "$k" (kg)'),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, double.tryParse(controller.text)), child: const Text('Save')),
        ],
      ),
    );
    if (result != null) setState(() => _stock[k] = result);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Inventory')),
      body: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemBuilder: (_, i) {
          final k = _stock.keys.elementAt(i);
          final v = _stock[k]!;
          return ListTile(
            leading: const Icon(Icons.inventory_2),
            title: Text(k),
            subtitle: Text('${v.toStringAsFixed(1)} kg available'),
            trailing: const Icon(Icons.edit),
            onTap: () => _adjust(k),
          );
        },
        separatorBuilder: (_, __) => const Divider(),
        itemCount: _stock.length,
      ),
    );
  }
}
