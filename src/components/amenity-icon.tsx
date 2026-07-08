import {
  Wifi,
  Snowflake,
  Utensils,
  CookingPot,
  Droplets,
  GlassWater,
  Car,
  WashingMachine,
  Zap,
  Sofa,
  Bath,
  BookOpen,
  Cctv,
  Check,
} from "lucide-react";
import type { ComponentType } from "react";

type IconCmp = ComponentType<{ size?: number; className?: string }>;

const ICONS: Record<string, IconCmp> = {
  wifi: Wifi,
  ac: Snowflake,
  food: Utensils,
  attached_kitchen: CookingPot,
  geyser: Droplets,
  water_247: GlassWater,
  parking: Car,
  laundry: WashingMachine,
  power_backup: Zap,
  furnished: Sofa,
  attached_bathroom: Bath,
  study_table: BookOpen,
  cctv: Cctv,
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
