export default function Confirm({ open, title = "Are you sure?", message, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        {message && <p className="text-gray-600 mb-4">{message}</p>}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 h-10 rounded-xl border border-gray-300"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 h-10 rounded-xl text-white"
            style={{ background: "#4b0082" }}
            onClick={onConfirm}
          >
            Yes, log out
          </button>
        </div>
      </div>
    </div>
  );
}
