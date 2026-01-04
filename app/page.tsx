"use client";

import Link from "next/link";
import { ShoppingCart, BarChart3, Package, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="grid-background h-dvh flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Logo / Header */}
      <div className="text-center mb-10 z-10">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-200">
          <ShoppingCart size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-800">ร้านแม่</h1>
        <p className="text-gray-500 mt-1">ระบบจัดการร้าน</p>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm z-10">

        <Link href="/pos" className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-3 hover:scale-105 transition active:scale-95 group border-b-4 border-blue-100">
          <div className="bg-blue-100 p-4 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
            <ShoppingCart size={32} />
          </div>
          <span className="font-bold text-gray-700 text-lg">ขายของ</span>
        </Link>

        <Link href="/dashboard" className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-3 hover:scale-105 transition active:scale-95 group border-b-4 border-orange-100">
          <div className="bg-orange-100 p-4 rounded-full text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition">
            <BarChart3 size={32} />
          </div>
          <span className="font-bold text-gray-700 text-lg">สรุปยอด</span>
        </Link>

        <Link href="/admin?tab=stock" className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-3 hover:scale-105 transition active:scale-95 group border-b-4 border-green-100">
          <div className="bg-green-100 p-4 rounded-full text-green-600 group-hover:bg-green-600 group-hover:text-white transition">
            <Package size={32} />
          </div>
          <span className="font-bold text-gray-700 text-lg">สต็อก</span>
        </Link>

        <Link href="/admin?tab=settings" className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-3 hover:scale-105 transition active:scale-95 group border-b-4 border-gray-100">
          <div className="bg-gray-100 p-4 rounded-full text-gray-600 group-hover:bg-gray-800 group-hover:text-white transition">
            <Settings size={32} />
          </div>
          <span className="font-bold text-gray-700 text-lg">ตั้งค่า</span>
        </Link>

      </div>

      <p className="absolute bottom-6 text-xs text-gray-400">Version 2.0 Demo</p>
    </div>
  );
}