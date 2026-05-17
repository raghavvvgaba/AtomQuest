import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { AppStoreProvider } from "@/store/app-store";
import "./globals.css";

export const metadata: Metadata = {
  title: "AtomQuest",
  description: "Goal setting and approval portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full font-sans" suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeProvider>
          <AppStoreProvider>{children}</AppStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
