package com.pc_builder_store.auth;

import static com.pc_builder_store.auth.StaffAccountDtos.Account;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class StaffAccountService {

    private static final Logger logger = LoggerFactory.getLogger(StaffAccountService.class);
    private static final String ACCOUNT_COLUMNS = """
            SELECT u."user_id"::text AS "userId",
                   u."full_name" AS "fullName",
                   u."email" AS "email",
                   r."role_code" AS "roleCode",
                   u."account_status" AS "accountStatus",
                   u."updated_at" AS "updatedAt"
            FROM "users" u
            JOIN "roles" r ON r."role_id" = u."role_id"
            """;

    private final JdbcTemplate jdbc;

    public StaffAccountService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Account> listAccounts(String search) {
        String query = search == null ? "" : search.trim();
        if (query.length() > 120) {
            throw new StaffAccountException(HttpStatus.BAD_REQUEST, "Từ khóa tìm kiếm quá dài.");
        }
        if (!StringUtils.hasText(query)) {
            return jdbc.query(ACCOUNT_COLUMNS + """
                    ORDER BY LOWER(u."full_name"), u."user_id"
                    LIMIT 200
                    """, this::mapAccount);
        }
        String pattern = "%" + query.toLowerCase(Locale.ROOT) + "%";
        return jdbc.query(ACCOUNT_COLUMNS + """
                WHERE LOWER(u."full_name") LIKE ?
                   OR LOWER(u."email") LIKE ?
                ORDER BY LOWER(u."full_name"), u."user_id"
                LIMIT 200
                """, this::mapAccount, pattern, pattern);
    }

    @Transactional
    public Account changeRole(String userId, String requestedRole, AuthUserPrincipal actor) {
        if (actor == null || !"ADMIN".equals(actor.roleCode())) {
            throw new StaffAccountException(HttpStatus.FORBIDDEN, "Bạn không có quyền quản lý tài khoản.");
        }
        if (userId == null || !userId.matches("[0-9]{1,20}")
                || new BigDecimal(userId).signum() <= 0) {
            throw new StaffAccountException(HttpStatus.BAD_REQUEST, "Mã tài khoản không hợp lệ.");
        }
        if (requestedRole == null
                || !("CUSTOMER".equals(requestedRole) || "SALES".equals(requestedRole))) {
            throw new StaffAccountException(HttpStatus.BAD_REQUEST, "Vai trò mới không hợp lệ.");
        }

        BigDecimal targetId = new BigDecimal(userId);
        Account current;
        try {
            current = jdbc.queryForObject(ACCOUNT_COLUMNS + """
                    WHERE u."user_id" = ?
                    FOR UPDATE OF u
                    """, this::mapAccount, targetId);
        } catch (EmptyResultDataAccessException exception) {
            throw new StaffAccountException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
        }

        if ("ADMIN".equals(current.roleCode())) {
            long activeAdmins = jdbc.queryForObject("""
                    SELECT COUNT(*)
                    FROM "users" u
                    JOIN "roles" r ON r."role_id" = u."role_id"
                    WHERE r."role_code" = 'ADMIN'
                      AND u."account_status" = 'ACTIVE'
                    """, Long.class);
            if ("ACTIVE".equals(current.accountStatus()) && activeAdmins <= 1) {
                throw new StaffAccountException(
                        HttpStatus.CONFLICT, "Không thể thay đổi Admin hoạt động cuối cùng.");
            }
            throw new StaffAccountException(HttpStatus.CONFLICT, "Không thể thay đổi tài khoản Admin.");
        }
        if (!"CUSTOMER".equals(current.roleCode()) && !"SALES".equals(current.roleCode())) {
            throw new StaffAccountException(HttpStatus.CONFLICT, "Vai trò hiện tại không thể được quản lý tại đây.");
        }
        if (requestedRole.equals(current.roleCode())) {
            return current;
        }

        BigDecimal roleId = jdbc.queryForObject(
                "SELECT \"role_id\" FROM \"roles\" WHERE \"role_code\" = ?",
                BigDecimal.class,
                requestedRole);
        if (roleId == null) {
            throw new IllegalStateException("Required account role is missing from the roles table.");
        }

        jdbc.update("""
                INSERT INTO "user_role_history" (
                    "target_user_id", "previous_role_code", "new_role_code",
                    "actor_user_id", "actor_name", "actor_email", "actor_role_code"
                ) VALUES (?, ?, ?, ?, ?, ?, 'ADMIN')
                """,
                targetId,
                current.roleCode(),
                requestedRole,
                new BigDecimal(actor.userId()),
                actor.fullName(),
                actor.email());

        var updatedAt = jdbc.queryForObject("""
                UPDATE "users"
                SET "role_id" = ?, "updated_at" = CURRENT_TIMESTAMP
                WHERE "user_id" = ?
                RETURNING "updated_at"
                """,
                (result, rowNumber) -> result.getTimestamp("updated_at").toLocalDateTime(),
                roleId,
                targetId);

        logger.info(
                "Account role changed actorUserId={} actorEmail={} targetUserId={} previousRole={} newRole={} changedAt={}",
                actor.userId(),
                actor.email(),
                userId,
                current.roleCode(),
                requestedRole,
                updatedAt);
        return new Account(
                current.userId(),
                current.fullName(),
                current.email(),
                requestedRole,
                current.accountStatus(),
                updatedAt);
    }

    private Account mapAccount(java.sql.ResultSet result, int rowNumber) throws java.sql.SQLException {
        java.sql.Timestamp updatedAt = result.getTimestamp("updatedAt");
        return new Account(
                result.getString("userId"),
                result.getString("fullName"),
                result.getString("email"),
                result.getString("roleCode"),
                result.getString("accountStatus"),
                updatedAt == null ? null : updatedAt.toLocalDateTime());
    }
}
