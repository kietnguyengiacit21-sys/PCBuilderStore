package com.pc_builder_store.auth;

public record AuthUserResponse(
        String userId,
        String fullName,
        String email,
        String roleCode,
        String customerSegment,
        String accountStatus,
        /** Set after an admin issued a temporary password; the UI asks the user to choose a new one. */
        boolean mustChangePassword) {

    public static AuthUserResponse from(AuthUserPrincipal user) {
        return from(user, false);
    }

    public static AuthUserResponse from(AuthUserPrincipal user, boolean mustChangePassword) {
        return new AuthUserResponse(
                user.userId(),
                user.fullName(),
                user.email(),
                user.roleCode(),
                user.customerSegment(),
                user.accountStatus(),
                mustChangePassword);
    }
}
