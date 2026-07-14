import {
  BookOpen,
  PlayCircle,
  Gift,
  ShieldCheck,
  GraduationCap,
  Code2,
  Terminal,
  Award,
  Zap,
  Rocket,
  Users,
  Star,
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  FileText,
  Video,
  Compass,
  Lightbulb,
  TrendingUp,
  Layers,
  Cpu,
  Circle,
  type LucideIcon,
} from "lucide-react";

/**
 * String-key → Lucide component map — the curated icon set the owner can pick
 * from in IconField (e.g. the homepage "why tech courses" feature cards). The
 * content tree stores only the *string key* so it stays serializable across the
 * RSC → client boundary. Keep keys stable — they're referenced in saved content.
 */
export const iconMap = {
  "book-open": BookOpen,
  "play-circle": PlayCircle,
  gift: Gift,
  "shield-check": ShieldCheck,
  "graduation-cap": GraduationCap,
  code: Code2,
  terminal: Terminal,
  award: Award,
  zap: Zap,
  rocket: Rocket,
  users: Users,
  star: Star,
  trophy: Trophy,
  target: Target,
  clock: Clock,
  "check-circle": CheckCircle2,
  "file-text": FileText,
  video: Video,
  compass: Compass,
  lightbulb: Lightbulb,
  "trending-up": TrendingUp,
  layers: Layers,
  cpu: Cpu,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof iconMap;

/** Rendered when an item has no icon key yet, or a stale/unknown one. */
export const FALLBACK_ICON: LucideIcon = Circle;

/** Every pickable key, in map order — the IconField grid iterates this. */
export const ICON_KEYS = Object.keys(iconMap) as IconKey[];

/** Tolerant resolver: unknown or missing keys fall back instead of crashing.
 *  Accepts a plain string so callers holding un-narrowed content can pass it. */
export function getIcon(key?: string | null): LucideIcon {
  return (key && iconMap[key as IconKey]) || FALLBACK_ICON;
}
