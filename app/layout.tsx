import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "התנ״ך שבקרבי",
  description: "חיבור אישי לדברי הקודש",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col md:flex-row bg-stone-50">
        <main className="flex-1 min-h-screen">{children}</main>
        <Sidebar />
      </body>
    </html>
  );
}
