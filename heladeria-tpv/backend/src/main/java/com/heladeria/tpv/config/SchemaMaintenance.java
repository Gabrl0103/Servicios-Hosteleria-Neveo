package com.heladeria.tpv.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Ajustes de esquema que ddl-auto=update no cubre. Solo operaciones
 * idempotentes y no destructivas: la base de produccion tiene datos reales.
 */
@Component
public class SchemaMaintenance implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaMaintenance.class);

    private final JdbcTemplate jdbcTemplate;

    public SchemaMaintenance(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)");
        } catch (Exception e) {
            log.warn("No se pudo crear el indice idx_orders_created_at: {}", e.getMessage());
        }
    }
}
