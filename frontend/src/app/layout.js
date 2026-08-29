import { AuthProvider } from "@/context/AuthContext";
import { HotkeyProvider } from "@/context/HotkeyContext";
import "./globals.css";

export const metadata = {
  title: "Santoshpur Diagnostic Centre - Management Panel",
  description: "Web Portal for Santoshpur Diagnostic Centre & Polyclinic",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <HotkeyProvider>
            {children}
          </HotkeyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
