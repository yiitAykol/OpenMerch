package com.example.productapi;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

// "order" SQL'de rezerve kelimedir (ORDER BY); tablo adını elle veriyoruz.
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    private Instant createdAt;

    private String status = "NEW";

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<OrderItem> items = new ArrayList<>();

    // Sipariş anındaki toplam tutar (snapshot).
    private BigDecimal totalAmount;

    // ---- Teslimat bilgileri ----
    private String fullName;

    @Column(length = 1000)
    private String address;

    private String city;

    @Column(length = 30)
    private String phone;

    @Column(length = 1000)
    private String note;  // Müşteri notu

    // ---- Fatura bilgileri ----
    private Boolean invoiceRequired = false;

    @Column(length = 200)
    private String invoiceTitle; // Fatura başlığı (şirket/isim)

    @Column(length = 100)
    private String taxOffice;    // Vergi dairesi

    @Column(length = 20)
    private String taxId;        // TC / Vergi no

    public Order() {
    }

    public Order(User user, Instant createdAt, String status) {
        this.user = user;
        this.createdAt = createdAt;
        this.status = status;
    }

    // İki yönlü ilişkiyi tek yerden kuruyoruz: listeye ekle + karşı tarafı işaretle.
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
    }

    // Siparişin hangi hesaba ait olduğu admin listesinde görünmeli. User nesnesinin
    // tamamı @JsonIgnore ile kapalı olduğundan yalnızca bu iki alanı JSON'a açıyoruz.
    @JsonProperty("customerUsername")
    public String getCustomerUsername() {
        return user == null ? null : user.getUsername();
    }

    @JsonProperty("customerEmail")
    public String getCustomerEmail() {
        return user == null ? null : user.getEmail();
    }

    // Kalemlerin ara toplamlarından genel toplamı hesaplar.
    public void updateTotals() {
        this.totalAmount = items.stream()
                .map(OrderItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }
    public void setUser(User user) {
        this.user = user;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getStatus() {
        return status;
    }
    public void setStatus(String status) {
        this.status = status;
    }

    public List<OrderItem> getItems() {
        return items;
    }
    public void setItems(List<OrderItem> items) {
        this.items = items;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }
    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getFullName() {
        return fullName;
    }
    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getAddress() {
        return address;
    }
    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }
    public void setCity(String city) {
        this.city = city;
    }

    public String getPhone() {
        return phone;
    }
    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getNote() {
        return note;
    }
    public void setNote(String note) {
        this.note = note;
    }

    public Boolean getInvoiceRequired() {
        return invoiceRequired;
    }
    public void setInvoiceRequired(Boolean invoiceRequired) {
        this.invoiceRequired = invoiceRequired;
    }

    public String getInvoiceTitle() {
        return invoiceTitle;
    }
    public void setInvoiceTitle(String invoiceTitle) {
        this.invoiceTitle = invoiceTitle;
    }

    public String getTaxOffice() {
        return taxOffice;
    }
    public void setTaxOffice(String taxOffice) {
        this.taxOffice = taxOffice;
    }

    public String getTaxId() {
        return taxId;
    }
    public void setTaxId(String taxId) {
        this.taxId = taxId;
    }
}
