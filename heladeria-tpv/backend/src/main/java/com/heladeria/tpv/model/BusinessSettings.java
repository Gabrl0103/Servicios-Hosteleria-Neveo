package com.heladeria.tpv.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "business_settings")
public class BusinessSettings {

    @Id
    private Long id;

    @Column(nullable = false)
    private String businessName;

    private String nit;

    private String address;

    private String phone;

    private String logoPath;

    @Transient
    private String logoBase64;

    private String businessHours;

    private String instagramHandle;

    private String facebookUrl;

    private String whatsappNumber;

    // Hash BCrypt de la contraseña de administrador. Nunca se serializa:
    // los GET solo exponen adminPasswordSet.
    @JsonIgnore
    private String adminPasswordHash;

    public BusinessSettings() {
    }

    public BusinessSettings(Long id, String businessName, String nit, String address, String phone) {
        this.id = id;
        this.businessName = businessName;
        this.nit = nit;
        this.address = address;
        this.phone = phone;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBusinessName() {
        return businessName;
    }

    public void setBusinessName(String businessName) {
        this.businessName = businessName;
    }

    public String getNit() {
        return nit;
    }

    public void setNit(String nit) {
        this.nit = nit;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getLogoPath() {
        return logoPath;
    }

    public void setLogoPath(String logoPath) {
        this.logoPath = logoPath;
    }

    public String getLogoBase64() {
        return logoBase64;
    }

    public void setLogoBase64(String logoBase64) {
        this.logoBase64 = logoBase64;
    }

    public String getBusinessHours() {
        return businessHours;
    }

    public void setBusinessHours(String businessHours) {
        this.businessHours = businessHours;
    }

    public String getInstagramHandle() {
        return instagramHandle;
    }

    public void setInstagramHandle(String instagramHandle) {
        this.instagramHandle = instagramHandle;
    }

    public String getFacebookUrl() {
        return facebookUrl;
    }

    public void setFacebookUrl(String facebookUrl) {
        this.facebookUrl = facebookUrl;
    }

    public String getWhatsappNumber() {
        return whatsappNumber;
    }

    public void setWhatsappNumber(String whatsappNumber) {
        this.whatsappNumber = whatsappNumber;
    }

    public String getAdminPasswordHash() {
        return adminPasswordHash;
    }

    public void setAdminPasswordHash(String adminPasswordHash) {
        this.adminPasswordHash = adminPasswordHash;
    }

    @JsonProperty("adminPasswordSet")
    public boolean isAdminPasswordSet() {
        return adminPasswordHash != null && !adminPasswordHash.isBlank();
    }
}
