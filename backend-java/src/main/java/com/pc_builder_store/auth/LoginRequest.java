package com.pc_builder_store.auth;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Password login. {@code identifier} is the account email or username ("email" is still accepted). */
public record LoginRequest(
        @NotBlank @Size(max = 254) @JsonAlias("email") String identifier,
        @NotBlank String password) {
}
