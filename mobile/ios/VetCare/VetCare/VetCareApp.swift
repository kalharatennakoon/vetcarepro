//
//  VetCareApp.swift
//  VetCare
//
//  Created by Kalhara Tennakoon on 2026-07-24.
//

import SwiftUI

@main
struct VetCareApp: App {
    @State private var session = CustomerSession()

    var body: some Scene {
        WindowGroup {
            Group {
                if session.isLoggedIn {
                    if session.mustChangePassword {
                        ChangePasswordView()
                    } else {
                        PetOwnerHomeView()
                    }
                } else {
                    ContentView()
                }
            }
            .environment(session)
            .animation(.easeInOut(duration: 0.3), value: session.isLoggedIn)
            .animation(.easeInOut(duration: 0.3), value: session.mustChangePassword)
        }
    }
}
