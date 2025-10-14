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

      {/* Scrollable viewport */}
      <div className="absolute inset-0 overflow-y-auto">
        {/* Centering wrapper (pads on small screens, centers on md+) */}
        <div className="flex min-h-full items-start md:items-center justify-center p-4 md:p-8">
          {/* Dialog */}
          <div
            className={`relative w-full max-w-5xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 transition-all duration-200
              ${open ? "opacity-100 scale-100" : "opacity-0 scale-95"}
            `}
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close"
              tabIndex={open ? 0 : -1}
            >
              ✕
            </button>

            {/* Content area (this can be tall; it will scroll within the viewport) */}
            <div className="max-h-[80vh] overflow-y-auto p-4 md:p-6">
              {children}
            </div>

            {/* Optional sticky footer slot (if your child form needs a bottom bar, move it inside children) */}
          </div>
        </div>
      </div>
    </div>
  );
}



