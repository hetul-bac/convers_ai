import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";

const bodyFont = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ConversAI",
  description: "ConversAI hackathon MVP",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${bodyFont.variable} ${displayFont.variable} antialiased`}
      >
        <AppShell
          initialUser={
            user
              ? {
                  email: user.email ?? null,
                  avatarUrl:
                    typeof user.user_metadata?.avatar_url === "string"
                      ? user.user_metadata.avatar_url
                      : null,
                }
              : null
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
