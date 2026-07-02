"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "infolog.a2hs.dismissed";

/** "Add to Home Screen" prompt. Uses the native banner where available,
 *  and shows manual instructions on iOS Safari (which has no beforeinstallprompt). */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) return;

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIOS(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires the event — show the manual hint after a moment.
    if (ios) setShow(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">Add InfoLog to your home screen</p>
          <p className="mt-1 text-sm text-muted">
            {isIOS
              ? "Tap the Share icon, then “Add to Home Screen” for full-screen, app-like access."
              : "Install the app for faster, full-screen access in the field."}
          </p>
          {!isIOS && (
            <Button onClick={install} className="mt-3">
              Install app
            </Button>
          )}
        </div>
        <button onClick={dismiss} className="text-muted" aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
