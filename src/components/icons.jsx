// Minimal inline stroke icons (no external icon package) — currentColor so
// they inherit text color from their container.
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
};

export const SunIcon = ({ className }) => (
  <svg className={className} {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

export const BulbIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .8 1.7V16h5.6v-.5c0-.7.3-1.3.8-1.7A6 6 0 0 0 12 3Z" />
  </svg>
);

export const BookIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </svg>
);

export const ChartIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const GearIcon = ({ className }) => (
  <svg className={className} {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
  </svg>
);

export const MicIcon = ({ className }) => (
  <svg className={className} {...base}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
  </svg>
);

export const PlusIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CheckIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const XIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const TrashIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
  </svg>
);

export const ChevronLeftIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const SearchIcon = ({ className }) => (
  <svg className={className} {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const SparkleIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
);

export const EditIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const DownloadIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const MoonIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>
);

export const HourglassIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M6 2h12M6 22h12M6 2c0 5 4 6 6 10-2 4-6 5-6 10M18 2c0 5-4 6-6 10 2 4 6 5 6 10" />
  </svg>
);

export const LockIcon = ({ className }) => (
  <svg className={className} {...base}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const UnlockIcon = ({ className }) => (
  <svg className={className} {...base}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.6-1.8" />
  </svg>
);

export const EyeOffIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.3 5.3A9.8 9.8 0 0 1 12 5c5 0 9 4 10 7-.4 1.1-1.2 2.4-2.3 3.6M6.3 6.3C4.3 7.6 2.8 9.5 2 12c1 3 5 7 10 7 1.4 0 2.7-.3 3.9-.8" />
  </svg>
);

export const SyncIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16M3 21v-5h5" />
  </svg>
);

export const AlertIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 2.4 18a1.8 1.8 0 0 0 1.6 2.7h16a1.8 1.8 0 0 0 1.6-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z" />
  </svg>
);

export const CloudOffIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M3 3l18 18" />
    <path d="M9.5 5.2A5 5 0 0 1 19 8a4 4 0 0 1-1 7.9M6.5 6.5A4.5 4.5 0 0 0 6 15.4M5 19h9a4 4 0 0 0 1.3-.2" />
  </svg>
);

export const BellIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
    <path d="M9.5 20a2.5 2.5 0 0 0 5 0" />
  </svg>
);

export const FaceIdIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M20 8V6a2 2 0 0 0-2-2h-2M20 16v2a2 2 0 0 1-2 2h-2" />
    <path d="M9 10v1M15 10v1M9 15c.8.7 1.9 1 3 1s2.2-.3 3-1" />
  </svg>
);

export const KeyIcon = ({ className }) => (
  <svg className={className} {...base}>
    <circle cx="8" cy="15" r="4" />
    <path d="M10.5 12.5 20 3M17 6l3 3M14 9l2.5 2.5" />
  </svg>
);

export const FlipIcon = ({ className }) => (
  <svg className={className} {...base}>
    <path d="M17 2.1 21 6l-4 3.9M7 21.9 3 18l4-3.9M21 6H8a5 5 0 0 0-5 5M3 18h13a5 5 0 0 0 5-5" />
  </svg>
);
