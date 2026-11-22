package com.pc_builder_store.reviews;

import com.pc_builder_store.auth.AuthUserPrincipal;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Product reviews: customers write one review per product; staff approve, reject and reply. */
@Service
public class ReviewService {

    public record Summary(boolean enabled, double average, long count, Map<Integer, Long> distribution) {}

    public record Review(
            String reviewId, int rating, String title, String text, String authorName,
            boolean verifiedPurchase, String createdAt, String response, String responseAt) {}

    public record MyReview(String reviewId, int rating, String title, String text, String status, String createdAt) {}

    public record ProductReviews(Summary summary, List<Review> reviews, MyReview mine, boolean purchased) {}

    public record ReviewRequest(Integer rating, String title, String text) {}

    public record AdminReview(
            String reviewId, String modelCode, String productName, int rating, String title, String text,
            String authorName, String authorEmail, String status, boolean verifiedPurchase, String createdAt,
            String response) {}

    public record ModerationRequest(String status, String note) {}

    public record ResponseRequest(String text) {}

    private static final Set<String> STATUSES = Set.of("PENDING", "APPROVED", "REJECTED");
    private static final String VERIFIED = """
            EXISTS (SELECT 1 FROM "order_items" oi
                    JOIN "orders" o ON o."order_id" = oi."order_id"
                    JOIN "product_offers" po ON po."offer_id" = oi."offer_id"
                    WHERE o."user_id" = r."user_id" AND o."order_status" = 'DELIVERED'
                      AND po."product_id" = r."product_id")
            """;

    private final JdbcTemplate jdbc;

    public ReviewService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public ProductReviews productReviews(String modelCode, AuthUserPrincipal viewer) {
        Map<String, Object> product = product(modelCode);
        BigDecimal productId = (BigDecimal) product.get("product_id");
        boolean enabled = Boolean.TRUE.equals(product.get("reviews_enabled"));

        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) distribution.put(star, 0L);
        long count = 0;
        long total = 0;
        for (Map<String, Object> row : jdbc.queryForList("""
                SELECT "rating"::int AS "rating", COUNT(*) AS "count" FROM "product_reviews"
                WHERE "product_id" = ? AND "review_status" = 'APPROVED' GROUP BY "rating"
                """, productId)) {
            int rating = ((Number) row.get("rating")).intValue();
            long number = ((Number) row.get("count")).longValue();
            distribution.put(rating, number);
            count += number;
            total += rating * number;
        }
        double average = count == 0 ? 0 : Math.round(total * 10.0 / count) / 10.0;

        List<Review> reviews = jdbc.query("""
                SELECT r."review_id"::text AS "id", r."rating"::int AS "rating", r."review_title", r."review_text",
                       u."full_name", r."created_at"::text AS "created", resp."response_text",
                       resp."updated_at"::text AS "response_at",
                """ + VERIFIED + """
                       AS "verified"
                FROM "product_reviews" r
                JOIN "users" u ON u."user_id" = r."user_id"
                LEFT JOIN LATERAL (SELECT x."response_text", x."updated_at" FROM "product_review_responses" x
                                   WHERE x."review_id" = r."review_id" ORDER BY x."updated_at" DESC LIMIT 1) resp ON TRUE
                WHERE r."product_id" = ? AND r."review_status" = 'APPROVED'
                ORDER BY r."created_at" DESC
                LIMIT 100
                """, (row, index) -> new Review(
                        row.getString("id"), row.getInt("rating"), row.getString("review_title"),
                        row.getString("review_text"), maskName(row.getString("full_name")),
                        row.getBoolean("verified"), row.getString("created"),
                        row.getString("response_text"), row.getString("response_at")), productId);

