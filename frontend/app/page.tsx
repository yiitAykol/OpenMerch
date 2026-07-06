"use client";
import { useState, useEffect } from "react";
import ProductCard from "./components/ProductCard"

// importlar buraya (useState, useEffect)
import styles from "./page.module.scss";

export default function Home() {
  // state buraya
  //const [products, setProducts] = useState([]);
  const [products, setProducts] = useState<any[]>([]);
  // useEffect buraya
  useEffect(() => {
    async function load() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`);
      const data = await res.json();
      setProducts(data);
    }
    load();
  }, []);

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
  console.log("ProductCard tipi:", typeof ProductCard, ProductCard);

}