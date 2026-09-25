import { XIcon } from "../icons";

export default function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[2.5rem] bg-base p-6 shadow-soft sm:rounded-[2.5rem]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full border border-sage/30 bg-surface text-ink"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}
