package com.pc_builder_store.auth;

import static com.pc_builder_store.auth.StaffAccountDtos.Account;
import static com.pc_builder_store.auth.StaffAccountDtos.RoleChangeRequest;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/accounts")
public class StaffAccountController {

    private final StaffAccountService service;

    public StaffAccountController(StaffAccountService service) {
        this.service = service;
    }

    @GetMapping
    public List<Account> listAccounts(@RequestParam(required = false) String q) {
        return service.listAccounts(q);
    }

    @PatchMapping("/{userId}/role")
    public Account changeRole(
            @PathVariable String userId,
            @Valid @RequestBody RoleChangeRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.changeRole(userId, request.roleCode(), actor);
    }
}
