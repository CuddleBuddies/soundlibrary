import React from "react";

const _ic = (paths) =>
  ({ size = 22, strokeWidth = 2, className = "", style = {}, ...rest }) =>
    React.createElement(
      "svg",
      {
        width: size, height: size, viewBox: "0 0 24 24", fill: "none",
        stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
        className, style, ...rest,
      },
      ...paths
    );

const P  = (d, key)        => <path d={d} key={key ?? d} />;
const C  = (cx, cy, r)     => <circle cx={cx} cy={cy} r={r} key={`c${cx}${cy}${r}`} />;
const L  = (x1, y1, x2, y2) => <line x1={x1} y1={y1} x2={x2} y2={y2} key={`l${x1}${y1}${x2}${y2}`} />;
const PL = (points)         => <polyline points={points} key={points} />;
const PG = (points)         => <polygon points={points} key={`pg${points}`} />;
const R  = (x, y, w, h, rx) => <rect x={x} y={y} width={w} height={h} rx={rx} key={`r${x}${y}`} />;

export const SearchIcon      = _ic([C(11, 11, 8), P("m21 21-4.3-4.3")]);
export const PlayIcon        = _ic([PG("6 3 20 12 6 21 6 3")]);
export const PauseIcon       = _ic([R(14, 4, 4, 16, 1), R(6, 4, 4, 16, 1)]);
export const DownloadIcon    = _ic([P("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"), PL("7 10 12 15 17 10"), L(12, 15, 12, 3)]);
export const UploadIcon      = _ic([P("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"), PL("17 8 12 3 7 8"), L(12, 3, 12, 15)]);
export const MusicIcon       = _ic([P("M9 18V5l12-2v13"), C(6, 18, 3), C(18, 16, 3)]);
export const XIcon           = _ic([P("M18 6 6 18"), P("m6 6 12 12", "x2")]);
export const HeadphonesIcon  = _ic([P("M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1v-7a9 9 0 0 1 18 0v7a1 1 0 0 1-1 1h-2a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3")]);
export const SlidersIcon     = _ic([L(4,21,4,14),L(4,10,4,3),L(12,21,12,12),L(12,8,12,3),L(20,21,20,16),L(20,12,20,3),L(2,14,6,14),L(10,8,14,8),L(18,16,22,16)]);
export const ClockIcon       = _ic([C(12, 12, 10), PL("12 6 12 12 16 14")]);
export const TagIcon         = _ic([P("M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"), C(7.5, 7.5, 0.5)]);
export const CheckIcon       = _ic([P("M20 6 9 17l-5-5")]);
export const SparklesIcon    = _ic([P("M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"),P("M20 3v4","sp2"),P("M22 5h-4","sp3"),P("M4 17v2","sp4"),P("M5 18H3","sp5")]);
export const FileIcon        = _ic([P("M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"), PL("14 2 14 8 20 8"), P("M10 19v-3l4 2-4 2","fi2"), C(9, 13, 0.4)]);
export const ChevronDownIcon = _ic([P("m6 9 6 6 6-6")]);
export const PencilIcon      = _ic([P("M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"), P("m15 5 4 4","p2")]);
export const FilmIcon        = _ic([R(2,2,20,20,2),L(7,2,7,22),L(17,2,17,22),L(2,12,22,12),L(2,7,7,7),L(2,17,7,17),L(17,17,22,17),L(17,7,22,7)]);
