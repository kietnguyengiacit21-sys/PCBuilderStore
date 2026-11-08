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
            LocalDateTime updatedAt) {}

    public record RoleChangeRequest(
            @NotBlank @Pattern(regexp = "CUSTOMER|SALES") String roleCode) {}
}
