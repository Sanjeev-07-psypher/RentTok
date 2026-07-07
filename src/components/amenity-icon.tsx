import {
  Wifi,
  Snowflake,
  Utensils,
  Droplets,
  Car,
  WashingMachine,
  Zap,
  Sofa,
  Bath,
  BookOpen,
  Cctv,
  GlassWater,
  Check,
} from "lucide-react";
import type { ComponentType } from "react";

type IconCmp = ComponentType<{ size?: number; className?: string }>;

const ICONS: Record<string, IconCmp> = {
  wifi: Wifi,
  ac: Snowflake,
  food: Utensils,
  geyser: Droplets,
  parking: Car,
  laundry: WashingMachine,
  power_backup: Zap,
  furnished: Sofa,
  attached_bathroom: Bath,
  study_table: BookOpen,
  cctv: Cctv,
  drinking_water: GlassWater,
};

export function AmenityIcon({
  value,
  size = 16,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[value] ?? Check;
  return <Icon size={size} className={className} />;
}
