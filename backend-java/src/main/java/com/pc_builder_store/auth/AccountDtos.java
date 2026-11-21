package com.pc_builder_store.auth;

import java.time.LocalDateTime;

public final class AccountDtos {

    private AccountDtos() {}

    public record RegisterRequest(
            String fullName,
            String email,
            String password,
            String phone,
            String customerSegment) {}

    public record ProfileUpdateRequest(
            String fullName,
            String phone,
            String customerSegment) {}

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
            LocalDateTime createdAt) {}
}
