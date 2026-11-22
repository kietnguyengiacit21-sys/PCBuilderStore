package com.pc_builder_store.auth;

import com.pc_builder_store.auth.AccountDtos.PasswordChangeRequest;
import com.pc_builder_store.auth.AccountDtos.Profile;
import com.pc_builder_store.auth.AccountDtos.ProfileUpdateRequest;
import com.pc_builder_store.auth.AccountDtos.RegisterRequest;
import com.pc_builder_store.auth.AccountDtos.UsernameAvailability;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Self-service accounts: customer sign-up, profile, username and password. */
@Service
public class AccountService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern PHONE = Pattern.compile("^\\+?[0-9][0-9 .-]{7,18}[0-9]$");
    private static final Set<String> SEGMENTS = Set.of("IT", "NON_IT", "UNSPECIFIED");
    /** 3-30 characters: lowercase letters, digits, dot and underscore, starting and ending with a letter or digit. */
    private static final Pattern USERNAME = Pattern.compile("^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$");
    private static final Set<String> RESERVED_USERNAMES = Set.of(
            "admin", "administrator", "root", "system", "support", "staff", "sales", "hotro", "quantri",
            "moderator", "pcbuilder", "pcbuilderstore", "shop", "store", "null", "undefined");
    static final String USERNAME_RULE =
            "Tên đăng nhập cần 3–30 ký tự, gồm chữ thường không dấu, số, dấu chấm hoặc gạch dưới, có ít nhất một chữ cái.";
    private static final String PROFILE = """
            SELECT u."user_id"::text AS "userId", u."full_name" AS "fullName", u."email" AS "email",
                   u."phone" AS "phone", r."role_code" AS "roleCode",
                   u."customer_segment" AS "customerSegment", u."account_status" AS "accountStatus",
                   u."created_at" AS "createdAt", u."username" AS "username",
                   u."quick_pin_hash" IS NOT NULL AS "quickPinEnabled", u."quick_pin_updated_at" AS "quickPinUpdatedAt"
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

    /** A validated sign-up form, checked against existing accounts but not saved yet. */
    public record NewAccount(String fullName, String email, String password, String phone, String segment, String username) {}

    /** Validates the sign-up form and makes sure the email and username are still free; writes nothing. */
    public NewAccount validateRegistration(RegisterRequest request) {
        if (request == null) throw badRequest("Thiếu thông tin đăng ký.");
        NewAccount account = new NewAccount(
                fullName(request.fullName()),
                email(request.email()),
                newPassword(request.password()),
                phone(request.phone()),
                segment(request.customerSegment()),
                username(request.username()));
        if (emailTaken(account.email())) throw emailTaken();
        if (usernameOwner(account.username()) != null) throw usernameTaken();
        return account;
    }

    /** Creates the customer once the email code was confirmed. */
    @Transactional
    public AuthUserPrincipal createCustomer(NewAccount account) {
        int inserted;
        try {
            inserted = jdbc.update("""
                    INSERT INTO "users" ("role_id", "full_name", "email", "password_hash", "phone",
                                         "customer_segment", "account_status", "username", "email_verified_at")
                    SELECT r."role_id", ?, ?, ?, ?, ?, 'ACTIVE', ?, CURRENT_TIMESTAMP
                    FROM "roles" r
                    WHERE r."role_code" = 'CUSTOMER'
                    """, account.fullName(), account.email(), passwordEncoder.encode(account.password()),
                    account.phone(), account.segment(), account.username());
        } catch (DuplicateKeyException exception) {
            // Someone took the email or username between the code being sent and confirmed.
            throw emailTaken(account.email()) ? emailTaken() : usernameTaken();
        }
        if (inserted != 1) {
            throw new IllegalStateException("The CUSTOMER role is missing from the roles table.");
        }
        return users.loadUserByUsername(account.email());
    }

    /** For the live check on the sign-up and account forms. */
    public UsernameAvailability usernameAvailability(String value, AuthUserPrincipal currentUser) {
        String username;
        try {
            username = username(value);
        } catch (ResponseStatusException exception) {
            return new UsernameAvailability(false, exception.getReason());
        }
        String owner = usernameOwner(username);
        if (owner == null || (currentUser != null && owner.equals(currentUser.userId()))) {
            return new UsernameAvailability(true, "Bạn có thể dùng tên đăng nhập này.");
        }
        return new UsernameAvailability(false, "Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.");
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
        if (request.username() != null) changeUsername(user, request.username());
        return users.loadUserByUsername(user.email());
    }

    /** A username can be set or changed, but not removed once the account has one. */
    private void changeUsername(AuthUserPrincipal user, String requested) {
        String current = jdbc.queryForObject(
                "SELECT \"username\" FROM \"users\" WHERE \"user_id\" = ?", String.class, userId(user));
        if (requested.isBlank()) {
            if (current != null) throw badRequest("Không thể xóa tên đăng nhập. Bạn có thể đổi sang tên khác.");
            return;
        }
        String username = username(requested);
        if (username.equals(current)) return;
        String owner = usernameOwner(username);
        if (owner != null && !owner.equals(user.userId())) throw usernameTaken();
        try {
            jdbc.update("UPDATE \"users\" SET \"username\" = ?, \"updated_at\" = CURRENT_TIMESTAMP WHERE \"user_id\" = ?",
                    username, userId(user));
        } catch (DuplicateKeyException exception) {
            throw usernameTaken();
        }
    }

    /**
     * Changes the password. The quick-login PIN is switched off at the same time, so someone who
     * knew the old password cannot keep signing in with a PIN they set.
     *
     * @return true when a quick-login PIN was switched off
     */
    @Transactional
    public boolean changePassword(AuthUserPrincipal user, PasswordChangeRequest request) {
        if (request == null || request.currentPassword() == null || request.currentPassword().isEmpty()) {
            throw badRequest("Vui lòng nhập mật khẩu hiện tại.");
        }
        String next = newPassword(request.newPassword());
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT \"password_hash\", \"quick_pin_hash\" FROM \"users\" WHERE \"user_id\" = ? FOR UPDATE",
                userId(user));
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
        String hash = (String) rows.getFirst().get("password_hash");
        if (!passwordEncoder.matches(request.currentPassword(), hash)) {
            throw badRequest("Mật khẩu hiện tại không đúng.");
        }
        if (passwordEncoder.matches(next, hash)) {
            throw badRequest("Mật khẩu mới phải khác mật khẩu hiện tại.");
        }
        boolean hadQuickPin = rows.getFirst().get("quick_pin_hash") != null;
        jdbc.update("""
                UPDATE "users" SET "password_hash" = ?, "must_change_password" = FALSE,
                       "quick_pin_hash" = NULL, "quick_pin_updated_at" = NULL, "updated_at" = CURRENT_TIMESTAMP
                WHERE "user_id" = ?
                """, passwordEncoder.encode(next), userId(user));
        if (hadQuickPin) {
            jdbc.update("""
                    INSERT INTO "user_account_events" ("target_user_id", "event_type", "note", "actor_user_id", "actor_email")
                    VALUES (?, 'QUICK_PIN_REMOVED', ?, ?, ?)
                    """, userId(user), "Tự tắt khi đổi mật khẩu", userId(user), user.email());
        }
        return hadQuickPin;
    }

    private Profile mapProfile(ResultSet result, int row) throws SQLException {
        java.sql.Timestamp pinUpdated = result.getTimestamp("quickPinUpdatedAt");
        return new Profile(
                result.getString("userId"),
                result.getString("fullName"),
                result.getString("email"),
                result.getString("phone"),
                result.getString("roleCode"),
                result.getString("customerSegment"),
                result.getString("accountStatus"),
                result.getTimestamp("createdAt").toLocalDateTime(),
                result.getString("username"),
                result.getBoolean("quickPinEnabled"),
                pinUpdated == null ? null : pinUpdated.toLocalDateTime());
    }

    private boolean emailTaken(String email) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM \"users\" WHERE \"email\" = ?", Integer.class, email);
        return count != null && count > 0;
    }

    /** Id of the account that uses this (already normalised) username, or null. */
    private String usernameOwner(String username) {
        List<String> owners = jdbc.queryForList(
                "SELECT \"user_id\"::text FROM \"users\" WHERE \"username\" = ?", String.class, username);
        return owners.isEmpty() ? null : owners.getFirst();
    }

    private static ResponseStatusException emailTaken() {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.");
    }

    private static ResponseStatusException usernameTaken() {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.");
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

    static String username(String value) {
        String username = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (username.startsWith("@")) username = username.substring(1);
        if (!USERNAME.matcher(username).matches() || !username.matches(".*[a-z].*")
                || username.contains("..") || username.contains("__") || username.contains("._")
                || username.contains("_.")) {
            throw badRequest(USERNAME_RULE);
        }
        if (RESERVED_USERNAMES.contains(username)) {
            throw badRequest("Tên đăng nhập này được dành riêng cho cửa hàng. Hãy chọn tên khác.");
        }
        return username;
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
