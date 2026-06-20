import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SOFIAA — Intelligent Experience OS",
  description:
    "Sistema Operativo de Facilitación Inteligente para Interacción y Acompañamiento. Tu aliada inteligente creada por Abrahan Cruz Urrutia.",
  keywords: ["SOFIAA", "SOFIAA LAB", "Abrahan Cruz", "IA", "inteligencia artificial", "PASCALL", "BERRYWORKS"],
  authors: [{ name: "Abrahan Cruz Urrutia" }],
  openGraph: {
    title: "SOFIAA — Intelligent Experience OS",
    description: "Tu aliada inteligente. Creada por Abrahan Cruz Urrutia en Monterrey, México.",
    type: "website",
    locale: "es_MX",
  },
  twitter: {
    card: "summary",
    title: "SOFIAA — Intelligent Experience OS",
    description: "Tu aliada inteligente. Creada por Abrahan Cruz Urrutia en Monterrey, México.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full font-sans">
        {children}
      </body>
    </html>
  );
}
