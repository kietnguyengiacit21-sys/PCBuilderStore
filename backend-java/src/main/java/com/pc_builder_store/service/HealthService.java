package com.pc_builder_store.service;

import com.pc_builder_store.exception.DatabaseUnavailableException;
import com.pc_builder_store.repository.HealthRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

@Service
public class HealthService {

    private final HealthRepository healthRepository;

    public HealthService(HealthRepository healthRepository) {
        this.healthRepository = healthRepository;
    }

    public void checkDatabase() {
        try {
            healthRepository.checkConnection();
        } catch (DataAccessException exception) {
            throw new DatabaseUnavailableException(exception);
        }
    }
}
