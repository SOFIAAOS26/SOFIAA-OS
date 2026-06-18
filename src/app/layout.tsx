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
    "Sistema Operativo de Facilitación Inteligente para Interacción y Acompañamiento",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-[#0A0A0A] text-white font-sans">
        {children}
      </body>
    </html>
  );
}
