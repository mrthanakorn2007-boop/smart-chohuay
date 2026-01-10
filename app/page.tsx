"use client";

import Link from "next/link";
import { ShoppingCart, BarChart3, Package, Settings, TrendingUp } from "lucide-react";
import { DarkModeToggle } from "./components/DarkModeToggle";

export default function Home() {
  return (
    <div className="grid-background h-dvh flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Logo */}
      <div className="text-center mb-8 z-10">
        <div className="bg-blue-600 dark:bg-blue-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-200 dark:shadow-blue-900/50">
          <ShoppingCart size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">ร้านแม่</h1>
      </div>

      {/* Grid Menu */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm z-10">

        <Link href="/pos" className="glass-card p-5 rounded-3xl flex flex-col items-center gap-2 hover:scale-105 transition active:scale-95 border-b-4 border-blue-100 dark:border-blue-900">
          <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full text-blue-600 dark:text-blue-400"><ShoppingCart size={28} /></div>
          <span className="font-bold text-gray-700 dark:text-gray-200">ขายของ</span>
        </Link>

        <Link href="/dashboard" className="glass-card p-5 rounded-3xl flex flex-col items-center gap-2 hover:scale-105 transition active:scale-95 border-b-4 border-orange-100 dark:border-orange-900">
          <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full text-orange-600 dark:text-orange-400"><BarChart3 size={28} /></div>
          <span className="font-bold text-gray-700 dark:text-gray-200">สรุปยอด</span>
        </Link>

        <Link href="/stats" className="glass-card p-5 rounded-3xl flex flex-col items-center gap-2 hover:scale-105 transition active:scale-95 border-b-4 border-purple-100 dark:border-purple-900">
          <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full text-purple-600 dark:text-purple-400"><TrendingUp size={28} /></div>
          <span className="font-bold text-gray-700 dark:text-gray-200">กราฟ/สถิติ</span>
        </Link>

        <Link href="/admin?tab=stock" className="glass-card p-5 rounded-3xl flex flex-col items-center gap-2 hover:scale-105 transition active:scale-95 border-b-4 border-green-100 dark:border-green-900">
          <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full text-green-600 dark:text-green-400"><Package size={28} /></div>
          <span className="font-bold text-gray-700 dark:text-gray-200">สต็อก</span>
        </Link>

        <Link href="/admin?tab=settings" className="glass-card p-5 rounded-3xl flex flex-col items-center gap-2 hover:scale-105 transition active:scale-95 border-b-4 border-gray-100 dark:border-gray-700 col-span-2">
          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full text-gray-600 dark:text-gray-300"><Settings size={28} /></div>
          <span className="font-bold text-gray-700 dark:text-gray-200">ตั้งค่า / จัดการหลังบ้าน</span>
        </Link>

      </div>

      <p className="absolute bottom-4 text-xs text-gray-400 dark:text-gray-500">Smart Chohuay v2.0</p>

      <DarkModeToggle />
    </div>
  );
}