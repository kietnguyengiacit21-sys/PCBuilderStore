/**
 * Store contact details shown on the Liên hệ / policy pages and the footer.
 * Leave a value empty until the owner confirms it: empty values are hidden, never faked.
 */
export const STORE_INFO = {
  name: "PC Builder Store",
  /** e.g. "0901 234 567" — also used for the "Gọi điện" button when set. */
  hotline: "",
  /** e.g. "hotro@pcbuilderstore.vn" */
  email: "",
  /** Showroom / warehouse address. */
  address: "",
  /** e.g. "8:00 – 21:00, Thứ Hai – Chủ Nhật" */
  workingHours: "",
  /**
   * Days after delivery in which a manufacturer defect is exchanged for a new unit.
   * 0 = not stated (the policy then says customers contact the store for each case).
   */
  defectExchangeDays: 0,
};
