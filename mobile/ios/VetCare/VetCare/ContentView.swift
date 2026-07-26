//
//  ContentView.swift
//  VetCare
//
//  Created by Kalhara Tennakoon on 2026-07-24.
//

import SwiftUI

/// Destinations reachable from the welcome screen.
enum WelcomeRoute: Hashable {
    case login(AuthMode)
    case guest
}

/// Root view. Hosts the navigation stack and routes from the welcome screen.
struct ContentView: View {
    var body: some View {
        NavigationStack {
            WelcomeView()
                .navigationDestination(for: WelcomeRoute.self) { route in
                    switch route {
                    case .login(let mode):
                        LoginView(mode: mode)
                    case .guest:
                        GuestAIView()
                    }
                }
        }
        .tint(.brand)
    }
}

#Preview {
    ContentView()
}
