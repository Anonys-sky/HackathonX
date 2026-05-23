import { motion, type TargetAndTransition } from "framer-motion";
import { cn } from "@/lib/utils";

export type MascotMood = "happy" | "worried" | "alert" | "celebrating" | "sleeping";

interface SquirryMascotProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
  showAccessory?: boolean;
  level?: number;
}

const moodConfig: Record<MascotMood, { bgColor: string; label: string }> = {
  happy: { bgColor: "oklch(0.92 0.08 60)", label: "Happy" },
  worried: { bgColor: "oklch(0.92 0.1 85)", label: "Worried" },
  alert: { bgColor: "oklch(0.92 0.1 25)", label: "Alert" },
  celebrating: { bgColor: "oklch(0.92 0.1 160)", label: "Celebrating" },
  sleeping: { bgColor: "oklch(0.92 0.03 260)", label: "Sleeping" },
};

function SquirryFace({ mood, size }: { mood: MascotMood; size: number }) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.36;

  const eyeLX = cx - r * 0.32;
  const eyeRX = cx + r * 0.32;
  const eyeY = cy - r * 0.05;
  const eyeR = r * 0.11;

  const noseY = cy + r * 0.28;

  const fur = "#C4956A";
  const furDark = "#8B5E3C";
  const furLight = "#E8C9A0";
  const belly = "#F5E6D3";
  const eyeColor = "#2D1B4E";

  const earTipY = cy - r * 1.05;
  const earBaseY = cy - r * 0.55;
  const earSpread = r * 0.55;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ears */}
      <path
        d={`M ${cx - earSpread} ${earBaseY} L ${cx - earSpread * 0.5} ${earTipY} L ${cx - earSpread * 0.15} ${earBaseY} Z`}
        fill={fur}
      />
      <path
        d={`M ${cx + earSpread} ${earBaseY} L ${cx + earSpread * 0.5} ${earTipY} L ${cx + earSpread * 0.15} ${earBaseY} Z`}
        fill={fur}
      />
      <path
        d={`M ${cx - earSpread * 0.85} ${earBaseY - r * 0.05} L ${cx - earSpread * 0.45} ${earTipY + r * 0.12} L ${cx - earSpread * 0.25} ${earBaseY} Z`}
        fill={furDark}
        opacity={0.5}
      />
      <path
        d={`M ${cx + earSpread * 0.85} ${earBaseY - r * 0.05} L ${cx + earSpread * 0.45} ${earTipY + r * 0.12} L ${cx + earSpread * 0.25} ${earBaseY} Z`}
        fill={furDark}
        opacity={0.5}
      />

      {/* Head */}
      <ellipse cx={cx} cy={cy + r * 0.05} rx={r * 1.05} ry={r * 0.95} fill={fur} />
      <ellipse cx={cx - r * 0.2} cy={cy - r * 0.25} rx={r * 0.28} ry={r * 0.2} fill={furLight} opacity={0.55} />

      {/* Belly / muzzle */}
      <ellipse cx={cx} cy={cy + r * 0.35} rx={r * 0.55} ry={r * 0.42} fill={belly} />

      {/* Eyes */}
      {mood === "sleeping" ? (
        <>
          <path d={`M ${eyeLX - eyeR * 1.2} ${eyeY} Q ${eyeLX} ${eyeY - eyeR * 1.5} ${eyeLX + eyeR * 1.2} ${eyeY}`} stroke={eyeColor} strokeWidth={r * 0.06} fill="none" strokeLinecap="round" />
          <path d={`M ${eyeRX - eyeR * 1.2} ${eyeY} Q ${eyeRX} ${eyeY - eyeR * 1.5} ${eyeRX + eyeR * 1.2} ${eyeY}`} stroke={eyeColor} strokeWidth={r * 0.06} fill="none" strokeLinecap="round" />
        </>
      ) : mood === "alert" ? (
        <>
          <circle cx={eyeLX} cy={eyeY} r={eyeR * 1.35} fill="white" />
          <circle cx={eyeRX} cy={eyeY} r={eyeR * 1.35} fill="white" />
          <circle cx={eyeLX} cy={eyeY} r={eyeR * 0.8} fill={eyeColor} />
          <circle cx={eyeRX} cy={eyeY} r={eyeR * 0.8} fill={eyeColor} />
          <circle cx={eyeLX + eyeR * 0.28} cy={eyeY - eyeR * 0.28} r={eyeR * 0.28} fill="white" />
          <circle cx={eyeRX + eyeR * 0.28} cy={eyeY - eyeR * 0.28} r={eyeR * 0.28} fill="white" />
        </>
      ) : mood === "worried" ? (
        <>
          <circle cx={eyeLX} cy={eyeY + eyeR * 0.25} r={eyeR} fill={eyeColor} />
          <circle cx={eyeRX} cy={eyeY + eyeR * 0.25} r={eyeR} fill={eyeColor} />
          <circle cx={eyeLX + eyeR * 0.28} cy={eyeY - eyeR * 0.05} r={eyeR * 0.32} fill="white" />
          <circle cx={eyeRX + eyeR * 0.28} cy={eyeY - eyeR * 0.05} r={eyeR * 0.32} fill="white" />
          <path d={`M ${eyeLX - eyeR} ${eyeY - eyeR * 1.1} L ${eyeLX + eyeR * 0.2} ${eyeY - eyeR * 0.4}`} stroke={furDark} strokeWidth={r * 0.05} strokeLinecap="round" />
          <path d={`M ${eyeRX + eyeR} ${eyeY - eyeR * 1.1} L ${eyeRX - eyeR * 0.2} ${eyeY - eyeR * 0.4}`} stroke={furDark} strokeWidth={r * 0.05} strokeLinecap="round" />
        </>
      ) : mood === "celebrating" ? (
        <>
          <path d={`M ${eyeLX - eyeR} ${eyeY + eyeR * 0.15} Q ${eyeLX} ${eyeY - eyeR * 1.1} ${eyeLX + eyeR} ${eyeY + eyeR * 0.15}`} stroke={eyeColor} strokeWidth={r * 0.08} fill="none" strokeLinecap="round" />
          <path d={`M ${eyeRX - eyeR} ${eyeY + eyeR * 0.15} Q ${eyeRX} ${eyeY - eyeR * 1.1} ${eyeRX + eyeR} ${eyeY + eyeR * 0.15}`} stroke={eyeColor} strokeWidth={r * 0.08} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx={eyeLX} cy={eyeY} r={eyeR} fill={eyeColor} />
          <circle cx={eyeRX} cy={eyeY} r={eyeR} fill={eyeColor} />
          <circle cx={eyeLX + eyeR * 0.28} cy={eyeY - eyeR * 0.28} r={eyeR * 0.32} fill="white" />
          <circle cx={eyeRX + eyeR * 0.28} cy={eyeY - eyeR * 0.28} r={eyeR * 0.32} fill="white" />
        </>
      )}

      {/* Nose */}
      <ellipse cx={cx} cy={noseY} rx={r * 0.1} ry={r * 0.08} fill={furDark} />

      {/* Mouth */}
      {mood === "happy" || mood === "celebrating" ? (
        <path d={`M ${cx - r * 0.18} ${noseY + r * 0.12} Q ${cx} ${noseY + r * 0.32} ${cx + r * 0.18} ${noseY + r * 0.12}`} stroke={eyeColor} strokeWidth={r * 0.05} fill="none" strokeLinecap="round" />
      ) : mood === "worried" || mood === "alert" ? (
        <path d={`M ${cx - r * 0.15} ${noseY + r * 0.22} Q ${cx} ${noseY + r * 0.08} ${cx + r * 0.15} ${noseY + r * 0.22}`} stroke={eyeColor} strokeWidth={r * 0.05} fill="none" strokeLinecap="round" />
      ) : (
        <path d={`M ${cx - r * 0.12} ${noseY + r * 0.15} L ${cx + r * 0.12} ${noseY + r * 0.15}`} stroke={eyeColor} strokeWidth={r * 0.05} fill="none" strokeLinecap="round" />
      )}

      {/* Cheek fluff */}
      {(mood === "happy" || mood === "celebrating") && (
        <>
          <ellipse cx={cx - r * 0.72} cy={cy + r * 0.15} rx={r * 0.2} ry={r * 0.14} fill={furDark} opacity={0.2} />
          <ellipse cx={cx + r * 0.72} cy={cy + r * 0.15} rx={r * 0.2} ry={r * 0.14} fill={furDark} opacity={0.2} />
        </>
      )}

      {mood === "sleeping" && (
        <>
          <text x={cx + r * 0.55} y={cy - r * 0.55} fontSize={r * 0.26} fill={eyeColor} opacity={0.6} fontWeight="bold">z</text>
          <text x={cx + r * 0.75} y={cy - r * 0.78} fontSize={r * 0.2} fill={eyeColor} opacity={0.5} fontWeight="bold">z</text>
          <text x={cx + r * 0.9} y={cy - r * 0.98} fontSize={r * 0.16} fill={eyeColor} opacity={0.4} fontWeight="bold">z</text>
        </>
      )}
    </svg>
  );
}

