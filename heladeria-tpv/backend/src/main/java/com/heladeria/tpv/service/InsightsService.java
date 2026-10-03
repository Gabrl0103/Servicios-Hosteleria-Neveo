package com.heladeria.tpv.service;

import com.heladeria.tpv.HeladeriaTpvApplication;
import com.heladeria.tpv.dto.InsightsResponse;
import com.heladeria.tpv.dto.InsightsResponse.HourStat;
import com.heladeria.tpv.dto.InsightsResponse.Insight;
import com.heladeria.tpv.dto.InsightsResponse.WeekdayStat;
import com.heladeria.tpv.model.CashRegister;
import com.heladeria.tpv.model.Order;
import com.heladeria.tpv.model.OrderItem;
import com.heladeria.tpv.model.Product;
import com.heladeria.tpv.repository.CashRegisterRepository;
import com.heladeria.tpv.repository.OrderItemRepository;
import com.heladeria.tpv.repository.OrderRepository;
import com.heladeria.tpv.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.*;

import static com.heladeria.tpv.service.InsightsThresholds.*;

/**
 * Panel de analisis calculado localmente, sin IA ni internet. Las "ideas"
 * son plantillas de texto rellenadas con los datos reales.
 *
 * Solo cuenta ordenes CONFIRMADO (las consultas del repositorio ya excluyen
 * las anuladas). Hora de Colombia para agrupar por hora y por dia.
 */
@Service
public class InsightsService {

    private static final ZoneId ZONE = ZoneId.of(HeladeriaTpvApplication.ZONE_ID);
    private static final Locale ES = new Locale("es", "CO");

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final CashRegisterRepository cashRegisterRepository;

    public InsightsService(OrderRepository orderRepository,
                           OrderItemRepository orderItemRepository,
                           ProductRepository productRepository,
                           CashRegisterRepository cashRegisterRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.cashRegisterRepository = cashRegisterRepository;
    }

    public InsightsResponse getInsights() {
        LocalDateTime now = LocalDateTime.now(ZONE);
        LocalDate today = now.toLocalDate();
        LocalDateTime rangeStart = today.minusDays(RANGE_DAYS).atStartOfDay();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime tomorrowStart = today.plusDays(1).atStartOfDay();

        // Rango base: ultimos 30 dias completos, sin hoy.
        List<Order> rangeOrders = orderRepository.findConfirmedBetween(rangeStart, todayStart);
        List<OrderItem> rangeItems = orderItemRepository.findConfirmedItemsBetween(rangeStart, todayStart);

        Set<LocalDate> daysWithSales = new HashSet<>();
        for (Order o : rangeOrders) {
            daysWithSales.add(o.getCreatedAt().toLocalDate());
        }
        boolean hasEnoughData = daysWithSales.size() >= MIN_DAYS_WITH_SALES;

        List<HourStat> peakHours = computeHourStats(rangeOrders, daysWithSales.size());
        List<WeekdayStat> weekdayStats = computeWeekdayStats(rangeOrders);

        List<Insight> alerts = new ArrayList<>();
        List<Insight> recommendations = new ArrayList<>();

        if (hasEnoughData) {
            List<Order> todayOrders = orderRepository.findConfirmedBetween(todayStart, tomorrowStart);
            List<OrderItem> todayItems = orderItemRepository.findConfirmedItemsBetween(todayStart, tomorrowStart);

            Insight lowSales = lowSalesToday(now, rangeOrders, todayOrders);
            if (lowSales != null) {
                alerts.add(lowSales);
            }
            alerts.addAll(productDrops(today, rangeItems));

            recommendations.addAll(combos(rangeItems));
            Insight valley = valleyPromo(rangeOrders, daysWithSales.size());
            if (valley != null) {
                recommendations.add(valley);
            }
            recommendations.addAll(deadProducts(today, rangeItems, todayItems));
        }

        return new InsightsResponse(
                hasEnoughData,
                daysWithSales.size(),
                peakHours,
                weekdayStats,
                limit(alerts, MAX_ALERTS),
                limit(recommendations, MAX_RECOMMENDATIONS));
    }

    // ---------------------------------------------------------------- horas

