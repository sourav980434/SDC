import { AuthProvider } from "@/context/AuthContext";
import { HotkeyProvider } from "@/context/HotkeyContext";
import ResolutionScaler from "@/components/ResolutionScaler";
import "./globals.css";

export const metadata = {
  title: "Santoshpur Diagnostic Centre - Management Panel",
  description: "Web Portal for Santoshpur Diagnostic Centre & Polyclinic",
  viewport: "width=device-width, initial-scale=1.0",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ResolutionScaler>
            <HotkeyProvider>
              {children}
            </HotkeyProvider>
          </ResolutionScaler>
        </AuthProvider>
      </body>
    </html>
  );
}
