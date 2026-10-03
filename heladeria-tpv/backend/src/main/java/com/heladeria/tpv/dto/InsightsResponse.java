package com.heladeria.tpv.dto;

import java.util.List;

public record InsightsResponse(
        boolean hasEnoughData,
        int daysWithSales,
        List<HourStat> peakHours,
        List<WeekdayStat> weekdayStats,
        List<Insight> alerts,
        List<Insight> recommendations) {

    /** Promedio por dia (dias con ventas del rango) para una hora 0-23. */
    public record HourStat(int hour, double avgOrders, long avgAmount, boolean peak) {
    }

    /** weekday: 1 = lunes ... 7 = domingo (ISO). */
    public record WeekdayStat(int weekday, double avgOrders, long avgAmount) {
    }

    public record Insight(String type, String message) {
    }
}
