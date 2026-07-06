"use client";

import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, totalPrice } = useCart();

  if (!cart) {
    return <div style={{ padding: '2rem' }}>Yükleniyor...</div>;
  }

  if (cart.items.length === 0) {
    return <div style={{ padding: '2rem' }}>Sepetiniz boş.</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Sepetim</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {cart.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
            <div>
              <h3>{item.product.name}</h3>
              <p>Birim Fiyat: {item.product.price} TL</p>
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
    </div>
  );
}
