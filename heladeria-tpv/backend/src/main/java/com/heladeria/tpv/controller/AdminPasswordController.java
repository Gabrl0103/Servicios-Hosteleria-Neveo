package com.heladeria.tpv.controller;

import com.heladeria.tpv.dto.AdminPasswordRequest;
import com.heladeria.tpv.dto.ResetAdminPasswordRequest;
import com.heladeria.tpv.exception.BusinessRuleException;
import com.heladeria.tpv.service.AdminPasswordService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings/admin-password")
public class AdminPasswordController {

    private final AdminPasswordService adminPasswordService;

    public AdminPasswordController(AdminPasswordService adminPasswordService) {
        this.adminPasswordService = adminPasswordService;
    }

    /**
     * Crea la contraseña si no existe, o la cambia exigiendo la actual.
     */
    @PutMapping
    public Map<String, Object> update(@RequestBody AdminPasswordRequest request) {
        adminPasswordService.setPassword(request.getCurrentPassword(), request.getNewPassword());
        return Map.of("adminPasswordSet", true);
    }

    /**
     * Restablece (borra) la contraseña olvidada. Solo desde /soporte/restaurar,
     * con confirmacion escrita "RESTABLECER".
     */
    @PostMapping("/reset")
    public Map<String, Object> reset(@RequestBody ResetAdminPasswordRequest request) {
        if (!"RESTABLECER".equals(request.getConfirmacion())) {
            throw new BusinessRuleException("Escribe RESTABLECER para confirmar");
        }
        adminPasswordService.reset();
        return Map.of("adminPasswordSet", false);
    }
}
