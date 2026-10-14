// Server-only curated input. No historical flyer is an active campaign.
// See docs/wificonecta/REVISAO-2026-10-14.md before adding a documented campaign.
import type { Campaign } from "./campaigns";
export const wifiCampaigns: readonly Campaign[] = [];
