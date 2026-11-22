package com.pc_builder_store.auth;

import com.pc_builder_store.auth.AccountDtos.PasswordChangeRequest;
import com.pc_builder_store.auth.AccountDtos.Profile;
import com.pc_builder_store.auth.AccountDtos.ProfileUpdateRequest;
import com.pc_builder_store.auth.AccountDtos.RegisterRequest;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Self-service accounts: customer sign-up, profile and password. */
@Service
public class AccountService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern PHONE = Pattern.compile("^\\+?[0-9][0-9 .-]{7,18}[0-9]$");
    private static final Set<String> SEGMENTS = Set.of("IT", "NON_IT", "UNSPECIFIED");
    private static final String PROFILE = """
            SELECT u."user_id"::text AS "userId", u."full_name" AS "fullName", u."email" AS "email",
                   u."phone" AS "phone", r."role_code" AS "roleCode",
                   u."customer_segment" AS "customerSegment", u."account_status" AS "accountStatus",
                   u."created_at" AS "createdAt"
            FROM "users" u
            JOIN "roles" r ON r."role_id" = u."role_id"
            WHERE u."user_id" = ?
            """;

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final AuthUserRepository users;

    public AccountService(JdbcTemplate jdbc, PasswordEncoder passwordEncoder, AuthUserRepository users) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.users = users;
    }

    @Transactional
    public AuthUserPrincipal register(RegisterRequest request) {
        if (request == null) throw badRequest("Thiếu thông tin đăng ký.");
        String fullName = fullName(request.fullName());
        String email = email(request.email());
        String password = newPassword(request.password());
        String phone = phone(request.phone());
        String segment = segment(request.customerSegment());

        Integer existing = jdbc.queryForObject(
                "SELECT COUNT(*) FROM \"users\" WHERE \"email\" = ?", Integer.class, email);
        if (existing != null && existing > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.");
        }
        int inserted;
        try {
            inserted = jdbc.update("""
                    INSERT INTO "users" ("role_id", "full_name", "email", "password_hash", "phone",
                                         "customer_segment", "account_status")
                    SELECT r."role_id", ?, ?, ?, ?, ?, 'ACTIVE'
                    FROM "roles" r
                    WHERE r."role_code" = 'CUSTOMER'
                    """, fullName, email, passwordEncoder.encode(password), phone, segment);
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.");
        }
        if (inserted != 1) {
            throw new IllegalStateException("The CUSTOMER role is missing from the roles table.");
        }
        return users.loadUserByUsername(email);
    }

    public Profile profile(AuthUserPrincipal user) {
        List<Profile> rows = jdbc.query(PROFILE, this::mapProfile, userId(user));
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
        return rows.getFirst();
    }

    /** Updates the profile and returns the refreshed principal for the session. */
    @Transactional
    public AuthUserPrincipal updateProfile(AuthUserPrincipal user, ProfileUpdateRequest request) {
        if (request == null) throw badRequest("Thiếu thông tin cần cập nhật.");
        String fullName = fullName(request.fullName());
        String phone = phone(request.phone());
        // The segment only shapes customer recommendations; staff accounts keep theirs.
        String segment = "CUSTOMER".equals(user.roleCode())
                ? segment(request.customerSegment())
                : user.customerSegment();
        int updated = jdbc.update("""
                UPDATE "users"
                SET "full_name" = ?, "phone" = ?, "customer_segment" = ?, "updated_at" = CURRENT_TIMESTAMP
                WHERE "user_id" = ?
                """, fullName, phone, segment, userId(user));
        if (updated != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
        return users.loadUserByUsername(user.email());
    }

    @Transactional
    public void changePassword(AuthUserPrincipal user, PasswordChangeRequest request) {
        if (request == null || request.currentPassword() == null || request.currentPassword().isEmpty()) {
            throw badRequest("Vui lòng nhập mật khẩu hiện tại.");
        }
        String next = newPassword(request.newPassword());
        List<String> hashes = jdbc.queryForList(
                "SELECT \"password_hash\" FROM \"users\" WHERE \"user_id\" = ? FOR UPDATE",
                String.class, userId(user));
        if (hashes.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
        if (!passwordEncoder.matches(request.currentPassword(), hashes.getFirst())) {
            throw badRequest("Mật khẩu hiện tại không đúng.");
        }
        if (passwordEncoder.matches(next, hashes.getFirst())) {
            throw badRequest("Mật khẩu mới phải khác mật khẩu hiện tại.");
        }
        jdbc.update("""
                UPDATE "users" SET "password_hash" = ?, "must_change_password" = FALSE, "updated_at" = CURRENT_TIMESTAMP
                WHERE "user_id" = ?
                """, passwordEncoder.encode(next), userId(user));
    }

    private Profile mapProfile(ResultSet result, int row) throws SQLException {
        return new Profile(
                result.getString("userId"),
                result.getString("fullName"),
                result.getString("email"),
                result.getString("phone"),
                result.getString("roleCode"),
                result.getString("customerSegment"),
                result.getString("accountStatus"),
                result.getTimestamp("createdAt").toLocalDateTime());
    }

    private static BigDecimal userId(AuthUserPrincipal user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập.");
        return new BigDecimal(user.userId());
    }

    static String fullName(String value) {
        String name = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (name.length() < 2 || name.length() > 160) throw badRequest("Họ tên cần từ 2 đến 160 ký tự.");
        return name;
    }

    static String email(String value) {
        String email = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 254 || !EMAIL.matcher(email).matches()) throw badRequest("Email không hợp lệ.");
        return email;
    }

    static String phone(String value) {
        if (value == null || value.isBlank()) return null;
        String phone = value.trim();
        if (!PHONE.matcher(phone).matches()) throw badRequest("Số điện thoại không hợp lệ.");
        return phone;
    }

    static String segment(String value) {
        if (value == null || value.isBlank()) return "UNSPECIFIED";
        if (!SEGMENTS.contains(value)) throw badRequest("Nhóm khách hàng không hợp lệ.");
        return value;
    }

    static String newPassword(String value) {
        if (value == null || value.length() < 8) throw badRequest("Mật khẩu cần ít nhất 8 ký tự.");
        // BCrypt only uses the first 72 bytes.
        if (value.getBytes(StandardCharsets.UTF_8).length > 72) throw badRequest("Mật khẩu quá dài (tối đa 72 byte).");
        if (!value.matches(".*\\p{L}.*") || !value.matches(".*\\d.*")) {
            throw badRequest("Mật khẩu cần có cả chữ và số.");
        }
        return value;
    }

    private static final String TEMPORARY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final java.security.SecureRandom RANDOM = new java.security.SecureRandom();

    /** 12-character temporary password (letters and digits, no look-alike characters). */
    static String temporaryPassword() {
        while (true) {
            StringBuilder password = new StringBuilder();
            for (int index = 0; index < 12; index++) {
                password.append(TEMPORARY_ALPHABET.charAt(RANDOM.nextInt(TEMPORARY_ALPHABET.length())));
            }
            String value = password.toString();
            if (value.matches(".*[A-Za-z].*") && value.matches(".*\\d.*")) return value;
        }
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
