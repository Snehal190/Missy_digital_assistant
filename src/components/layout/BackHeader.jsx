import { Link } from "react-router-dom";
import { ChevronLeftIcon } from "../icons";

// Header for a sub-screen reached from Settings (or another sub-screen) that
// needs its own back navigation, rather than the gear-icon PageHeader used
// by top-level tabs.
export default function BackHeader({ to, eyebrow, title, actions }) {
  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-14">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to={to}
          aria-label="Back"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface shadow-soft"
        >
          <ChevronLeftIcon className="h-5 w-5 text-ink" />
        </Link>
        <div className="min-w-0">
          {eyebrow && <p className="truncate text-xs font-bold uppercase tracking-widest text-sage">{eyebrow}</p>}
          <h1 className="truncate text-[24px] font-black leading-tight text-ink">{title}</h1>
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
