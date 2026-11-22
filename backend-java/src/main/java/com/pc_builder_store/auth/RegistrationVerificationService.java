package com.pc_builder_store.auth;

import com.pc_builder_store.auth.AccountDtos.VerificationSent;
import com.pc_builder_store.common.MailDelivery;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Six-digit email codes that prove a new customer owns the address they sign up with.
 * Codes expire after 10 minutes, allow 5 wrong guesses and only their SHA-256 hash is stored.
 *
 * <p>Each statement commits on its own (no surrounding transaction), so a wrong guess is counted
 * even though the request then fails, and the "use the code" update is a single conditional
 * UPDATE, so two concurrent requests can never both consume the same code.
 */
@Service
public class RegistrationVerificationService {

    static final int CODE_LENGTH = 6;
    static final int VALID_MINUTES = 10;
    static final int MAX_ATTEMPTS = 5;
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final MailDelivery mail;
    private final boolean exposeDevelopmentCode;

    public RegistrationVerificationService(
            JdbcTemplate jdbc,
            MailDelivery mail,
            @Value("${app.auth.expose-development-code:false}") boolean exposeDevelopmentCode) {
        this.jdbc = jdbc;
        this.mail = mail;
        this.exposeDevelopmentCode = exposeDevelopmentCode;
    }

    /** Emails a fresh code to an already validated (and still unregistered) address. */
    public VerificationSent send(String email, String fullName) {
        long waitSeconds = secondsUntilResendAllowed(email);
        if (waitSeconds > 0) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Mã vừa được gửi. Vui lòng đợi " + waitSeconds + " giây rồi bấm Gửi lại mã.");
        }
        String code = newCode();
        jdbc.update("DELETE FROM \"email_verification_codes\" WHERE \"created_at\" < CURRENT_TIMESTAMP - INTERVAL '1 day'");
        // Only the newest code works; asking again retires the previous one.
        jdbc.update("""
                UPDATE "email_verification_codes" SET "used_at" = CURRENT_TIMESTAMP
                WHERE "email" = ? AND "purpose" = 'REGISTER' AND "used_at" IS NULL
                """, email);
        jdbc.update("""
                INSERT INTO "email_verification_codes" ("email", "purpose", "code_hash", "expires_at")
                VALUES (?, 'REGISTER', ?, CURRENT_TIMESTAMP + make_interval(mins => ?))
                """, email, hash(email, code), VALID_MINUTES);
        mail.send(email, "Mã xác minh PC Builder Store: " + code,
                "Xin chào " + fullName + ",\n\n"
                        + "Mã xác minh để tạo tài khoản PC Builder Store của bạn là:\n\n"
                        + "    " + code + "\n\n"
                        + "Mã có hiệu lực trong " + VALID_MINUTES + " phút. Không chia sẻ mã này với bất kỳ ai, "
                        + "kể cả nhân viên cửa hàng.\n\n"
                        + "Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.\n",
                "Sign-up code: " + code);
        String developmentCode = exposeDevelopmentCode && !mail.isConfigured() ? code : null;
        return new VerificationSent(email, VALID_MINUTES * 60, (int) RESEND_COOLDOWN.toSeconds(), developmentCode);
    }

    /** Uses up the code for this email, or explains why it cannot be used. */
    public void consume(String email, String code) {
        String digits = code == null ? "" : code.replaceAll("\\s", "");
        if (!digits.matches("\\d{" + CODE_LENGTH + "}")) {
            throw badRequest("Vui lòng nhập đủ " + CODE_LENGTH + " số trong email xác minh.");
        }
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT "code_id", "attempts", "expires_at" > CURRENT_TIMESTAMP AS "fresh"
                FROM "email_verification_codes"
                WHERE "email" = ? AND "purpose" = 'REGISTER' AND "used_at" IS NULL
                ORDER BY "created_at" DESC
                LIMIT 1
                """, email);
        if (rows.isEmpty() || !Boolean.TRUE.equals(rows.getFirst().get("fresh"))) {
            throw badRequest("Mã xác minh đã hết hạn. Hãy bấm Gửi lại mã để nhận mã mới.");
        }
        Object codeId = rows.getFirst().get("code_id");
        if (((Number) rows.getFirst().get("attempts")).intValue() >= MAX_ATTEMPTS) {
            throw tooManyAttempts();
        }
        int used = jdbc.update("""
                UPDATE "email_verification_codes" SET "used_at" = CURRENT_TIMESTAMP
                WHERE "code_id" = ? AND "used_at" IS NULL AND "code_hash" = ?
                  AND "attempts" < ? AND "expires_at" > CURRENT_TIMESTAMP
                """, codeId, hash(email, digits), MAX_ATTEMPTS);
        if (used == 1) return;
        Integer attempts = jdbc.queryForObject("""
                UPDATE "email_verification_codes" SET "attempts" = "attempts" + 1
                WHERE "code_id" = ? RETURNING "attempts"
                """, Integer.class, codeId);
        int left = MAX_ATTEMPTS - (attempts == null ? MAX_ATTEMPTS : attempts);
        if (left <= 0) throw tooManyAttempts();
        throw badRequest("Mã xác minh không đúng. Bạn còn " + left + " lần thử.");
    }

    private long secondsUntilResendAllowed(String email) {
        Long elapsed = jdbc.queryForObject("""
                SELECT CAST(EXTRACT(EPOCH FROM (LOCALTIMESTAMP - MAX("created_at"))) AS BIGINT)
                FROM "email_verification_codes"
                WHERE "email" = ? AND "purpose" = 'REGISTER'
                """, Long.class, email);
        if (elapsed == null) return 0;
        return Math.max(0, RESEND_COOLDOWN.toSeconds() - elapsed);
    }

    static String newCode() {
        return String.format("%0" + CODE_LENGTH + "d", RANDOM.nextInt((int) Math.pow(10, CODE_LENGTH)));
    }

    static String hash(String email, String code) {
        return PasswordResetService.sha256(email + ":" + code);
    }

    private static ResponseStatusException tooManyAttempts() {
        return badRequest("Bạn đã nhập sai quá nhiều lần. Hãy bấm Gửi lại mã để nhận mã mới.");
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
