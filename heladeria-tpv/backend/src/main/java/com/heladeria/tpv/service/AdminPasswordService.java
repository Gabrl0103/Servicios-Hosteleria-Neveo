package com.heladeria.tpv.service;

import com.heladeria.tpv.exception.BusinessRuleException;
import com.heladeria.tpv.exception.ForbiddenException;
import com.heladeria.tpv.exception.TooManyAttemptsException;
import com.heladeria.tpv.model.BusinessSettings;
import com.heladeria.tpv.repository.BusinessSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * Contraseña unica de administrador, usada para autorizar anulaciones.
 * Es una barrera practica contra anulaciones por error, no seguridad fuerte:
 * quien tenga acceso al archivo .db puede borrar el hash.
 *
 * Nunca registrar contraseñas en logs.
 */
@Service
public class AdminPasswordService {

    private static final Logger log = LoggerFactory.getLogger(AdminPasswordService.class);

    // Constantes del limite de intentos (en memoria, se reinicia al reiniciar la app).
    public static final int MIN_PASSWORD_LENGTH = 4;
    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final long DEFAULT_LOCK_SECONDS = 5 * 60;

    private final BusinessSettingsService businessSettingsService;
    private final BusinessSettingsRepository repository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    // Permite reducir el bloqueo solo para pruebas (-Dadmin.lock-seconds=10).
    @Value("${admin.lock-seconds:" + DEFAULT_LOCK_SECONDS + "}")
    private long lockSeconds;

    private int failedAttempts = 0;
    private Instant lockedUntil = null;

    public AdminPasswordService(BusinessSettingsService businessSettingsService,
                                BusinessSettingsRepository repository) {
        this.businessSettingsService = businessSettingsService;
        this.repository = repository;
    }

    public boolean isPasswordSet() {
        return businessSettingsService.get().isAdminPasswordSet();
    }

    /**
     * Valida la contraseña de administrador. Orden: existe contraseña (409),
     * no hay bloqueo activo (429), contraseña correcta (403).
     */
    public synchronized void verifyOrThrow(String password) {
        BusinessSettings settings = businessSettingsService.get();
        if (!settings.isAdminPasswordSet()) {
            throw new BusinessRuleException("Configura la contraseña de administrador en Configuración");
        }
        checkNotLocked();
        if (password == null || !encoder.matches(password, settings.getAdminPasswordHash())) {
            registerFailure();
            throw new ForbiddenException("Contraseña incorrecta");
        }
        failedAttempts = 0;
    }

    /**
     * Crea la contraseña (si no existe) o la cambia (exige la actual).
     */
    @Transactional
    public synchronized void setPassword(String currentPassword, String newPassword) {
        if (newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new BusinessRuleException(
                    "La contraseña debe tener al menos " + MIN_PASSWORD_LENGTH + " caracteres");
        }
        BusinessSettings settings = businessSettingsService.get();
        if (settings.isAdminPasswordSet()) {
            checkNotLocked();
            if (currentPassword == null || !encoder.matches(currentPassword, settings.getAdminPasswordHash())) {
                registerFailure();
                throw new ForbiddenException("La contraseña actual es incorrecta");
            }
            failedAttempts = 0;
        }
        settings.setAdminPasswordHash(encoder.encode(newPassword));
        repository.save(settings);
        log.info("Contraseña de administrador actualizada");
    }

    /**
     * Borra el hash (contraseña olvidada). La app vuelve a pedir configurar una nueva.
     */
    @Transactional
    public synchronized void reset() {
        BusinessSettings settings = businessSettingsService.get();
        settings.setAdminPasswordHash(null);
        repository.save(settings);
        failedAttempts = 0;
        lockedUntil = null;
        log.info("Contraseña de administrador restablecida desde soporte");
    }

    private void checkNotLocked() {
        if (lockedUntil == null) {
            return;
        }
        Instant now = Instant.now();
        if (now.isBefore(lockedUntil)) {
            long minutes = Math.max(1, (Duration.between(now, lockedUntil).getSeconds() + 59) / 60);
            throw new TooManyAttemptsException("Demasiados intentos fallidos. Intenta de nuevo en "
                    + minutes + (minutes == 1 ? " minuto" : " minutos"));
        }
        lockedUntil = null;
        failedAttempts = 0;
    }

    private void registerFailure() {
        failedAttempts++;
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
            lockedUntil = Instant.now().plusSeconds(lockSeconds);
            log.warn("Contraseña de administrador bloqueada por {} intentos fallidos", failedAttempts);
            long minutes = Math.max(1, (lockSeconds + 59) / 60);
            throw new TooManyAttemptsException("Contraseña incorrecta. Demasiados intentos fallidos: "
                    + "bloqueado por " + minutes + (minutes == 1 ? " minuto" : " minutos"));
        }
    }
}
