package com.pc_builder_store.customers;

import com.pc_builder_store.orders.OrderDtos.OrderSummary;
import com.pc_builder_store.orders.OrderManagementService;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Admin lookup across customer accounts and guest buyers (grouped by email). */
@Service
public class CustomerLookupService {

    public record CustomerSummary(
            String type,
            String userId,
            String fullName,
            String email,
            String phone,
            String customerSegment,
            String accountStatus,
            String registeredAt,
            long orderCount,
            long openOrderCount,
            BigDecimal orderValue,
            String currencyCode,
            String lastOrderAt) {}

    public record CustomerDetail(CustomerSummary customer, List<OrderSummary> orders) {}

    private static final String CUSTOMERS = """
            WITH accounts AS (
                SELECT 'ACCOUNT' AS "type", u."user_id"::text AS "user_id", u."full_name", u."email", u."phone",
                       u."customer_segment", u."account_status", u."created_at"::text AS "registered_at",
                       COUNT(o."order_id") AS "order_count",
                       COUNT(o."order_id") FILTER (WHERE o."order_status" NOT IN ('DELIVERED', 'CANCELLED')) AS "open_count",
                       COALESCE(SUM(o."total_amount") FILTER (WHERE o."order_status" <> 'CANCELLED'), 0) AS "order_value",
                       (SELECT CASE WHEN COUNT(DISTINCT oi."currency_code") = 1 THEN MIN(oi."currency_code") END
                        FROM "order_items" oi JOIN "orders" o2 ON o2."order_id" = oi."order_id"
                        WHERE o2."user_id" = u."user_id") AS "currency_code",
                       MAX(o."placed_at") AS "last_order"
                FROM "users" u
                JOIN "roles" r ON r."role_id" = u."role_id" AND r."role_code" = 'CUSTOMER'
                LEFT JOIN "orders" o ON o."user_id" = u."user_id"
                GROUP BY u."user_id"
            ), guests AS (
                SELECT 'GUEST' AS "type", NULL::text AS "user_id",
                       (ARRAY_AGG(o."customer_name" ORDER BY o."placed_at" DESC))[1] AS "full_name",
                       o."email_key" AS "email",
                       (ARRAY_AGG(o."customer_phone" ORDER BY o."placed_at" DESC))[1] AS "phone",
                       NULL::text AS "customer_segment", NULL::text AS "account_status", NULL::text AS "registered_at",
                       COUNT(*) AS "order_count",
                       COUNT(*) FILTER (WHERE o."order_status" NOT IN ('DELIVERED', 'CANCELLED')) AS "open_count",
                       COALESCE(SUM(o."total_amount") FILTER (WHERE o."order_status" <> 'CANCELLED'), 0) AS "order_value",
                       (SELECT CASE WHEN COUNT(DISTINCT oi."currency_code") = 1 THEN MIN(oi."currency_code") END
                        FROM "order_items" oi JOIN "orders" o2 ON o2."order_id" = oi."order_id"
                        WHERE o2."user_id" IS NULL AND LOWER(o2."customer_email") = o."email_key") AS "currency_code",
                       MAX(o."placed_at") AS "last_order"
                FROM (SELECT g.*, LOWER(g."customer_email") AS "email_key"
                      FROM "orders" g WHERE g."user_id" IS NULL) o
                GROUP BY o."email_key"
            )
            SELECT * FROM (SELECT * FROM accounts UNION ALL SELECT * FROM guests) c
            """;

    private final JdbcTemplate jdbc;
    private final OrderManagementService orders;

    public CustomerLookupService(JdbcTemplate jdbc, OrderManagementService orders) {
        this.jdbc = jdbc;
        this.orders = orders;
    }

    /** Matches name or email (contains) and phone by digits; a blank query lists the most recent customers. */
    @Transactional(readOnly = true)
    public List<CustomerSummary> search(String query) {
        String text = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        if (text.length() > 120) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Từ khóa tìm kiếm quá dài.");
        StringBuilder sql = new StringBuilder(CUSTOMERS);
        List<Object> parameters = new ArrayList<>();
        if (!text.isEmpty()) {
            String like = "%" + text + "%";
            sql.append(" WHERE LOWER(c.\"full_name\") LIKE ? OR LOWER(c.\"email\") LIKE ?");
            parameters.add(like);
            parameters.add(like);
            String digits = text.replaceAll("[^0-9]", "");
            if (digits.length() >= 3) {
                // The columns use a nondeterministic collation, which regular expressions reject.
                sql.append(" OR REGEXP_REPLACE(COALESCE(c.\"phone\", '') COLLATE \"C\", '[^0-9]', '', 'g') LIKE ?");
                parameters.add("%" + digits + "%");
            }
        }
        sql.append(" ORDER BY c.\"last_order\" DESC NULLS LAST, c.\"registered_at\" DESC NULLS LAST LIMIT 100");
        return jdbc.query(sql.toString(), this::map, parameters.toArray());
    }

    @Transactional(readOnly = true)
    public CustomerDetail account(String userId) {
        if (userId == null || !userId.matches("[0-9]{1,20}")) throw notFound();
        List<CustomerSummary> rows = jdbc.query(
                CUSTOMERS + " WHERE c.\"type\" = 'ACCOUNT' AND c.\"user_id\" = ?", this::map, userId);
        if (rows.isEmpty()) throw notFound();
        return new CustomerDetail(rows.getFirst(), orders.listCustomerOrders(userId));
    }

    @Transactional(readOnly = true)
    public CustomerDetail guest(String email) {
        if (email == null || email.isBlank() || email.length() > 254) throw notFound();
        List<CustomerSummary> rows = jdbc.query(
                CUSTOMERS + " WHERE c.\"type\" = 'GUEST' AND c.\"email\" = LOWER(?)", this::map, email.trim());
        if (rows.isEmpty()) throw notFound();
        return new CustomerDetail(rows.getFirst(), orders.listGuestOrders(email.trim()));
    }

    private CustomerSummary map(ResultSet row, int index) throws SQLException {
        java.sql.Timestamp last = row.getTimestamp("last_order");
        return new CustomerSummary(
                row.getString("type"),
                row.getString("user_id"),
                row.getString("full_name"),
                row.getString("email"),
                row.getString("phone"),
                row.getString("customer_segment"),
                row.getString("account_status"),
                row.getString("registered_at"),
                row.getLong("order_count"),
                row.getLong("open_count"),
                row.getBigDecimal("order_value"),
                row.getString("currency_code"),
                last == null ? null : last.toLocalDateTime().toString());
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng.");
    }
}