export function SquirryMascot({ mood = "happy", size = 120, className, level = 1 }: SquirryMascotProps) {
  const config = moodConfig[mood];

  const motionVariants: Record<MascotMood, TargetAndTransition> = {
    happy: { y: [0, -8, 0], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const } },
    worried: { rotate: [-3, 3, -3], transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" as const } },
    alert: { scale: [1, 1.04, 1], transition: { duration: 0.4, repeat: Infinity, ease: "easeInOut" as const } },
    celebrating: { y: [0, -12, -6, -12, 0], scale: [1, 1.05, 1.02, 1.05, 1], transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" as const } },
    sleeping: { y: [0, -2, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } },
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-40"
        style={{ background: config.bgColor, transform: "scale(0.85)" }}
      />
      <motion.div key={mood} animate={motionVariants[mood]} className="relative z-10">
        <SquirryFace mood={mood} size={size} />
      </motion.div>
      {level > 1 && (
        <div
          className="absolute -bottom-1 -right-1 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-md"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            background: "linear-gradient(135deg, oklch(0.78 0.18 85), oklch(0.65 0.22 25))",
            fontSize: size * 0.1,
          }}
        >
          {level}
        </div>
      )}
    </div>
  );
}

export function MoodBadge({ mood }: { mood: MascotMood }) {
  const config = moodConfig[mood];
  const colorMap: Record<MascotMood, string> = {
    happy: "bg-green-100 text-green-700",
    worried: "bg-yellow-100 text-yellow-700",
    alert: "bg-red-100 text-red-700",
    celebrating: "bg-purple-100 text-purple-700",
    sleeping: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", colorMap[mood])}>
      {config.label}
    </span>
  );
}
