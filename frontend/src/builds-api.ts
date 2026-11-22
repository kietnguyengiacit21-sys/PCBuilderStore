import { apiGet, apiSend } from "./api-client";

export interface SavedBuildItem {
  slot: string;
  modelCode: string;
  productName: string;
  productType: string;
  imageUrl: string | null;
  quantity: number;
  savedUnitPrice: number;
  currentUnitPrice: number | null;
  currencyCode: string;
  offerId: string;
  available: boolean;
}

export interface SavedBuild {
  shareCode: string;
  name: string;
  resolution: string | null;
  createdAt: string;
  mine: boolean;
  savedTotal: number;
  currentTotal: number;
  currencyCode: string | null;
  items: SavedBuildItem[];
}

export interface SavedBuildSummary {
  shareCode: string;
  name: string;
  createdAt: string;
  itemCount: number;
  savedTotal: number;
}

export const saveBuild = (input: { name: string; resolution?: string; items: { slot: string; modelCode: string }[] }) =>
  apiSend<SavedBuild>("/builds", "POST", input);

export const fetchSavedBuild = (shareCode: string, signal?: AbortSignal) =>
  apiGet<SavedBuild>(`/builds/${encodeURIComponent(shareCode)}`, signal);

export const fetchMyBuilds = (signal?: AbortSignal) => apiGet<SavedBuildSummary[]>("/builds/mine", signal);

export const deleteSavedBuild = (shareCode: string) => apiSend<void>(`/builds/${encodeURIComponent(shareCode)}`, "DELETE");

/** Link that opens the quotation page for a saved build. */
export const buildShareUrl = (shareCode: string) =>
  `${window.location.origin}/build-pc/saved?code=${encodeURIComponent(shareCode)}`;
