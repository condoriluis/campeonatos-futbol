import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "Campeonatos — Gestión de torneos deportivos",
    template: "%s · Campeonatos",
  },
  description: "Organiza, dirige y sigue campeonatos de fútbol, futsal, minifútbol y más: fixture, marcador en vivo, tablas y actas.",
  applicationName: "Campeonatos",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Campeonatos — Torneos deportivos en vivo",
    description: "Crea tu campeonato, sortea los grupos, genera el fixture y mantén el marcador en vivo.",
    type: "website",
    locale: "es_BO",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047857",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <div className="min-h-dvh flex flex-col">{children}</div>
          <Toaster richColors position="top-center" />
          <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}