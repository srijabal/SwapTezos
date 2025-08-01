import type { Metadata } from "next";
import "./globals.css";
import Navbar from "../components/navigation/Navbar";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SwapTezos",
  description: "Cross-chain swaps between Ethereum and Tezos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}>
      <body className="font-sans">
        <Providers>
          <Navbar />
          <main className="container mx-auto p-4">
            {children}
          </main>          
        </Providers>
      </body>
    </html>
  );
}