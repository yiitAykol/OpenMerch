// Sipariş tipleri ve ortak biçimlendirme yardımcıları.
// Sipariş sayfaları (checkout, geçmiş, detay, admin) buradan besleniyor.

export type OrderItemType = {
    id: number;
    productId: number | null;
    productName: string;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    subtotal: number;
};

export type OrderType = {
    id: number;
    createdAt: string;
    status: string;
    totalAmount: number;
    fullName: string;
    address: string;
    city: string;
    phone: string;
    note: string | null;
    invoiceRequired: boolean;
    invoiceTitle: string | null;
    taxOffice: string | null;
    taxId: string | null;
    items: OrderItemType[];
    // Yalnızca admin listesinde işe yarar; backend User nesnesinin tamamını
    // gizleyip bu iki alanı türetilmiş getter olarak açar.
    customerUsername: string | null;
    customerEmail: string | null;
};

// Backend durumu teknik bir metin olarak tutar; kullanıcıya Türkçesini gösteriyoruz.
export const ORDER_STATUS_LABELS: Record<string, string> = {
    NEW: "Sipariş Alındı",
    PREPARING: "Hazırlanıyor",
    SHIPPED: "Kargoya Verildi",
    DELIVERED: "Teslim Edildi",
    CANCELLED: "İptal Edildi",
};

// Admin panelindeki durum seçim kutusu bu sırayı kullanır.
export const ORDER_STATUS_OPTIONS = Object.keys(ORDER_STATUS_LABELS);

// Kullanıcının kendi siparişini iptal edebildiği durumlar.
// Backend'deki OrderController.CANCELLABLE_STATUSES'ın kopyasıdır — bilinçli bir
// tekrar. Buradaki kopya yalnızca butonu gösterip gizler, yani bir kolaylıktır;
// asıl kararı her zaman backend verir. Bu liste yanlış olsa bile kural delinmez,
// kullanıcı sadece işe yaramayacak bir buton görür.
export const CANCELLABLE_STATUSES = ["NEW", "PREPARING"];

export function canCancel(status: string): boolean {
    return CANCELLABLE_STATUSES.includes(status);
}

export function statusLabel(status: string): string {
    return ORDER_STATUS_LABELS[status] ?? status;
}

export function formatPrice(value: number): string {
    return `${Number(value).toFixed(2)} TL`;
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleString("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}
