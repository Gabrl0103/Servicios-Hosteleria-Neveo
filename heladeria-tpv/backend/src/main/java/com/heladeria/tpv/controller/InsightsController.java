package com.heladeria.tpv.controller;

import com.heladeria.tpv.dto.InsightsResponse;
import com.heladeria.tpv.service.InsightsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/insights")
public class InsightsController {

    private final InsightsService insightsService;

    public InsightsController(InsightsService insightsService) {
        this.insightsService = insightsService;
    }

    /**
     * Horas pico, promedios por dia de la semana, alertas y recomendaciones,
     * calculados localmente sobre las ventas confirmadas.
     */
    @GetMapping
    public InsightsResponse getInsights() {
        return insightsService.getInsights();
    }
}
