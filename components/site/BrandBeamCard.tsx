"use client";

import type { ElementType, ReactNode } from "react";
import { BorderBeam } from "@/components/ui/border-beam";

type BrandBeamCardProps = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  beamSize?: number;
  beamDuration?: number;
  beamDelay?: number;
  beamReverse?: boolean;
  beamFrom?: string;
  beamTo?: string;
  beamBorderWidth?: number;
};

export function BrandBeamCard({
  as: Tag = "div",
  className = "",
  children,
  beamSize = 400,
  beamDuration = 6,
  beamDelay = 0,
  beamReverse = false,
  beamFrom = "#136863",
  beamTo = "#136863",
  beamBorderWidth = 1,
}: BrandBeamCardProps) {
  return (
    <Tag className={`brand-card relative overflow-hidden ${className}`.trim()}>
      {children}
      <BorderBeam
        size={beamSize}
        duration={beamDuration}
        delay={beamDelay}
        reverse={beamReverse}
        colorFrom="transparent"
        colorTo={beamFrom}
        borderWidth={beamBorderWidth}
        className="from-transparent to-transparent"
      />
      <BorderBeam
        size={beamSize}
        duration={beamDuration}
        delay={beamDelay + beamDuration / 2}
        reverse={beamReverse}
        colorFrom="transparent"
        colorTo={beamTo}
        borderWidth={beamBorderWidth + 1}
        className="from-transparent to-transparent"
      />
    </Tag>
  );
}
