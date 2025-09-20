import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: WebHost(),
    );
  }
}

class WebHost extends StatefulWidget {
  const WebHost({super.key});
  @override
  State<WebHost> createState() => _WebHostState();
}

class _WebHostState extends State<WebHost> {
  late final InAppLocalhostServer _server;
  final int _port = 8080; // standard local port
  InAppWebViewController? _controller;
  bool _serverReady = false;

  @override
  void initState() {
    super.initState();
    _server = InAppLocalhostServer(documentRoot: 'assets/www', port: _port);
    _startServer();
  }

  Future<void> _startServer() async {
    try {
      await _server.start();
      _serverReady = true;
      if (mounted) setState(() {});
      _tryLoad();
    } catch (_) {
      // small retry in case of race conditions
      await Future.delayed(const Duration(milliseconds: 300));
      try {
        await _server.start();
        _serverReady = true;
        if (mounted) setState(() {});
        _tryLoad();
      } catch (_) {}
    }
  }

  void _tryLoad() {
    final c = _controller;
    if (!_serverReady || c == null) return;
    final url = WebUri('http://127.0.0.1:/index.html'); // change path if your entry differs
    c.loadUrl(urlRequest: URLRequest(url: url));
  }

  @override
  void dispose() {
    _server.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: InAppWebView(
          onWebViewCreated: (ctrl) {
            _controller = ctrl;
            _tryLoad();
          },
          initialSettings: InAppWebViewSettings(
            javaScriptEnabled: true,
            clearCache: false,
            allowFileAccessFromFileURLs: true,
            allowUniversalAccessFromFileURLs: true,
            mediaPlaybackRequiresUserGesture: false,
          ),
          onLoadError: (c, u, code, msg) {
            debugPrint("LOAD ERROR:   @ ");
          },
          onConsoleMessage: (c, m) {
            debugPrint("CONSOLE:  ");
          },
        ),
      ),
    );
  }
}