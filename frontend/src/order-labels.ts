/** Vietnamese wording for order, payment and shipment codes, shared by customer and admin screens. */

export const orderStatusText: Record<string, string> = {
  PENDING_CONFIRMATION: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị hàng",
  READY_TO_SHIP: "Sẵn sàng giao",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLATION_REQUESTED: "Đang chờ hủy",
  CANCELLED: "Đã hủy",
};

export const paymentStatusText: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PENDING: "Đang xử lý thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
  CANCELLED: "Đã hủy thanh toán",
  REFUND_PENDING: "Chờ hoàn tiền",
  REFUNDED: "Đã hoàn tiền",
  REFUND_FAILED: "Hoàn tiền thất bại",
};

export const paymentMethodText: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  SIMULATED_ONLINE: "Thanh toán trực tuyến (thử nghiệm)",
};

export const shipmentStatusText: Record<string, string> = {
  NOT_SHIPPED: "Chưa giao",
  IN_TRANSIT: "Đang vận chuyển",
  DELIVERED: "Đã giao",
  RETURNED: "Đã hoàn về",
};

export const historyActionText: Record<string, string> = {
  ORDER_CREATED: "Đặt hàng",
  ADMIN_STATUS_CHANGED: "Cập nhật trạng thái",
  ADMIN_SHIPPING_DETAILS_UPDATED: "Cập nhật vận chuyển",
  ADMIN_CANCELLATION_REQUESTED: "Cửa hàng đề nghị hủy",
  ADMIN_CANCELLATION_APPROVED: "Đã duyệt hủy",
  ADMIN_CANCELLATION_REJECTED: "Từ chối hủy",
  CUSTOMER_CANCELLATION_REQUESTED: "Khách yêu cầu hủy",
  ADMIN_REFUND_RETRIED: "Thử hoàn tiền lại",
  ADMIN_PAYMENT_CONFIRMED: "Xác nhận đã nhận tiền",
  ADMIN_REFUND_CONFIRMED: "Xác nhận đã hoàn tiền",
};

export const label = (table: Record<string, string>, code: string | null | undefined) =>
  code ? table[code] ?? code : "—";

/** Badge colour for a payment status. */
export function paymentTone(code: string | null | undefined): "success" | "warning" | "error" | "neutral" | "gold" {
  switch (code) {
    case "PAID": return "success";
    case "REFUNDED": return "neutral";
    case "FAILED": case "REFUND_FAILED": return "error";
    case "REFUND_PENDING": case "PENDING": return "gold";
    default: return "warning";
  }
}

/** Badge colour for an order status. */
export function orderTone(code: string | null | undefined): "success" | "warning" | "error" | "neutral" | "primary" | "gold" {
  switch (code) {
    case "DELIVERED": return "success";
    case "CANCELLED": return "neutral";
    case "CANCELLATION_REQUESTED": return "error";
    case "SHIPPING": return "primary";
    case "PENDING_CONFIRMATION": return "gold";
    default: return "warning";
  }
}
