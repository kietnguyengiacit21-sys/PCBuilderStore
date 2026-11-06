package com.pc_builder_store.auth;

public record AuthUserResponse(
        String userId,
        String fullName,
        String email,
        String roleCode,
        String customerSegment,
        String accountStatus) {

    public static AuthUserResponse from(AuthUserPrincipal user) {
        return new AuthUserResponse(
                user.userId(),
                user.fullName(),
                user.email(),
                user.roleCode(),
                user.customerSegment(),
                user.accountStatus());
    }
}
