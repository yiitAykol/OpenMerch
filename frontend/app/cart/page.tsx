"use client";

import Link from "next/link";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, totalPrice } = useCart();

  if (!cart) {
    return <div style={{ padding: '2rem' }}>Yükleniyor...</div>;
  }

  if (cart.items.length === 0) {
    return <div style={{ padding: '2rem' }}>Sepetiniz boş.</div>;
  }

  // Tek bir kalem bile stoğu aşıyorsa checkout backend'de zaten reddedilecek.
  // Kullanıcıyı formu doldurup en sonda hata almaya göndermenin anlamı yok.
  const hasStockProblem = cart.items.some((item) => item.quantity > item.product.stock);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Sepetim</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {cart.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
            <div>
              <h3>{item.product.name}</h3>
              <p>Birim Fiyat: {item.product.price} TL</p>
              {/* Sepete koyduktan sonra stok başkası tarafından tüketilmiş
                  olabilir; kullanıcı bunu ödeme adımında değil burada görsün. */}
              {item.quantity > item.product.stock && (
                <p style={{ color: '#b91c1c', fontWeight: 600, fontSize: '0.9rem' }}>
                  {item.product.stock <= 0
                    ? 'Bu ürün tükendi, siparişi tamamlayamazsınız.'
                    : `Stokta yalnızca ${item.product.stock} adet kaldı.`}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                style={{ padding: '0.2rem 0.6rem' }}
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                disabled={item.quantity >= item.product.stock}
                style={{ padding: '0.2rem 0.6rem' }}
              >
                +
              </button>
            </div>

            <div style={{ fontWeight: 'bold' }}>
              {(item.product.price * item.quantity).toFixed(2)} TL
            </div>

            <button 
              onClick={() => removeFromCart(item.id)}
              style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              Kaldır
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'right', fontSize: '1.2rem' }}>
        <strong>Genel Toplam: {totalPrice.toFixed(2)} TL</strong>
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
        {hasStockProblem ? (
          // Link'i "disabled" yapmanın bir yolu yok — bağlantı ya vardır ya
          // yoktur. Bu yüzden pasif halde <span> basıyoruz.
          <span
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: '#d4d4d4',
              color: '#6b7280',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'not-allowed',
            }}
            title="Stoğu aşan ürünlerin adedini düşürün"
          >
            Siparişi Tamamla
          </span>
        ) : (
          <Link
            href="/checkout"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: '#4f46e5',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Siparişi Tamamla
          </Link>
        )}
      </div>
    </div>
  );
}
