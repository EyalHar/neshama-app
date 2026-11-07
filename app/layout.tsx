import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import SessionWrapper from "./components/SessionWrapper";
import NotebookCollector from "./components/NotebookCollector";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "שַׁלְהֶבֶתְ יָֽה",
  description: "חיבור אישי לתורה נביאים וכתובים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" className={`${geist.variable} h-full print:h-auto antialiased`}>
      <body className="h-full flex flex-col md:flex-row bg-stone-50 overflow-hidden print:h-auto print:overflow-visible print:block print:bg-white">
        <SessionWrapper>
          <main className="flex-1 h-full overflow-y-auto print:h-auto print:overflow-visible">{children}</main>
          <Sidebar />
          <NotebookCollector />
        </SessionWrapper>
      </body>
    </html>
  );
}
