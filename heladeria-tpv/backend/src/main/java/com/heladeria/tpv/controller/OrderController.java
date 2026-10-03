package com.heladeria.tpv.controller;

import com.heladeria.tpv.dto.AnularOrderRequest;
import com.heladeria.tpv.dto.CreateOrderRequest;
import com.heladeria.tpv.dto.OrderResponse;
import com.heladeria.tpv.model.Order;
import com.heladeria.tpv.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request) {
        Order order = orderService.createOrder(request);
        return new OrderResponse(order);
    }

    @GetMapping("/{id}")
    public OrderResponse findById(@PathVariable Long id) {
        return new OrderResponse(orderService.findById(id));
    }

    @GetMapping
    public Page<OrderResponse> findByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return orderService.findByDateRange(from, to, page, size)
                .map(OrderResponse::new);
    }

    @PostMapping("/{id}/anular")
    public OrderResponse anularOrder(@PathVariable Long id, @RequestBody AnularOrderRequest request) {
        return new OrderResponse(orderService.anularOrder(id, request.getMotivo(), request.getPassword()));
    }
}
