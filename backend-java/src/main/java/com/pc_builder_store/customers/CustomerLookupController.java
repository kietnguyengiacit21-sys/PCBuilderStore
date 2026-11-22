package com.pc_builder_store.customers;

import com.pc_builder_store.customers.CustomerLookupService.CustomerDetail;
import com.pc_builder_store.customers.CustomerLookupService.CustomerSummary;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** ADMIN-only (see SecurityConfiguration). */
@RestController
@RequestMapping("/api/admin/customers")
public class CustomerLookupController {

    private final CustomerLookupService service;

    public CustomerLookupController(CustomerLookupService service) {
        this.service = service;
    }

    @GetMapping
    public List<CustomerSummary> search(@RequestParam(required = false) String q) {
        return service.search(q);
    }

    @GetMapping("/accounts/{userId}")
    public CustomerDetail account(@PathVariable String userId) {
        return service.account(userId);
    }

    @GetMapping("/guests")
    public CustomerDetail guest(@RequestParam String email) {
        return service.guest(email);
    }
}
