import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Viewport separado de metadata (Next.js 14+)
// interactiveWidget: el teclado virtual REDIMENSIONA el contenido en lugar de sobreponerlo
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "SOFIAA — Intelligent Experience OS",
  description:
    "Sistema Operativo de Facilitación Inteligente para Interacción y Acompañamiento. Tu aliada inteligente creada por Abrahan Cruz Urrutia.",
  keywords: ["SOFIAA", "SOFIAA LAB", "Abrahan Cruz", "IA", "inteligencia artificial", "PASCALL", "BERRYWORKS"],
  authors: [{ name: "Abrahan Cruz Urrutia" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "SOFIAA — Intelligent Experience OS",
    description: "Tu aliada inteligente. Creada por Abrahan Cruz Urrutia en Monterrey, México.",
    type: "website",
    locale: "es_MX",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "SOFIAA" }],
  },
  twitter: {
    card: "summary",
    title: "SOFIAA — Intelligent Experience OS",
    description: "Tu aliada inteligente. Creada por Abrahan Cruz Urrutia en Monterrey, México.",
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
