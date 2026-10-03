package com.heladeria.tpv.service;

/**
 * Umbrales del panel de analisis. Todos en un solo lugar; no se configuran
 * desde la interfaz.
 */
public final class InsightsThresholds {

    private InsightsThresholds() {
    }

    // Rango base: ultimos N dias completos, sin contar hoy.
    public static final int RANGE_DAYS = 30;

    // Con menos dias con ventas no se muestran alertas ni recomendaciones.
    public static final int MIN_DAYS_WITH_SALES = 14;

    // Horas marcadas como "pico".
    public static final int PEAK_HOURS_COUNT = 3;

    // LOW_SALES_TODAY
    public static final int LOW_SALES_MIN_HOURS_OPEN = 2;
    public static final int LOW_SALES_WEEKS_BACK = 4;
    public static final int LOW_SALES_MIN_WEEKS_WITH_DATA = 3;
    public static final double LOW_SALES_RATIO = 0.60;

    // PRODUCT_DROP: ultimos 7 dias vs los 7 anteriores.
    public static final int PRODUCT_DROP_WINDOW_DAYS = 7;
    public static final int PRODUCT_DROP_MIN_PREVIOUS_UNITS = 5;
    public static final double PRODUCT_DROP_MIN_RATIO = 0.40;

    // COMBO: pares de productos en el mismo pedido.
    public static final int COMBO_MIN_ORDERS = 5;
    public static final int COMBO_MAX_PAIRS = 3;

    // DEAD_PRODUCT: productos del menu sin ventas en los ultimos N dias.
    public static final int DEAD_PRODUCT_DAYS = 14;

    // VALLEY_PROMO: una hora es "normal" si tuvo ventas en al menos esta
    // fraccion de los dias con ventas. La franja floja es de 2 horas.
    public static final double NORMAL_HOUR_MIN_DAY_SHARE = 0.30;
    public static final int VALLEY_WINDOW_HOURS = 2;
    public static final int VALLEY_MIN_NORMAL_HOURS_SPAN = 4;

    public static final int MAX_ALERTS = 3;
    public static final int MAX_RECOMMENDATIONS = 5;
}
