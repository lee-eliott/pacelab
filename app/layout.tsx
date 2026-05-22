import type { Metadata } from "next";
import { DM_Mono, Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Pacelab",
  description: "Suivi de course à pied personnel",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${geist.variable} ${dmMono.variable} antialiased bg-[#0e0e0e] text-[#e8e8e8] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}