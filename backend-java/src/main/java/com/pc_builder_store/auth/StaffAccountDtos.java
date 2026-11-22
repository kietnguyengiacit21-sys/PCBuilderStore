package com.pc_builder_store.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;

public final class StaffAccountDtos {

    private StaffAccountDtos() {}

    public record Account(
            String userId,
            String fullName,
            String email,
            String roleCode,
            String accountStatus,
            LocalDateTime updatedAt,
            String phone,
            LocalDateTime createdAt,
            LocalDateTime lastLoginAt,
            boolean mustChangePassword) {

        public Account(String userId, String fullName, String email, String roleCode, String accountStatus,
                LocalDateTime updatedAt) {
            this(userId, fullName, email, roleCode, accountStatus, updatedAt, null, null, null, false);
        }
    }

    public record CreateStaffRequest(String fullName, String email, String phone) {}

    /** The temporary password is returned once and never stored in plain text. */
    public record AccountWithPassword(Account account, String temporaryPassword) {}

    public record StatusChangeRequest(String status, String note) {}

    public record AccountEvent(
            String type,
            String description,
            String actorEmail,
            LocalDateTime createdAt) {}

    public record RoleChangeRequest(
            @NotBlank @Pattern(regexp = "CUSTOMER|SALES") String roleCode) {}
}
