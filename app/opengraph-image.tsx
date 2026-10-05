import { ImageResponse } from "next/og";
import { brandConfig } from "@/brand.config";
export const alt = brandConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 32,
          width: "100%",
          height: "100%",
          padding: 80,
          background: brandConfig.visualPalette.midnight,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 72 }}>{brandConfig.name}</div>
        <div style={{ fontSize: 40, color: brandConfig.visualPalette.emerald }}>
          {brandConfig.tagline}
        </div>
        <div style={{ fontSize: 28 }}>{brandConfig.description}</div>
      </div>
    ),
    size,
  );
}
