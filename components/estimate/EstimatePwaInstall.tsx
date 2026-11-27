"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

const isIosSafari = () => {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && !/CriOS|FxiOS|EdgiOS/.test(ua);
};

export default function EstimatePwaInstall({ showButton = true }: { showButton?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/estimates/sw.js", { scope: "/estimates" })
          .catch(() => {});
      } else {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => Promise.all(regs.map((r) => r.unregister())))
          .catch(() => {});
        if ("caches" in window) {
          caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k.startsWith("adco-estimates-")).map((k) => caches.delete(k))))
            .catch(() => {});
        }
      }
    }

    if (!showButton || isStandalone()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if (isIosSafari()) setShowIosHint(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [showButton]);

  if (!showButton) return null;

  if (deferredPrompt) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === "accepted") setDeferredPrompt(null);
        }}
        className="min-h-11 px-3 rounded-lg bg-[#e0c48a] text-sm sm:text-base font-semibold text-[#14120f] hover:bg-[#d1b16f] transition-colors"
      >
        Install App
      </button>
    );
  }

  if (showIosHint) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIosHelpOpen(true)}
          className="min-h-11 px-3 rounded-lg border border-[#a88a55]/60 text-sm text-[#e0c48a] hover:bg-[#26221c] transition-colors"
        >
          Install App
        </button>
        {iosHelpOpen && (
          <div
            role="dialog"
            aria-label="Install Adco Estimates"
            className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
            onClick={() => setIosHelpOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-white text-[#26221c] border border-[#e4d9c3] p-5 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-playfair text-xl text-[#5c4726]">Install Adco Estimates</h2>
              <p className="text-sm text-[#5f574b] leading-relaxed">
                In Safari, tap the <strong>Share</strong> button, then tap{" "}
                <strong>Add to Home Screen</strong> to install this app with the Adco logo.
              </p>
              <button
                type="button"
                onClick={() => setIosHelpOpen(false)}
                className="w-full min-h-11 rounded-lg bg-[#6f5629] text-white font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
