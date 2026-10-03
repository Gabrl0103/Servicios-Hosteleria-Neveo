package com.heladeria.tpv.service;

import com.heladeria.tpv.dto.CreateOrderRequest;
import com.heladeria.tpv.exception.BusinessRuleException;
import com.heladeria.tpv.exception.ResourceNotFoundException;
import com.heladeria.tpv.model.*;
import com.heladeria.tpv.repository.OrderRepository;
import com.heladeria.tpv.repository.PendingTableItemRepository;
import com.heladeria.tpv.repository.ProductRepository;
import com.heladeria.tpv.repository.RestaurantTableRepository;
import com.heladeria.tpv.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CashRegisterService cashRegisterService;
    private final RestaurantTableRepository tableRepository;
    private final PendingTableItemRepository pendingTableItemRepository;
    private final AdminPasswordService adminPasswordService;

    public OrderService(OrderRepository orderRepository,
                         ProductRepository productRepository,
                         UserRepository userRepository,
                         CashRegisterService cashRegisterService,
                         RestaurantTableRepository tableRepository,
                         PendingTableItemRepository pendingTableItemRepository,
                         AdminPasswordService adminPasswordService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.cashRegisterService = cashRegisterService;
        this.tableRepository = tableRepository;
        this.pendingTableItemRepository = pendingTableItemRepository;
        this.adminPasswordService = adminPasswordService;
    }

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        CashRegister openRegister = cashRegisterService.getOpenRegisterOrThrow();

        Order order = new Order();
        order.setUser(user);
        order.setCashRegister(openRegister);
        order.setCreatedAt(LocalDateTime.now());
        order.setPaymentMethod(request.getPaymentMethod());

        if (request.getTableId() != null) {
            RestaurantTable table = tableRepository.findById(request.getTableId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mesa no encontrada"));
            order.setTable(table);
        }

        BigDecimal subtotal = BigDecimal.ZERO;

        for (CreateOrderRequest.OrderItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Producto no encontrado: " + itemRequest.getProductId()));

            OrderItem item = new OrderItem(order, product, itemRequest.getQuantity(), product.getPrice(),
                    itemRequest.getNote());
            order.getItems().add(item);
            subtotal = subtotal.add(item.getSubtotal());
        }

        BigDecimal total = subtotal;
        if (request.getDiscountPercent() != null && request.getDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal discountAmount = subtotal
                    .multiply(request.getDiscountPercent())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            total = subtotal.subtract(discountAmount);
            order.setDiscountPercent(request.getDiscountPercent());
        }

        order.setTotal(total);

        if (request.getPaymentMethod() == PaymentMethod.EFECTIVO) {
            BigDecimal received = request.getAmountReceived();
            if (received != null) {
                if (received.compareTo(total) < 0) {
                    throw new BusinessRuleException("El monto recibido es menor al total a pagar");
                }
                order.setAmountReceived(received);
                order.setChangeGiven(received.subtract(total));
            }
        }

        Order saved = orderRepository.save(order);

        if (saved.getTable() != null) {
            RestaurantTable table = saved.getTable();
            table.setPendingTotal(BigDecimal.ZERO);
            tableRepository.save(table);
            pendingTableItemRepository.deleteByTableId(table.getId());
        }

        return saved;
    }

    public List<Order> findByCashRegister(Long cashRegisterId) {
        return orderRepository.findByCashRegisterIdAndStatus(cashRegisterId, OrderStatus.CONFIRMADO);
    }

    public Order findById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado"));
    }

    public Page<Order> findByDateRange(java.time.LocalDate from, java.time.LocalDate to, int page, int size) {
        return orderRepository.findAllBetweenPaged(
                from.atStartOfDay(),
                to.plusDays(1).atStartOfDay(),
                PageRequest.of(page, size));
    }

    /**
     * Anulacion (soft-delete) protegida por la contraseña de administrador.
     * Orden de validacion: contraseña configurada (409), contraseña correcta
     * (403), motivo no vacio, y la orden pertenece al turno abierto.
     */
    @Transactional
    public Order anularOrder(Long orderId, String motivo, String password) {
        adminPasswordService.verifyOrThrow(password);
        if (motivo == null || motivo.isBlank()) {
            throw new BusinessRuleException("El motivo de anulación es obligatorio");
        }
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado"));
        if (order.getStatus() == OrderStatus.ANULADO) {
            throw new BusinessRuleException("Este pedido ya está anulado");
        }
        CashRegister openRegister = cashRegisterService.getOpenRegisterOrThrow();
        if (!order.getCashRegister().getId().equals(openRegister.getId())) {
            throw new BusinessRuleException("Solo se pueden anular ventas del turno actualmente abierto");
        }
        order.setStatus(OrderStatus.ANULADO);
        order.setMotivoAnulacion(motivo.trim());
        order.setVoidedAt(LocalDateTime.now());
        order.setAnuladaPor(openRegister.getCashierName());
        return orderRepository.save(order);
    }
}
