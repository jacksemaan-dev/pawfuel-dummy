import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class PawFuelApp extends StatelessWidget {
  const PawFuelApp({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onWebResourceError: (e) {
            // This prints in device logs so we can spot any missing file paths.
            debugPrint('WEB ERR: ${e.errorType} ${e.description} ${e.url}');
          },
        ),
      )
      ..clearCache()
      // 👇 This is the critical line: load from the Flutter asset bundle.
      ..loadFlutterAsset('assets/www/index.html');

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: SafeArea(child: WebViewWidget(controller: controller)),
      ),
    );
  }
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PawFuelApp());
}
