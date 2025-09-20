import 'dart:async';
import 'package:flutter/material.dart';

// WebView explicit platform binding for iOS
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Force WKWebView on iOS to avoid null-platform / timing crashes
  try {
    WebViewPlatform.instance = WebKitWebViewPlatform();
  } catch (_) {
    // Safe on Android or when already initialized
  }

  // Report Flutter errors to Zone so TestFlight symbolicates them
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    Zone.current.handleUncaughtError(
      details.exception,
      details.stack ?? StackTrace.empty,
    );
  };

  runZonedGuarded(() {
    runApp(const MyApp());
  }, (error, stack) {
    // Optional: print('Uncaught: $error\n$stack');
  });
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: WebShell(),
    );
  }
}

class WebShell extends StatefulWidget {
  const WebShell({super.key});

  @override
  State<WebShell> createState() => _WebShellState();
}

class _WebShellState extends State<WebShell> {
  late final WebViewController _controller;
  String? errorText;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFFFFFFF))
      ..setNavigationDelegate(
        NavigationDelegate(
          onWebResourceError: (err) {
            setState(() {
              errorText = "WebView error ${err.errorCode}: ${err.description}";
            });
          },
        ),
      );

    // Try to load the local HTML asset after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _controller.loadFlutterAsset('assets/www/index.html').catchError((e) {
        setState(() {
          errorText = "Failed to load local index.html: $e";
        });
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    if (errorText != null) {
      return Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              "PawFuel couldn’t start the UI.\n\n$errorText\n\n"
              "Check that assets/www/index.html exists and is listed under `assets:` in pubspec.yaml.",
              style: const TextStyle(fontSize: 16),
            ),
          ),
        ),
      );
    }
    return Scaffold(
      body: SafeArea(
        child: WebViewWidget(controller: _controller),
      ),
    );
  }
}