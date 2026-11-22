package com.pc_builder_store.dashboard;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Operations overview for admin and sales staff. */
@Service
public class DashboardService {

    /** Revenue counts orders that were not cancelled and are paid online or delivered (cash on delivery). */
    // A plain string with explicit spaces: text blocks strip the trailing space of "(WHERE " it is joined to.
    private static final String EARNED =
            " o.\"order_status\" <> 'CANCELLED' AND (o.\"payment_status\" = 'PAID' OR o.\"order_status\" = 'DELIVERED') ";

    public record DayRevenue(String day, BigDecimal revenue, long orders) {}

    public record TopProduct(String productName, long quantity, BigDecimal revenue) {}

    public record LowStock(String modelCode, String productName, String productType, long available, long threshold) {}

    public record RecentOrder(String orderNumber, String customerName, String status, String paymentStatus,
            BigDecimal total, String placedAt) {}

    public record Overview(
            long ordersToday,
            BigDecimal revenueToday,
            BigDecimal revenue30Days,
            long orders30Days,
            BigDecimal averageOrderValue30Days,
            long newCustomers30Days,
            long pendingReviews,
            Map<String, Long> ordersByStatus,
            List<DayRevenue> revenueByDay,
            List<TopProduct> topProducts,
            List<LowStock> lowStock,
            List<RecentOrder> recentOrders) {}

    private final JdbcTemplate jdbc;

    public DashboardService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Overview overview() {
        Map<String, Object> today = jdbc.queryForMap("""
                SELECT COUNT(*) AS "orders",
                       COALESCE(SUM(o."total_amount") FILTER (WHERE """ + EARNED + """
                       ), 0) AS "revenue"
                FROM "orders" o WHERE o."placed_at" >= CURRENT_DATE
                """);
        Map<String, Object> month = jdbc.queryForMap("""
                SELECT COUNT(*) FILTER (WHERE o."order_status" <> 'CANCELLED') AS "orders",
                       COALESCE(SUM(o."total_amount") FILTER (WHERE """ + EARNED + """
                       ), 0) AS "revenue",
                       COUNT(*) FILTER (WHERE """ + EARNED + """
                       ) AS "earned_orders"
                FROM "orders" o WHERE o."placed_at" >= CURRENT_DATE - INTERVAL '29 days'
                """);
        BigDecimal revenue30 = (BigDecimal) month.get("revenue");
        long earnedOrders = ((Number) month.get("earned_orders")).longValue();
        BigDecimal average = earnedOrders == 0 ? BigDecimal.ZERO
                : revenue30.divide(BigDecimal.valueOf(earnedOrders), 0, java.math.RoundingMode.HALF_UP);

        Long newCustomers = jdbc.queryForObject("""
                SELECT COUNT(*) FROM "users" u JOIN "roles" r ON r."role_id" = u."role_id"
                WHERE r."role_code" = 'CUSTOMER' AND u."created_at" >= CURRENT_DATE - INTERVAL '29 days'
                """, Long.class);
        Long pendingReviews = jdbc.queryForObject(
                "SELECT COUNT(*) FROM \"product_reviews\" WHERE \"review_status\" = 'PENDING'", Long.class);

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (String status : List.of("PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "READY_TO_SHIP",
                "SHIPPING", "CANCELLATION_REQUESTED", "DELIVERED", "CANCELLED")) {
            byStatus.put(status, 0L);
        }
        jdbc.query("SELECT \"order_status\", COUNT(*) FROM \"orders\" GROUP BY \"order_status\"",
                (org.springframework.jdbc.core.RowCallbackHandler) row -> byStatus.put(row.getString(1), row.getLong(2)));

        List<DayRevenue> byDay = jdbc.query("""
                SELECT TO_CHAR(day, 'YYYY-MM-DD') AS "day",
                       COALESCE(SUM(o."total_amount") FILTER (WHERE """ + EARNED + """
                       ), 0) AS "revenue",
                       COUNT(o."order_id") FILTER (WHERE o."order_status" <> 'CANCELLED') AS "orders"
                FROM GENERATE_SERIES(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') day
                LEFT JOIN "orders" o ON o."placed_at" >= day AND o."placed_at" < day + INTERVAL '1 day'
                GROUP BY day ORDER BY day
                """, (row, index) -> new DayRevenue(row.getString("day"), row.getBigDecimal("revenue"), row.getLong("orders")));

        List<TopProduct> top = jdbc.query("""
                SELECT oi."product_name_snapshot" AS "name", SUM(oi."quantity") AS "quantity", SUM(oi."line_total") AS "revenue"
                FROM "order_items" oi JOIN "orders" o ON o."order_id" = oi."order_id"
                WHERE o."order_status" <> 'CANCELLED' AND o."placed_at" >= CURRENT_DATE - INTERVAL '29 days'
                  AND COALESCE(oi."is_gift_snapshot", FALSE) = FALSE
                GROUP BY oi."product_name_snapshot"
                ORDER BY SUM(oi."quantity") DESC, SUM(oi."line_total") DESC
                LIMIT 5
                """, (row, index) -> new TopProduct(row.getString("name"), row.getLong("quantity"), row.getBigDecimal("revenue")));

        // Prebuilt PCs are stocked through their components, so only component/accessory offers count here.
        List<LowStock> lowStock = jdbc.query("""
                SELECT p."model_code", p."product_name", pt."type_code",
                       GREATEST(po."stock_quantity" - po."reserved_quantity", 0) AS "available",
                       COALESCE(po."low_stock_threshold", 3) AS "threshold"
                FROM "product_offers" po
                JOIN "products" p ON p."product_id" = po."product_id"
                JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
                WHERE po."offer_status" = 'ACTIVE' AND p."product_status" = 'ACTIVE' AND pt."type_code" <> 'PC'
                  AND po."stock_quantity" - po."reserved_quantity" <= COALESCE(po."low_stock_threshold", 3)
                ORDER BY "available", p."product_name"
                LIMIT 10
                """, (row, index) -> new LowStock(row.getString("model_code"), row.getString("product_name"),
                row.getString("type_code"), row.getLong("available"), row.getLong("threshold")));

        List<RecentOrder> recent = jdbc.query("""
                SELECT "order_number", "customer_name", "order_status", "payment_status", "total_amount",
                       "placed_at"::text AS "placed"
                FROM "orders" ORDER BY "placed_at" DESC, "order_id" DESC LIMIT 6
                """, (row, index) -> new RecentOrder(row.getString("order_number"), row.getString("customer_name"),
                row.getString("order_status"), row.getString("payment_status"), row.getBigDecimal("total_amount"),
                row.getString("placed")));

        return new Overview(
                ((Number) today.get("orders")).longValue(), (BigDecimal) today.get("revenue"),
                revenue30, ((Number) month.get("orders")).longValue(), average,
                newCustomers == null ? 0 : newCustomers, pendingReviews == null ? 0 : pendingReviews,
                byStatus, byDay, top, lowStock, recent);
    }
}
