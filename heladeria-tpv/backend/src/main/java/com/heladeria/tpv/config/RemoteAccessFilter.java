package com.heladeria.tpv.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Modo solo lectura para accesos remotos via "tailscale serve".
 *
 * El backend solo escucha en 127.0.0.1, asi que las peticiones remotas
 * llegan siempre a traves del proxy de tailscale serve, que:
 *  - borra los headers Tailscale-User-* que envie el cliente y los vuelve a
 *    poner con la identidad real (no se pueden falsificar desde la tailnet);
 *  - siempre pone X-Forwarded-For con la IP de Tailscale del cliente,
 *    incluso para dispositivos "tagged" (que no reciben headers de identidad).
 *
 * Electron (local) no envia ninguno de esos headers, por eso conserva todos
 * los permisos. Un proceso local podria agregarlos, pero solo para quitarse
 * permisos a si mismo.
 */
@Component
public class RemoteAccessFilter extends OncePerRequestFilter {

    public static boolean isRemote(HttpServletRequest request) {
        return request.getHeader("Tailscale-User-Login") != null
                || request.getHeader("X-Forwarded-For") != null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (isRemote(request)) {
            String path = request.getRequestURI();
            String method = request.getMethod();
            if (path.startsWith("/api/backup")) {
                reject(response, "Respaldos no disponibles en acceso remoto");
                return;
            }
            if (!"GET".equals(method) && !"HEAD".equals(method)) {
                reject(response, "Acceso remoto de solo lectura");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"status\":403,\"error\":\"" + message + "\"}");
    }
}
