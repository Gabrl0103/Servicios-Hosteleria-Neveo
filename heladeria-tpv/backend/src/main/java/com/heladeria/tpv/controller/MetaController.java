package com.heladeria.tpv.controller;

import com.heladeria.tpv.config.RemoteAccessFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/meta")
public class MetaController {

    /**
     * Indica si la peticion llega por acceso remoto (Tailscale, solo lectura).
     */
    @GetMapping
    public Map<String, Object> meta(HttpServletRequest request) {
        return Map.of("remote", RemoteAccessFilter.isRemote(request));
    }
}
