import { Link } from "react-router-dom";
import { GearIcon } from "../icons";
import SyncStatusIndicator from "../sync/SyncStatusIndicator";

export default function PageHeader({ eyebrow, title, badgeCount = 0 }) {
  return (
    <header className="flex items-start justify-between px-5 pt-14">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-sage">{eyebrow}</p>
        <h1 className="mt-1 text-[30px] font-black leading-tight text-ink">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <SyncStatusIndicator />
        <Link
          to="/settings"
          aria-label="Settings"
          className="relative grid h-12 w-12 place-items-center rounded-full bg-surface shadow-soft"
          style={{ border: "2px solid var(--color-base)" }}
        >
          <GearIcon className="h-5 w-5 text-ink" />
          {badgeCount > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-red text-[9px] font-bold text-white">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
