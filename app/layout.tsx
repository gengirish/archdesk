import type { Metadata } from "next";
import { DM_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ArchDesk — Architecture Project Management",
  description:
    "Project management SaaS for architecture and design firms in India. Powered by IntelliForge AI.",
  keywords: [
    "architecture",
    "design",
    "project management",
    "Hubballi",
    "Karnataka",
    "IntelliForge AI",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${dmMono.variable} font-mono bg-background text-foreground antialiased`}>
          <Providers>
            {children}
            <Toaster richColors position="top-right" />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
