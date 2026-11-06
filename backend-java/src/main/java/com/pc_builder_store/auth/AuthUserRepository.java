package com.pc_builder_store.auth;

import java.util.List;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Repository;

@Repository
public class AuthUserRepository implements UserDetailsService {

    private static final String FIND_USER = """
            SELECT
              u."user_id"::text AS "userId",
              u."full_name" AS "fullName",
              u."email" AS "email",
              u."password_hash" AS "passwordHash",
              r."role_code" AS "roleCode",
              u."customer_segment" AS "customerSegment",
              u."account_status" AS "accountStatus"
            FROM "users" u
            JOIN "roles" r ON r."role_id" = u."role_id"
            WHERE u."email" = ?
            """;

    private final JdbcTemplate jdbcTemplate;

    public AuthUserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public AuthUserPrincipal loadUserByUsername(String email) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        List<AuthUserPrincipal> users = jdbcTemplate.query(
                FIND_USER,
                (result, rowNumber) -> new AuthUserPrincipal(
                        result.getString("userId"),
                        result.getString("fullName"),
                        result.getString("email"),
                        result.getString("passwordHash"),
                        result.getString("roleCode"),
                        result.getString("customerSegment"),
                        result.getString("accountStatus")),
                normalizedEmail);
        if (users.isEmpty()) {
            throw new UsernameNotFoundException("Invalid email or password.");
        }
        return users.getFirst();
    }
}