        MyReview mine = null;
        boolean purchased = false;
        if (viewer != null && "CUSTOMER".equals(viewer.roleCode())) {
            BigDecimal userId = new BigDecimal(viewer.userId());
            List<MyReview> own = jdbc.query("""
                    SELECT "review_id"::text AS "id", "rating"::int AS "rating", "review_title", "review_text",
                           "review_status", "created_at"::text AS "created"
                    FROM "product_reviews" WHERE "product_id" = ? AND "user_id" = ?
                    """, (row, index) -> new MyReview(row.getString("id"), row.getInt("rating"),
                    row.getString("review_title"), row.getString("review_text"), row.getString("review_status"),
                    row.getString("created")), productId, userId);
            mine = own.isEmpty() ? null : own.getFirst();
            Boolean bought = jdbc.queryForObject("""
                    SELECT EXISTS (SELECT 1 FROM "order_items" oi
                                   JOIN "orders" o ON o."order_id" = oi."order_id"
                                   JOIN "product_offers" po ON po."offer_id" = oi."offer_id"
                                   WHERE o."user_id" = ? AND o."order_status" = 'DELIVERED' AND po."product_id" = ?)
                    """, Boolean.class, userId, productId);
            purchased = Boolean.TRUE.equals(bought);
        }
        return new ProductReviews(new Summary(enabled, average, count, distribution), reviews, mine, purchased);
    }

    /** Creates or edits the customer's review; any edit goes back to moderation. */
    @Transactional
    public MyReview submit(String modelCode, AuthUserPrincipal user, ReviewRequest request) {
        if (user == null || !"CUSTOMER".equals(user.roleCode())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ khách hàng mới viết được đánh giá.");
        }
        Map<String, Object> product = product(modelCode);
        if (!Boolean.TRUE.equals(product.get("reviews_enabled"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sản phẩm này đang tắt đánh giá.");
        }
        if (request == null || request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            throw badRequest("Vui lòng chọn số sao từ 1 đến 5.");
        }
        String title = trimmed(request.title(), 200, "Tiêu đề tối đa 200 ký tự.");
        String text = trimmed(request.text(), 4000, "Nội dung tối đa 4000 ký tự.");
        if (text == null || text.length() < 10) throw badRequest("Hãy viết ít nhất 10 ký tự về trải nghiệm của bạn.");
        BigDecimal productId = (BigDecimal) product.get("product_id");
        BigDecimal userId = new BigDecimal(user.userId());
        int updated = jdbc.update("""
                UPDATE "product_reviews"
                SET "rating" = ?, "review_title" = ?, "review_text" = ?, "review_status" = 'PENDING', "created_at" = CURRENT_TIMESTAMP
                WHERE "product_id" = ? AND "user_id" = ?
                """, request.rating(), title, text, productId, userId);
        if (updated == 0) {
            jdbc.update("""
                    INSERT INTO "product_reviews" ("product_id", "user_id", "rating", "review_title", "review_text", "review_status")
                    VALUES (?, ?, ?, ?, ?, 'PENDING')
                    """, productId, userId, request.rating(), title, text);
        }
        return jdbc.queryForObject("""
                SELECT "review_id"::text AS "id", "rating"::int AS "rating", "review_title", "review_text",
                       "review_status", "created_at"::text AS "created"
                FROM "product_reviews" WHERE "product_id" = ? AND "user_id" = ?
                """, (row, index) -> new MyReview(row.getString("id"), row.getInt("rating"), row.getString("review_title"),
                row.getString("review_text"), row.getString("review_status"), row.getString("created")), productId, userId);
    }

    @Transactional
    public void deleteOwn(String modelCode, AuthUserPrincipal user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập.");
        BigDecimal productId = (BigDecimal) product(modelCode).get("product_id");
        List<BigDecimal> ids = jdbc.queryForList("""
                SELECT "review_id" FROM "product_reviews" WHERE "product_id" = ? AND "user_id" = ?
                """, BigDecimal.class, productId, new BigDecimal(user.userId()));
        if (ids.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bạn chưa đánh giá sản phẩm này.");
        // Moderation history is kept (RESTRICT); remove it with the review the customer withdraws.
        jdbc.update("DELETE FROM \"product_review_moderation_history\" WHERE \"review_id\" = ?", ids.getFirst());
        jdbc.update("DELETE FROM \"product_reviews\" WHERE \"review_id\" = ?", ids.getFirst());
    }

    @Transactional(readOnly = true)
    public List<AdminReview> adminReviews(String status) {
        List<Object> parameters = new ArrayList<>();
        String filter = "";
        if (status != null && !status.isBlank()) {
            if (!STATUSES.contains(status)) throw badRequest("Trạng thái không hợp lệ.");
            filter = " WHERE r.\"review_status\" = ?";
            parameters.add(status);
        }
        return jdbc.query("""
                SELECT r."review_id"::text AS "id", p."model_code", p."product_name", r."rating"::int AS "rating",
                       r."review_title", r."review_text", u."full_name", u."email", r."review_status",
                       r."created_at"::text AS "created",
                       (SELECT x."response_text" FROM "product_review_responses" x WHERE x."review_id" = r."review_id"
                        ORDER BY x."updated_at" DESC LIMIT 1) AS "response",
                """ + VERIFIED + """
                       AS "verified"
                FROM "product_reviews" r
                JOIN "products" p ON p."product_id" = r."product_id"
                JOIN "users" u ON u."user_id" = r."user_id"
                """ + filter + """
                 ORDER BY CASE r."review_status" WHEN 'PENDING' THEN 0 ELSE 1 END, r."created_at" DESC
                LIMIT 300
                """, this::mapAdmin, parameters.toArray());
    }

    @Transactional
    public AdminReview moderate(String reviewId, ModerationRequest request, AuthUserPrincipal actor) {
        BigDecimal id = reviewId(reviewId);
        if (request == null || !STATUSES.contains(request.status())) throw badRequest("Trạng thái không hợp lệ.");
        List<String> previous = jdbc.queryForList(
                "SELECT \"review_status\" FROM \"product_reviews\" WHERE \"review_id\" = ? FOR UPDATE", String.class, id);
        if (previous.isEmpty()) throw notFound();
        jdbc.update("UPDATE \"product_reviews\" SET \"review_status\" = ? WHERE \"review_id\" = ?", request.status(), id);
        jdbc.update("""
                INSERT INTO "product_review_moderation_history" ("review_id", "previous_status", "new_status", "note", "actor_user_id")
                VALUES (?, ?, ?, ?, ?)
                """, id, previous.getFirst(), request.status(), trimmed(request.note(), 500, "Ghi chú tối đa 500 ký tự."),
                actor == null ? null : new BigDecimal(actor.userId()));
        return adminReview(id);
    }

    @Transactional
    public AdminReview respond(String reviewId, ResponseRequest request, AuthUserPrincipal actor) {
        BigDecimal id = reviewId(reviewId);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM \"product_reviews\" WHERE \"review_id\" = ?", Long.class, id) == 0) {
            throw notFound();
        }
        String text = trimmed(request == null ? null : request.text(), 4000, "Phản hồi tối đa 4000 ký tự.");
        jdbc.update("DELETE FROM \"product_review_responses\" WHERE \"review_id\" = ?", id);
        if (text != null) {
            jdbc.update("""
                    INSERT INTO "product_review_responses" ("review_id", "response_text", "actor_user_id") VALUES (?, ?, ?)
                    """, id, text, actor == null ? null : new BigDecimal(actor.userId()));
        }
        return adminReview(id);
    }

    private AdminReview adminReview(BigDecimal id) {
        return adminReviews(null).stream().filter(review -> review.reviewId().equals(id.toPlainString())).findFirst()
                .orElseThrow(ReviewService::notFound);
    }

    private AdminReview mapAdmin(ResultSet row, int index) throws SQLException {
        return new AdminReview(
                row.getString("id"), row.getString("model_code"), row.getString("product_name"), row.getInt("rating"),
                row.getString("review_title"), row.getString("review_text"), row.getString("full_name"),
                row.getString("email"), row.getString("review_status"), row.getBoolean("verified"),
                row.getString("created"), row.getString("response"));
    }

    private Map<String, Object> product(String modelCode) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT "product_id", "reviews_enabled" FROM "products" WHERE "model_code" = ? AND "product_status" = 'ACTIVE'
                """, modelCode);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm.");
        return rows.getFirst();
    }

    /** "Nguyễn Văn An" -> "Nguyễn V. A." so reviews do not expose full names. */
    static String maskName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Khách hàng";
        String[] parts = fullName.trim().split("\\s+");
        StringBuilder masked = new StringBuilder(parts[0]);
        for (int index = 1; index < parts.length; index++) {
            masked.append(' ').append(parts[index].codePoints().limit(1)
                    .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append)).append('.');
        }
        return masked.toString();
    }

    private static BigDecimal reviewId(String value) {
        if (value == null || !value.matches("[0-9]{1,20}")) throw notFound();
        return new BigDecimal(value);
    }

    private static String trimmed(String value, int max, String message) {
        if (value == null || value.isBlank()) return null;
        String text = value.trim();
        if (text.length() > max) throw badRequest(message);
        return text;
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đánh giá.");
    }
}
