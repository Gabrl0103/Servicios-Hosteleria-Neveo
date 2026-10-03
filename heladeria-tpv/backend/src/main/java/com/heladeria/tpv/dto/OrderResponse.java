package com.heladeria.tpv.dto;

import com.heladeria.tpv.model.Order;
import com.heladeria.tpv.model.OrderItem;
import com.heladeria.tpv.model.OrderStatus;
import com.heladeria.tpv.model.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class OrderResponse {

    private Long id;
    private String userName;
    private Long tableId;
    private String tableName;
    private LocalDateTime createdAt;
    private BigDecimal total;
    private BigDecimal discountPercent;
    private PaymentMethod paymentMethod;
    private BigDecimal amountReceived;
    private BigDecimal changeGiven;
    private OrderStatus status;
    private String motivoAnulacion;
    private LocalDateTime anuladaEn;
    private String anuladaPor;
    private Long cashRegisterId;
    private List<ItemResponse> items;

    public OrderResponse(Order order) {
        this.id = order.getId();
        this.userName = order.getUser().getName();
        if (order.getTable() != null) {
            this.tableId = order.getTable().getId();
            this.tableName = order.getTable().getName();
        }
        this.createdAt = order.getCreatedAt();
        this.total = order.getTotal();
        this.discountPercent = order.getDiscountPercent();
        this.paymentMethod = order.getPaymentMethod();
        this.amountReceived = order.getAmountReceived();
        this.changeGiven = order.getChangeGiven();
        this.status = order.getStatus();
        this.motivoAnulacion = order.getMotivoAnulacion();
        this.anuladaEn = order.getVoidedAt();
        this.anuladaPor = order.getAnuladaPor();
        this.cashRegisterId = order.getCashRegister().getId();
        this.items = order.getItems().stream().map(ItemResponse::new).collect(Collectors.toList());
    }

    public Long getId() {
        return id;
    }

    public String getUserName() {
        return userName;
    }

    public Long getTableId() {
        return tableId;
    }

    public String getTableName() {
        return tableName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public BigDecimal getDiscountPercent() {
        return discountPercent;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public BigDecimal getAmountReceived() {
        return amountReceived;
    }

    public BigDecimal getChangeGiven() {
        return changeGiven;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public String getMotivoAnulacion() {
        return motivoAnulacion;
    }

    public LocalDateTime getAnuladaEn() {
        return anuladaEn;
    }

    public String getAnuladaPor() {
        return anuladaPor;
    }

    public Long getCashRegisterId() {
        return cashRegisterId;
    }

    public List<ItemResponse> getItems() {
        return items;
    }

    public static class ItemResponse {
        private String productName;
        private int quantity;
        private BigDecimal unitPrice;
        private BigDecimal subtotal;
        private String note;

        public ItemResponse(OrderItem item) {
            this.productName = item.getProduct().getName();
            this.quantity = item.getQuantity();
            this.unitPrice = item.getUnitPrice();
            this.subtotal = item.getSubtotal();
            this.note = item.getNote();
        }

        public String getProductName() {
            return productName;
        }

        public int getQuantity() {
            return quantity;
        }

        public BigDecimal getUnitPrice() {
            return unitPrice;
        }

        public BigDecimal getSubtotal() {
            return subtotal;
        }

        public String getNote() {
            return note;
        }
    }
}