    private List<HourStat> computeHourStats(List<Order> orders, int days) {
        long[] count = new long[24];
        BigDecimal[] amount = new BigDecimal[24];
        Arrays.fill(amount, BigDecimal.ZERO);
        for (Order o : orders) {
            int h = o.getCreatedAt().getHour();
            count[h]++;
            amount[h] = amount[h].add(o.getTotal());
        }

        double[] avgAmount = new double[24];
        for (int h = 0; h < 24; h++) {
            avgAmount[h] = days > 0 ? amount[h].doubleValue() / days : 0;
        }

        // Las 3 horas con mayor monto promedio son "pico".
        Set<Integer> peaks = new HashSet<>();
        Integer[] byAmount = new Integer[24];
        for (int h = 0; h < 24; h++) byAmount[h] = h;
        Arrays.sort(byAmount, (a, b) -> Double.compare(avgAmount[b], avgAmount[a]));
        for (int i = 0; i < PEAK_HOURS_COUNT; i++) {
            if (avgAmount[byAmount[i]] > 0) peaks.add(byAmount[i]);
        }

        List<HourStat> result = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            double avgOrders = days > 0 ? (double) count[h] / days : 0;
            result.add(new HourStat(h, round1(avgOrders), Math.round(avgAmount[h]), peaks.contains(h)));
        }
        return result;
    }

    private List<WeekdayStat> computeWeekdayStats(List<Order> orders) {
        // Por dia de la semana: promedio dividiendo entre las fechas de ese
        // dia de la semana que tuvieron ventas.
        Map<Integer, Set<LocalDate>> dates = new HashMap<>();
        long[] count = new long[8];
        BigDecimal[] amount = new BigDecimal[8];
        Arrays.fill(amount, BigDecimal.ZERO);
        for (Order o : orders) {
            LocalDate d = o.getCreatedAt().toLocalDate();
            int wd = d.getDayOfWeek().getValue();
            dates.computeIfAbsent(wd, k -> new HashSet<>()).add(d);
            count[wd]++;
            amount[wd] = amount[wd].add(o.getTotal());
        }

        List<WeekdayStat> result = new ArrayList<>();
        for (int wd = 1; wd <= 7; wd++) {
            int n = dates.getOrDefault(wd, Set.of()).size();
            double avgOrders = n > 0 ? (double) count[wd] / n : 0;
            long avgAmount = n > 0 ? Math.round(amount[wd].doubleValue() / n) : 0;
            result.add(new WeekdayStat(wd, round1(avgOrders), avgAmount));
        }
        return result;
    }

    // --------------------------------------------------------------- alertas

    /**
     * Ventas de hoy (hasta ahora) vs el promedio, a la misma hora, de los
     * ultimos dias con el mismo dia de la semana que tuvieron ventas.
     */
    private Insight lowSalesToday(LocalDateTime now, List<Order> rangeOrders, List<Order> todayOrders) {
        Optional<CashRegister> open = cashRegisterRepository.findByClosedAtIsNull();
        if (open.isEmpty()) {
            return null;
        }
        if (Duration.between(open.get().getOpenedAt(), now).toHours() < LOW_SALES_MIN_HOURS_OPEN) {
            return null;
        }

        LocalDate today = now.toLocalDate();
        LocalTime timeOfDay = now.toLocalTime();

        Map<LocalDate, List<Order>> byDay = new HashMap<>();
        for (Order o : rangeOrders) {
            byDay.computeIfAbsent(o.getCreatedAt().toLocalDate(), k -> new ArrayList<>()).add(o);
        }

        List<BigDecimal> previous = new ArrayList<>();
        for (int w = 1; w <= LOW_SALES_WEEKS_BACK; w++) {
            List<Order> dayOrders = byDay.get(today.minusWeeks(w));
            if (dayOrders == null || dayOrders.isEmpty()) {
                continue;
            }
            BigDecimal untilNow = BigDecimal.ZERO;
            for (Order o : dayOrders) {
                if (!o.getCreatedAt().toLocalTime().isAfter(timeOfDay)) {
                    untilNow = untilNow.add(o.getTotal());
                }
            }
            previous.add(untilNow);
        }
        if (previous.size() < LOW_SALES_MIN_WEEKS_WITH_DATA) {
            return null;
        }

        double avg = previous.stream().mapToDouble(BigDecimal::doubleValue).average().orElse(0);
        if (avg <= 0) {
            return null;
        }
        double todayAmount = todayOrders.stream()
                .filter(o -> !o.getCreatedAt().isAfter(now))
                .mapToDouble(o -> o.getTotal().doubleValue())
                .sum();
        double ratio = todayAmount / avg;
        if (ratio >= LOW_SALES_RATIO) {
            return null;
        }

        String weekday = today.getDayOfWeek().getDisplayName(TextStyle.FULL, ES);
        return new Insight("LOW_SALES_TODAY", String.format(
                "Hoy llevas %s, el %d%% de lo que normalmente se vende un %s a esta hora (%s).",
                money(todayAmount), Math.round(ratio * 100), weekday, money(avg)));
    }

    /**
     * Unidades vendidas en los ultimos 7 dias vs los 7 anteriores.
     */
    private List<Insight> productDrops(LocalDate today, List<OrderItem> rangeItems) {
        LocalDate lastStart = today.minusDays(PRODUCT_DROP_WINDOW_DAYS);
        LocalDate prevStart = today.minusDays(PRODUCT_DROP_WINDOW_DAYS * 2L);

        Map<Long, Integer> last = new HashMap<>();
        Map<Long, Integer> prev = new HashMap<>();
        Map<Long, String> names = new HashMap<>();
        for (OrderItem item : rangeItems) {
            LocalDate d = item.getOrder().getCreatedAt().toLocalDate();
            Long id = item.getProduct().getId();
            names.put(id, item.getProduct().getName());
            if (!d.isBefore(lastStart)) {
                last.merge(id, item.getQuantity(), Integer::sum);
            } else if (!d.isBefore(prevStart)) {
                prev.merge(id, item.getQuantity(), Integer::sum);
            }
        }

        List<long[]> drops = new ArrayList<>(); // {productId, prevUnits, lastUnits, dropPercent}
        for (Map.Entry<Long, Integer> e : prev.entrySet()) {
            int prevUnits = e.getValue();
            int lastUnits = last.getOrDefault(e.getKey(), 0);
            if (prevUnits < PRODUCT_DROP_MIN_PREVIOUS_UNITS) continue;
            double drop = (double) (prevUnits - lastUnits) / prevUnits;
            if (drop >= PRODUCT_DROP_MIN_RATIO) {
                drops.add(new long[]{e.getKey(), prevUnits, lastUnits, Math.round(drop * 100)});
            }
        }
        drops.sort((a, b) -> Long.compare(b[3], a[3]));

        List<Insight> result = new ArrayList<>();
        for (long[] d : drops) {
            result.add(new Insight("PRODUCT_DROP", String.format(
                    "%s bajó %d%%: %d unidades en los últimos 7 días vs %d en los 7 anteriores.",
                    names.get(d[0]), d[3], d[2], d[1])));
        }
        return result;
    }

    // ------------------------------------------------------- recomendaciones

    /**
     * Pares de productos que aparecen juntos en el mismo pedido.
     */
    private List<Insight> combos(List<OrderItem> rangeItems) {
        Map<Long, Set<Long>> productsByOrder = new HashMap<>();
        Map<Long, String> names = new HashMap<>();
        for (OrderItem item : rangeItems) {
            productsByOrder.computeIfAbsent(item.getOrder().getId(), k -> new TreeSet<>())
                    .add(item.getProduct().getId());
            names.put(item.getProduct().getId(), item.getProduct().getName());
        }

        Map<String, Integer> pairCounts = new HashMap<>();
        for (Set<Long> products : productsByOrder.values()) {
            List<Long> ids = new ArrayList<>(products);
            for (int i = 0; i < ids.size(); i++) {
                for (int j = i + 1; j < ids.size(); j++) {
                    pairCounts.merge(ids.get(i) + ":" + ids.get(j), 1, Integer::sum);
                }
            }
        }

        List<Map.Entry<String, Integer>> pairs = new ArrayList<>(pairCounts.entrySet());
        pairs.removeIf(e -> e.getValue() < COMBO_MIN_ORDERS);
        pairs.sort((a, b) -> Integer.compare(b.getValue(), a.getValue()));

        List<Insight> result = new ArrayList<>();
        for (Map.Entry<String, Integer> e : limit(pairs, COMBO_MAX_PAIRS)) {
            String[] ids = e.getKey().split(":");
            String a = names.get(Long.valueOf(ids[0]));
            String b = names.get(Long.valueOf(ids[1]));
            result.add(new Insight("COMBO", String.format(
                    "%s y %s se piden juntos en %d pedidos del último mes: ¿armar un combo?",
                    a, b, e.getValue())));
        }
        return result;
    }

    /**
     * Productos disponibles en el menu sin ninguna venta en los ultimos 14 dias
     * (contando hoy).
     */
    private List<Insight> deadProducts(LocalDate today, List<OrderItem> rangeItems, List<OrderItem> todayItems) {
        LocalDate since = today.minusDays(DEAD_PRODUCT_DAYS);
        Set<Long> sold = new HashSet<>();
        for (OrderItem item : rangeItems) {
            if (!item.getOrder().getCreatedAt().toLocalDate().isBefore(since)) {
                sold.add(item.getProduct().getId());
            }
        }
        for (OrderItem item : todayItems) {
            sold.add(item.getProduct().getId());
        }

        List<Product> menu = new ArrayList<>(productRepository.findByAvailableTrue());
        menu.sort(Comparator.comparing(Product::getName, String.CASE_INSENSITIVE_ORDER));

        List<Insight> result = new ArrayList<>();
        for (Product p : menu) {
            if (!sold.contains(p.getId())) {
                result.add(new Insight("DEAD_PRODUCT", String.format(
                        "%s no se vende hace %d días: ¿promocionarlo o sacarlo del menú?",
                        p.getName(), DEAD_PRODUCT_DAYS)));
            }
        }
        return result;
    }

    /**
     * La franja de 2 horas consecutivas con menos ventas, dentro del rango de
     * horas en que normalmente hay ventas.
     */
    private Insight valleyPromo(List<Order> rangeOrders, int days) {
        if (days == 0) {
            return null;
        }
        Map<Integer, Set<LocalDate>> daysPerHour = new HashMap<>();
        double[] amount = new double[24];
        for (Order o : rangeOrders) {
            int h = o.getCreatedAt().getHour();
            daysPerHour.computeIfAbsent(h, k -> new HashSet<>()).add(o.getCreatedAt().toLocalDate());
            amount[h] += o.getTotal().doubleValue();
        }

        int first = -1;
        int last = -1;
        for (int h = 0; h < 24; h++) {
            int n = daysPerHour.getOrDefault(h, Set.of()).size();
            if (n >= days * NORMAL_HOUR_MIN_DAY_SHARE) {
                if (first < 0) first = h;
                last = h;
            }
        }
        if (first < 0 || last - first + 1 < VALLEY_MIN_NORMAL_HOURS_SPAN) {
            return null;
        }

        int bestStart = -1;
        double bestAmount = Double.MAX_VALUE;
        for (int h = first; h + VALLEY_WINDOW_HOURS - 1 <= last; h++) {
            double sum = 0;
            for (int k = 0; k < VALLEY_WINDOW_HOURS; k++) sum += amount[h + k];
            if (sum < bestAmount) {
                bestAmount = sum;
                bestStart = h;
            }
        }
        if (bestStart < 0) {
            return null;
        }
        return new Insight("VALLEY_PROMO", String.format(
                "Tu franja más floja es %s: ¿probar una promoción ahí?",
                hourRange(bestStart, bestStart + VALLEY_WINDOW_HOURS)));
    }

    // ---------------------------------------------------------------- utiles

    private static <T> List<T> limit(List<T> list, int max) {
        return list.size() <= max ? list : new ArrayList<>(list.subList(0, max));
    }

    private static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }

    private static String money(double value) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(ES);
        symbols.setGroupingSeparator('.');
        return "$" + new DecimalFormat("#,##0", symbols).format(Math.round(value));
    }

    /** 15, 17 -> "3-5 pm"; 11, 13 -> "11 am-1 pm". */
    static String hourRange(int from, int to) {
        String fromSuffix = from % 24 < 12 ? "am" : "pm";
        String toSuffix = to % 24 < 12 ? "am" : "pm";
        if (fromSuffix.equals(toSuffix)) {
            return hour12(from) + "-" + hour12(to) + " " + toSuffix;
        }
        return hour12(from) + " " + fromSuffix + "-" + hour12(to) + " " + toSuffix;
    }

    private static int hour12(int h) {
        int x = h % 12;
        return x == 0 ? 12 : x;
    }
}
