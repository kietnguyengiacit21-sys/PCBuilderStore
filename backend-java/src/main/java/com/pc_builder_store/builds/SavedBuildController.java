package com.pc_builder_store.builds;

import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.builds.SavedBuildService.BuildSummary;
import com.pc_builder_store.builds.SavedBuildService.SaveRequest;
import com.pc_builder_store.builds.SavedBuildService.SavedBuild;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Anyone may save and open a build by its share code; listing and deleting need the owner's session. */
@RestController
@RequestMapping("/api/builds")
public class SavedBuildController {

    private final SavedBuildService service;

    public SavedBuildController(SavedBuildService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SavedBuild save(@RequestBody SaveRequest request, @AuthenticationPrincipal AuthUserPrincipal user) {
        return service.save(request, user);
    }

    @GetMapping("/mine")
    public List<BuildSummary> mine(@AuthenticationPrincipal AuthUserPrincipal user) {
        return service.mine(user);
    }

    @GetMapping("/{shareCode}")
    public SavedBuild find(@PathVariable String shareCode, @AuthenticationPrincipal AuthUserPrincipal viewer) {
        return service.find(shareCode, viewer);
    }

    @DeleteMapping("/{shareCode}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String shareCode, @AuthenticationPrincipal AuthUserPrincipal user) {
        service.delete(shareCode, user);
    }
}
