package com.pc_builder_store.auth;

import static com.pc_builder_store.auth.StaffAccountDtos.Account;
import static com.pc_builder_store.auth.StaffAccountDtos.AccountEvent;
import static com.pc_builder_store.auth.StaffAccountDtos.AccountWithPassword;
import static com.pc_builder_store.auth.StaffAccountDtos.CreateStaffRequest;
import static com.pc_builder_store.auth.StaffAccountDtos.RoleChangeRequest;
import static com.pc_builder_store.auth.StaffAccountDtos.StatusChangeRequest;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Account administration; the whole /api/admin/accounts tree is ADMIN-only. */
@RestController
@RequestMapping("/api/admin/accounts")
public class StaffAccountController {

    private final StaffAccountService service;

    public StaffAccountController(StaffAccountService service) {
        this.service = service;
    }

    @GetMapping
    public List<Account> listAccounts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String role) {
        return role == null ? service.listAccounts(q) : service.listAccounts(q, role);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountWithPassword createStaff(
            @RequestBody CreateStaffRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.createStaff(request, actor);
    }

    @PatchMapping("/{userId}/role")
    public Account changeRole(
            @PathVariable String userId,
            @Valid @RequestBody RoleChangeRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.changeRole(userId, request.roleCode(), actor);
    }

    @PatchMapping("/{userId}/status")
    public Account changeStatus(
            @PathVariable String userId,
            @RequestBody StatusChangeRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.changeStatus(userId, request, actor);
    }

    @PostMapping("/{userId}/password-reset")
    public AccountWithPassword resetPassword(
            @PathVariable String userId,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.resetPassword(userId, actor);
    }

    @GetMapping("/{userId}/history")
    public List<AccountEvent> history(@PathVariable String userId) {
        return service.history(userId);
    }
}
