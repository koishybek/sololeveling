import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { Toaster } from "@/components/toast";
import { APP_NAME } from "@/lib/app";
import "./globals.css";

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  variable: "--font-onest",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — трекер калорий`,
  description: "Считай калории легко: логируй еду фото, голосом, текстом или штрихкодом.",
  manifest: "/manifest.webmanifest",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f7f3",
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
    <html lang="ru" className={onest.variable}>
      <body>
        {children}
        <ServiceWorkerRegister />
        <Toaster />
      </body>
    </html>
  );
}
