package com.pc_builder_store.auth;

public record AuthSessionResponse(boolean authenticated, AuthUserResponse user) {
}