package com.pc_builder_store.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;

public final class AccountDtos {

    private AccountDtos() {}

    /** Sign-up form. The verification code is only needed on the final step (POST /register). */
    public record RegisterRequest(
            String fullName,
            String email,
            String password,
            String phone,
            String customerSegment,
            String username,
            String verificationCode) {}

    /** {@code username} null keeps the current one (older clients do not send it). */
    public record ProfileUpdateRequest(
            String fullName,
            String phone,
            String customerSegment,
            String username) {}

    public record PasswordChangeRequest(
            String currentPassword,
            String newPassword) {}

    public record Profile(
            String userId,
            String fullName,
            String email,
            String phone,
            String roleCode,
            String customerSegment,
            String accountStatus,
            LocalDateTime createdAt,
            String username,
            boolean quickPinEnabled,
            LocalDateTime quickPinUpdatedAt) {}

    /** Answer to "send me a sign-up code". {@code developmentCode} is only filled on local setups without SMTP. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record VerificationSent(
            String email,
            int expiresInSeconds,
            int resendAfterSeconds,
            String developmentCode) {}

    public record UsernameAvailability(boolean available, String message) {}

    public record QuickPinRequest(String currentPassword, String pin) {}

    public record PinLoginRequest(String username, String pin) {}
}
