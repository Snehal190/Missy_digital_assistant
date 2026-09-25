import { NavLink } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { SunIcon, BulbIcon, BookIcon, ChartIcon, MicIcon, MoonIcon, LockIcon } from "../icons";
import { vocabRepo } from "../../db/repository";

const links = [
  { to: "/", label: "Today", Icon: SunIcon, end: true },
  { to: "/ideas", label: "Ideas", Icon: BulbIcon },
  { to: "/wellness", label: "Wellness", Icon: MoonIcon },
];

function NavItem({ to, label, Icon, end, badgeCount = 0 }) {
  return (
    <NavLink to={to} end={end} aria-label={label} className="relative grid h-12 w-12 place-items-center rounded-full">
      {({ isActive }) => (
        <>
          <Icon className={`h-6 w-6 ${isActive ? "text-white" : "text-sage"}`} />
          {badgeCount > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-red text-[9px] font-bold text-white">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function BottomNav({ onVoicePlan }) {
  const wordsDueToday = useLiveQuery(() => vocabRepo.countDueToday(), []) || 0;
  const rightLinks = [
    { to: "/vocabulary", label: "Vocab", Icon: BookIcon, badgeCount: wordsDueToday },
    { to: "/review", label: "Review", Icon: ChartIcon },
    { to: "/private", label: "Private", Icon: LockIcon },
  ];

  return (
    <nav className="fixed inset-x-2 bottom-2 z-40 flex h-16 items-center justify-between rounded-[2rem] bg-charcoal px-4 shadow-soft sm:inset-x-0 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="flex items-center gap-1">
        {links.map((l) => (
          <NavItem key={l.to} {...l} />
        ))}
      </div>

      <button
        type="button"
        onClick={onVoicePlan}
        aria-label="Speak your day"
        className="absolute left-1/2 top-0 grid h-14 w-14 -translate-x-1/2 -translate-y-8 place-items-center rounded-full bg-red text-white shadow-[0_12px_30px_-8px_rgba(202,0,19,0.45)]"
        style={{ border: "4px solid var(--color-base)" }}
      >
        <MicIcon className="h-6 w-6" />
      </button>

      <div className="flex items-center gap-1">
        {rightLinks.map((l) => (
          <NavItem key={l.to} {...l} />
        ))}
      </div>
    </nav>
  );
}
