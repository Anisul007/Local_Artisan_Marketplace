export default function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      bg-white rounded-2xl shadow-xl max-w-lg w-[92%] p-6">
        <button className="absolute right-3 top-3 text-gray-500 hover:text-gray-900"
                onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}
