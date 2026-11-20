import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Home from "./Home.tsx";
import Favorites from "./Favorites.tsx";
import React from "react";



export default function App() {

    interface Product {
        id: number,
        name: string,
        isPurchased: boolean,
    }

    const [products, setProduct]= useState(<Product[]>[
        {id:1, name:"table", isPurchased:true},
        {id:2, name:"chair", isPurchased:false},
    ]);

    function togglePurchased(id: number) {
        setProduct(
            products.map(product=> {
                if (product.id === id) {
                    return {
                        ...product,
                        isPurchased: !product.isPurchased
                    }
                } else {
                    return product
                }
            }
        )
    }


    return (
        <main>
        {products.map(product=> {
            return (
            <React.Fragment key={product.id}>
            <div> {product.name} — {product.isPurchased ? "Purchased": "Not purchased"}</div>
            <button onClick={(()=> {togglePurchased(product.id)})}>
            </button>
            </React.Fragment>
        )})}
        </main>
    )
}