const PATHS = {
  home: "M3 8.5 8 4l5 4.5V13H3z",
  upload: "M8 11V3m0 0L5 6m3-3 3 3M3 13h10",
  plus: "M8 3v10M3 8h10",
  check: "m3 8.5 3.2 3L13 4.5",
  x: "m4 4 8 8M12 4l-8 8",
  download: "M8 3v8m0 0L5 8m3 3 3-3M3 13h10",
  pencil: "m3 13 .7-3L10.5 3.2a1.2 1.2 0 0 1 1.7 0l.6.6a1.2 1.2 0 0 1 0 1.7L6 12.3z",
  logout: "M6.5 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.5M10 5.5 12.5 8 10 10.5M12.5 8H6.5",
  menu: "M2.5 4.5h11M2.5 8h11M2.5 11.5h11",
  "chevron-left": "m9.5 4-4 4 4 4",
  "chevron-right": "m6.5 4 4 4-4 4",
  "arrow-up": "M8 13V3m0 0L4.5 6.5M8 3l3.5 3.5",
  "arrow-down": "M8 3v10m0 0 3.5-3.5M8 13 4.5 9.5",
  sort: "m5 6.5 3-3 3 3M5 9.5l3 3 3-3"
};

const SHAPES = {
  user: (<><circle cx="8" cy="5.5" r="2.5" /><path d="M3 13c.5-2.5 2.5-3.5 5-3.5s4.5 1 5 3.5" /></>),
  users: (<><circle cx="6" cy="5.5" r="2.2" /><path d="M2 13c.4-2.2 2-3.2 4-3.2s3.6 1 4 3.2M10.5 3.6a2.2 2.2 0 0 1 0 4M12 9.8c1.2.4 1.9 1.4 2 3.2" /></>),
  clock: (<><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2 1.3" /></>),
  search: (<><circle cx="7" cy="7" r="4" /><path d="m10 10 3 3" /></>),
  file: (<><path d="M4 2.5h5l3 3V13.5H4z" /><path d="M9 2.5v3h3M6 8.5h4M6 10.5h4" /></>),
  key: (<><circle cx="5.5" cy="10.5" r="2.5" /><path d="m7.5 8.5 5-5M10.5 5.5l1.5 1.5" /></>),
  lock: (<><rect x="3.5" y="7" width="9" height="6" rx="1.5" /><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" /></>),
  more: (<><circle cx="3.5" cy="8" r=".7" /><circle cx="8" cy="8" r=".7" /><circle cx="12.5" cy="8" r=".7" /></>),
  eye: (<><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" /></>),
  "eye-off": (<><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" /><path d="m3 13 10-10" /></>),
  alert: (<><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.5M8 10.8v.01" /></>),
  table: (<><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><path d="M2.5 6.5h11M2.5 10h11M6.5 6.5V13" /></>),
  chart: (<><path d="M3 13V3M3 13h10" /><path d="M6 10V8M9 10V5M12 10V7" /></>),
  calendar: (<><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 7h11M5.5 3.5V5M10.5 3.5V5" /></>),
  "message-square": (<><rect x="2" y="2.5" width="12" height="9" rx="1.5" /><path d="M4.5 11.5 3 13.5l3-2h6.5" /></>),
  star: (<><path d="M8 2.5l1.5 3.2 3.5.5-2.5 2.4.6 3.4L8 10.5 4.9 12l.6-3.4L3 6.2l3.5-.5z" /></>),
  bell: (<><path d="M8 2.5a4 4 0 0 1 4 4V10H4V6.5a4 4 0 0 1 4-4z" /><path d="M6.5 10v.5a1.5 1.5 0 0 0 3 0V10" /></>),
  "check-square": (<><rect x="3" y="3" width="10" height="10" rx="1.5" /><path d="m5.5 8 2 2 3-3" /></>),
  briefcase: (<><rect x="2.5" y="5.5" width="11" height="8" rx="1.5" /><path d="M5.5 5.5V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M2.5 9.5h11" /></>),
  "book-open": (<><path d="M8 4.5C6.5 3.5 4 3.5 2.5 4.5V13c1.5-1 4-1 5.5 0 1.5-1 4-1 5.5 0V4.5C12 3.5 9.5 3.5 8 4.5z" /><path d="M8 4.5V13" /></>),
  "bar-chart": (<><path d="M3 13V3M3 13h10" /><rect x="5" y="8" width="2" height="5" /><rect x="9" y="5" width="2" height="8" /></>),
  shield: (<><path d="M8 2 3 4v4c0 3 2.5 5.5 5 6 2.5-.5 5-3 5-6V4z" /></>)
};

export default function Icon({ name, className }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      {SHAPES[name] || <path d={PATHS[name]} />}
    </svg>
  );
}
