import { apiGet, apiSend } from "./api-client";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ReviewSummary {
  enabled: boolean;
  average: number;
  count: number;
  distribution: Record<string, number>;
}

export interface PublicReview {
  reviewId: string;
  rating: number;
  title: string | null;
  text: string | null;
  authorName: string;
  verifiedPurchase: boolean;
  createdAt: string;
  response: string | null;
  responseAt: string | null;
}

export interface MyReview {
  reviewId: string;
  rating: number;
  title: string | null;
  text: string | null;
  status: ReviewStatus;
  createdAt: string;
}

export interface ProductReviews {
  summary: ReviewSummary;
  reviews: PublicReview[];
  mine: MyReview | null;
  purchased: boolean;
}

export interface AdminReview {
  reviewId: string;
  modelCode: string;
  productName: string;
  rating: number;
  title: string | null;
  text: string | null;
  authorName: string;
  authorEmail: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  createdAt: string;
  response: string | null;
}

export const fetchProductReviews = (modelCode: string, signal?: AbortSignal) =>
  apiGet<ProductReviews>(`/catalog/reviews?modelCode=${encodeURIComponent(modelCode)}`, signal);

export const submitReview = (modelCode: string, input: { rating: number; title: string; text: string }) =>
  apiSend<MyReview>(`/reviews?modelCode=${encodeURIComponent(modelCode)}`, "POST", input);

export const deleteReview = (modelCode: string) =>
  apiSend<void>(`/reviews?modelCode=${encodeURIComponent(modelCode)}`, "DELETE");

export const fetchAdminReviews = (status: ReviewStatus | "", signal?: AbortSignal) =>
  apiGet<AdminReview[]>(`/admin/reviews${status ? `?status=${status}` : ""}`, signal);

export const moderateReview = (reviewId: string, status: ReviewStatus, note = "") =>
  apiSend<AdminReview>(`/admin/reviews/${encodeURIComponent(reviewId)}/status`, "PATCH", { status, note });

export const respondToReview = (reviewId: string, text: string) =>
  apiSend<AdminReview>(`/admin/reviews/${encodeURIComponent(reviewId)}/response`, "PUT", { text });
