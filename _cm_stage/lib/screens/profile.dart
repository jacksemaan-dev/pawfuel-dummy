import 'package:flutter/material.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        children: const [
          ListTile(leading: Icon(Icons.pets), title: Text('Dog Profiles'), subtitle: Text('Add pets, weight, breed, goals')),
          Divider(height: 0),
          ListTile(leading: Icon(Icons.settings), title: Text('Settings'), subtitle: Text('Units, language, notifications')),
          Divider(height: 0),
          ListTile(leading: Icon(Icons.info_outline), title: Text('About'), subtitle: Text('Version, support, privacy')),
        ],
      ),
    );
  }
}
