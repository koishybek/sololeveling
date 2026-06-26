import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { Toaster } from "@/components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Олжас E-Rank — AI калории-трекер",
  description: "AI-трекер калорий: логируй еду фото, голосом или штрихкодом.",
  manifest: "/manifest.webmanifest",
  applicationName: "E-Rank",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "E-Rank",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080c",
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
    <html lang="ru">
      <body>
        {children}
        <ServiceWorkerRegister />
        <Toaster />
      </body>
    </html>
  );
}
