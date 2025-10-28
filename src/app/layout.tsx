import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EchoVote - Transparent Feedback Democracy",
  description: "A civic platform where every feedback submission is publicly trackable, empowering citizens and building trust in government.",
  keywords: "civic engagement, government transparency, public feedback, democracy, India, complaints, administrative services",
  authors: [{ name: "EchoVote Team" }],
  openGraph: {
    title: "EchoVote - Transparent Feedback Democracy",
    description: "Turn government feedback into transparent version-controlled issues, empowering citizens and trust.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
