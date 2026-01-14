import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent X - Social Media Automation",
  description: "Private internal automation agent for social media content generation and posting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

