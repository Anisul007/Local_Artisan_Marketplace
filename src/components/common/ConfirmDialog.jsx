// src/components/common/ConfirmDialog.jsx
export default function ConfirmDialog({ open, title="Are you sure?", body="", confirmLabel="Confirm", cancelLabel="Cancel", onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-xl p-5 shadow-lg">
        <h3 className="text-lg font-semibold">{title}</h3>
        {body && <p className="mt-2 text-gray-600">{body}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="px-4 py-2 rounded border" onClick={onClose}>{cancelLabel}</button>
          <button className="px-4 py-2 rounded bg-rose-600 text-white" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
