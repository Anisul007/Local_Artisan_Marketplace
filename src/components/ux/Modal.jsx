// src/components/ux/Modal.jsx
import { useEffect, useRef } from "react";

export default function Modal({ open, onClose, children }) {
  const prevOverflow = useRef(document.body.style.overflow || "");

  // Body scroll lock + ESC handler (hooks always run)
  useEffect(() => {
    if (open) {
      prevOverflow.current = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevOverflow.current;
    }

    const onKey = (e) => {
      if (open && e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow.current;
    };
  }, [open, onClose]);

  // Render container always; visually hide/disable when closed
  return (
    <div
      className={`fixed inset-0 z-[999] ${
        open ? "" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={open ? onClose : undefined}
      />

      {/* Viewport: overflow hidden so form controls its own scroll */}
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full items-start justify-center p-4 md:p-6 md:py-8">
          <div
            className={`relative flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl ring-1 ring-black/5 transition-all duration-200
              ${open ? "opacity-100 scale-100" : "opacity-0 scale-95"}
            `}
            style={{ maxHeight: "min(90vh, 800px)" }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



