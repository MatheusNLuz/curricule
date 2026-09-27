import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

type HugeIconProps = {
  icon: IconSvgElement;
  label?: string;
  decorative?: boolean;
  size?: number | string;
  strokeWidth?: number;
  className?: string;
};

export function HugeIcon({
  icon,
  label,
  decorative = true,
  size = 18,
  strokeWidth = 1.8,
  className,
}: HugeIconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      aria-hidden={decorative || !label ? true : undefined}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : "img"}
    />
  );
}
