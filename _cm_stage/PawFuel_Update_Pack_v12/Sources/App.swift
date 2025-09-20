import SwiftUI

@main
struct PawFuelApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        WebView(urlString: AppConfig.serverBaseURL.isEmpty ? "https://app.pawfuel.app" : AppConfig.serverBaseURL)
            .ignoresSafeArea()
    }
}
