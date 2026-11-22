package com.pc_builder_store.auth;

import static com.pc_builder_store.auth.StaffAccountDtos.Account;
import static com.pc_builder_store.auth.StaffAccountDtos.AccountEvent;
import static com.pc_builder_store.auth.StaffAccountDtos.AccountWithPassword;
import static com.pc_builder_store.auth.StaffAccountDtos.CreateStaffRequest;
import static com.pc_builder_store.auth.StaffAccountDtos.StatusChangeRequest;

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
                   u."updated_at" AS "updatedAt",
                   u."phone" AS "phone",
                   u."created_at" AS "createdAt",
                   u."last_login_at" AS "lastLoginAt",
                   u."must_change_password" AS "mustChangePassword"
            FROM "users" u
            JOIN "roles" r ON r."role_id" = u."role_id"
            """;

    private final JdbcTemplate jdbc;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final AccountStateCache states;

    public StaffAccountService(
            JdbcTemplate jdbc,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
            AccountStateCache states) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.states = states;
    }

    public List<Account> listAccounts(String search) {
        return listAccounts(search, null);
    }

    /** Search by name, email or phone; optional role filter (ADMIN, SALES, CUSTOMER). */
    public List<Account> listAccounts(String search, String roleFilter) {
        String query = search == null ? "" : search.trim();
        if (query.length() > 120) {
            throw new StaffAccountException(HttpStatus.BAD_REQUEST, "Từ khóa tìm kiếm quá dài.");
        }
        if (roleFilter != null && !roleFilter.isBlank() && !roleFilter.matches("ADMIN|SALES|CUSTOMER")) {
            throw new StaffAccountException(HttpStatus.BAD_REQUEST, "Vai trò lọc không hợp lệ.");
        }
        StringBuilder sql = new StringBuilder(ACCOUNT_COLUMNS).append(" WHERE TRUE");
        java.util.List<Object> parameters = new java.util.ArrayList<>();
        if (roleFilter != null && !roleFilter.isBlank()) {
            sql.append(" AND r.\"role_code\" = ?");
            parameters.add(roleFilter);
        }
        if (StringUtils.hasText(query)) {
            String pattern = "%" + query.toLowerCase(Locale.ROOT) + "%";
            sql.append(" AND (LOWER(u.\"full_name\") LIKE ? OR LOWER(u.\"email\") LIKE ? OR COALESCE(u.\"phone\", '') LIKE ?)");
            parameters.add(pattern);
            parameters.add(pattern);
            parameters.add(pattern);
        }
        sql.append("""
                 ORDER BY CASE r."role_code" WHEN 'ADMIN' THEN 0 WHEN 'SALES' THEN 1 ELSE 2 END,
                          LOWER(u."full_name"), u."user_id"
                LIMIT 200
                """);
        return jdbc.query(sql.toString(), this::mapAccount, parameters.toArray());
    }

    /** Creates a SALES staff account with a temporary password the person must change at first login. */
    @Transactional
    public AccountWithPassword createStaff(CreateStaffRequest request, AuthUserPrincipal actor) {
        requireAdmin(actor);
        if (request == null) throw new StaffAccountException(HttpStatus.BAD_REQUEST, "Thiếu thông tin nhân viên.");
        String fullName;
        String email;
        String phone;
        try {
            fullName = AccountService.fullName(request.fullName());
            email = AccountService.email(request.email());
            phone = AccountService.phone(request.phone());
        } catch (org.springframework.web.server.ResponseStatusException exception) {
            throw new StaffAccountException(HttpStatus.BAD_REQUEST, exception.getReason());
        }
        Long existing = jdbc.queryForObject("SELECT COUNT(*) FROM \"users\" WHERE \"email\" = ?", Long.class, email);
        if (existing != null && existing > 0) {
            throw new StaffAccountException(HttpStatus.CONFLICT,
                    "Email đã có tài khoản. Hãy tìm tài khoản đó và cấp quyền nhân viên thay vì tạo mới.");
        }
        String temporary = AccountService.temporaryPassword();
        BigDecimal userId = jdbc.queryForObject("""
                INSERT INTO "users" ("role_id", "full_name", "email", "password_hash", "phone", "account_status", "must_change_password")
                SELECT r."role_id", ?, ?, ?, ?, 'ACTIVE', TRUE FROM "roles" r WHERE r."role_code" = 'SALES'
                RETURNING "user_id"
                """, BigDecimal.class, fullName, email, passwordEncoder.encode(temporary), phone);
        event(userId, "CREATED", "Tạo tài khoản nhân viên bán hàng", actor);
        logger.info("Staff account created actorUserId={} targetUserId={}", actor.userId(), userId);
        return new AccountWithPassword(account(userId), temporary);
    }

    /** Locks or unlocks a customer or staff account; locking ends its sessions on their next request. */
    @Transactional
    public Account changeStatus(String userId, StatusChangeRequest request, AuthUserPrincipal actor) {
        requireAdmin(actor);
        BigDecimal targetId = targetId(userId);
        String status = request == null ? null : request.status();
        if (!"ACTIVE".equals(status) && !"LOCKED".equals(status)) {
            throw new StaffAccountException(HttpStatus.BAD_REQUEST, "Trạng thái mới không hợp lệ.");
        }
        Account current = lockedAccount(targetId);
        if (current.userId().equals(actor.userId())) {
            throw new StaffAccountException(HttpStatus.CONFLICT, "Bạn không thể tự khóa tài khoản của mình.");
        }
        if ("ADMIN".equals(current.roleCode())) {
            throw new StaffAccountException(HttpStatus.CONFLICT, "Không thể khóa tài khoản Admin tại đây.");
        }
        if (status.equals(current.accountStatus())) return current;
        String note = request.note() == null || request.note().isBlank() ? null : request.note().trim();
        if (note != null && note.length() > 500) {
            throw new StaffAccountException(HttpStatus.BAD_REQUEST, "Ghi chú tối đa 500 ký tự.");
        }
        jdbc.update("UPDATE \"users\" SET \"account_status\" = ?, \"updated_at\" = CURRENT_TIMESTAMP WHERE \"user_id\" = ?",
                status, targetId);
        event(targetId, "LOCKED".equals(status) ? "LOCKED" : "UNLOCKED", note, actor);
        states.evict(current.userId());
        logger.info("Account status changed actorUserId={} targetUserId={} status={}", actor.userId(), userId, status);
        return account(targetId);
    }

    /** Issues a temporary password (shown once to the admin); the user must change it after logging in. */
    @Transactional
    public AccountWithPassword resetPassword(String userId, AuthUserPrincipal actor) {
        requireAdmin(actor);
        BigDecimal targetId = targetId(userId);
        Account current = lockedAccount(targetId);
        if ("ADMIN".equals(current.roleCode())) {
            throw new StaffAccountException(HttpStatus.CONFLICT,
                    "Không thể cấp lại mật khẩu cho Admin tại đây. Admin tự đổi trong trang Tài khoản.");
        }
        String temporary = AccountService.temporaryPassword();
        jdbc.update("""
                UPDATE "users" SET "password_hash" = ?, "must_change_password" = TRUE, "updated_at" = CURRENT_TIMESTAMP
                WHERE "user_id" = ?
                """, passwordEncoder.encode(temporary), targetId);
        jdbc.update("UPDATE \"password_reset_tokens\" SET \"used_at\" = CURRENT_TIMESTAMP WHERE \"user_id\" = ? AND \"used_at\" IS NULL", targetId);
        event(targetId, "PASSWORD_RESET_BY_ADMIN", "Cấp mật khẩu tạm thời", actor);
        states.evict(current.userId());
        logger.info("Temporary password issued actorUserId={} targetUserId={}", actor.userId(), userId);
        return new AccountWithPassword(account(targetId), temporary);
    }

    /** Role changes and account actions, newest first. */
    public List<AccountEvent> history(String userId) {
        BigDecimal targetId = targetId(userId);
        account(targetId);
        return jdbc.query("""
                SELECT * FROM (
                    SELECT 'ROLE_CHANGED' AS "type",
                           COALESCE(h."previous_role_code", 'mới') || ' -> ' || h."new_role_code" AS "description",
                           h."actor_email" AS "actor", h."created_at"::timestamp AS "created"
                    FROM "user_role_history" h WHERE h."target_user_id" = ?
                    UNION ALL
                    SELECT e."event_type", COALESCE(e."note", ''), e."actor_email", e."created_at"
                    FROM "user_account_events" e WHERE e."target_user_id" = ?
                ) events
                ORDER BY "created" DESC
                LIMIT 100
                """, (result, row) -> new AccountEvent(result.getString("type"), result.getString("description"),
                result.getString("actor"), result.getTimestamp("created").toLocalDateTime()), targetId, targetId);
    }

    private void event(BigDecimal targetId, String type, String note, AuthUserPrincipal actor) {
        jdbc.update("""
                INSERT INTO "user_account_events" ("target_user_id", "event_type", "note", "actor_user_id", "actor_email")
                VALUES (?, ?, ?, ?, ?)
                """, targetId, type, note, new BigDecimal(actor.userId()), actor.email());
    }

    private Account account(BigDecimal targetId) {
        List<Account> rows = jdbc.query(ACCOUNT_COLUMNS + " WHERE u.\"user_id\" = ?", this::mapAccount, targetId);
        if (rows.isEmpty()) throw new StaffAccountException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
        return rows.getFirst();
    }

    private Account lockedAccount(BigDecimal targetId) {
        List<Account> rows = jdbc.query(ACCOUNT_COLUMNS + " WHERE u.\"user_id\" = ? FOR UPDATE OF u", this::mapAccount, targetId);
        if (rows.isEmpty()) throw new StaffAccountException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
        return rows.getFirst();
    }

    private static BigDecimal targetId(String userId) {
        if (userId == null || !userId.matches("[0-9]{1,20}") || new BigDecimal(userId).signum() <= 0) {
            throw new StaffAccountException(HttpStatus.BAD_REQUEST, "Mã tài khoản không hợp lệ.");
        }
        return new BigDecimal(userId);
    }

    private static void requireAdmin(AuthUserPrincipal actor) {
        if (actor == null || !"ADMIN".equals(actor.roleCode())) {
            throw new StaffAccountException(HttpStatus.FORBIDDEN, "Bạn không có quyền quản lý tài khoản.");
        }
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

        states.evict(userId);
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
        java.sql.Timestamp createdAt = result.getTimestamp("createdAt");
        java.sql.Timestamp lastLoginAt = result.getTimestamp("lastLoginAt");
        return new Account(
                result.getString("userId"),
                result.getString("fullName"),
                result.getString("email"),
                result.getString("roleCode"),
                result.getString("accountStatus"),
                updatedAt == null ? null : updatedAt.toLocalDateTime(),
                result.getString("phone"),
                createdAt == null ? null : createdAt.toLocalDateTime(),
                lastLoginAt == null ? null : lastLoginAt.toLocalDateTime(),
                result.getBoolean("mustChangePassword"));
    }
}
