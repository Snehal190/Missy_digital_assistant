export default function IconButton({ children, active, onClick, className = "", ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid h-12 w-12 place-items-center rounded-full transition-colors ${
        active ? "text-white" : "text-sage"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
