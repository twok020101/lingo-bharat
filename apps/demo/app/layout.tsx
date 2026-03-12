import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "../src/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "PayBharat — Secure Payments",
  description: "India's smartest payment app",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
