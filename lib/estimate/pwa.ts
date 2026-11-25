import type { Metadata, Viewport } from "next";

export const ESTIMATE_PWA_METADATA: Pick<Metadata, "manifest" | "icons" | "appleWebApp"> = {
  manifest: "/estimates/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/estimates/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/estimates/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/estimates/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Adco Estimates",
    statusBarStyle: "black-translucent",
  },
};

export const ESTIMATE_PWA_VIEWPORT: Viewport = {
  themeColor: "#14120f",
};
