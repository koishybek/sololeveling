import type { Metadata, Viewport } from "next";
import { Lora, Onest } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { Toaster } from "@/components/toast";
import { APP_NAME } from "@/lib/app";
import "./globals.css";

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  variable: "--font-onest",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin", "cyrillic"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — трекер калорий`,
  description: "Считай калории легко: логируй еду по фото, голосом или через поиск.",
  manifest: "/manifest.webmanifest",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#141416",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${onest.variable} ${lora.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
        <Toaster />
      </body>
    </html>
  );
}
