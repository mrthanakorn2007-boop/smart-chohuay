"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Trash2, Check, X, FileText, Home, RefreshCw, Edit2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";
import { deleteOrder, updateOrderItemName } from "../actions";

export default function Dashboard() {
       const [orders, setOrders] = useState<any[]>([]);
       const [loading, setLoading] = useState(true);
       const [editingItemId, setEditingItemId] = useState<number | null>(null);
       const [editName, setEditName] = useState("");

       useEffect(() => { loadOrders(); }, []);

       async function loadOrders() {
              setLoading(true);
              try {
                     // ✅ แก้ไขจุดสำคัญ: เปลี่ยนจาก order('created_at') เป็น order('id')
                     // เพื่อให้บิลล่าสุด (เลขเยอะสุด) อยู่บนสุดเสมอ ไม่สนเวลา
                     const { data, error } = await supabase
                            .from('orders')
                            .select('*, order_items(*)')
                            .order('id', { ascending: false }) // <--- แก้ตรงนี้ครับ
                            .limit(200); // เพิ่มลิมิตเผื่อให้เห็นเยอะขึ้น

                     if (data) {
                            setOrders(data);
                     }
              } catch (e) {
                     console.error("Load Error:", e);
              } finally {
                     setLoading(false);
              }
       }

       // --- Helper: แปลงเวลาไทย ---
       const getThaiTime = (isoDate: string) => {
              return new Date(isoDate).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
       };
       const getThaiDate = (isoDate: string) => {
              return new Date(isoDate).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
       };

       // --- Logic คำนวณยอด (เฉพาะวันนี้) ---
       // เช็คจากวันที่ปัจจุบันจริงๆ
       const todayDateStr = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });

       const todayOrders = orders.filter(o => getThaiDate(o.created_at) === todayDateStr);

       const realSales = todayOrders.filter(o => o.status === 'PAID').reduce((sum, o) => sum + o.total_amount, 0);
       const debtPending = todayOrders.filter(o => o.status === 'UNPAID').reduce((sum, o) => sum + o.total_amount, 0);
       const totalCount = todayOrders.length;

       // Actions
       const handleDelete = async (id: number) => { if (confirm("ลบบิลและคืนของ?")) { const res = await deleteOrder(id); if (res.success) setOrders(orders.filter(o => o.id !== id)); } };
       const handleStartEdit = (item: any) => { setEditingItemId(item.id); setEditName(item.product_name); };
       const handleSaveEdit = async (itemId: number) => { const res = await updateOrderItemName(itemId, editName); if (res.success) { setOrders(orders.map(o => ({ ...o, order_items: o.order_items.map((i: any) => i.id === itemId ? { ...i, product_name: editName } : i) }))); setEditingItemId(null); } };

       const downloadExcel = () => {
              const data = orders.map(o => ({
                     ID: o.id,
                     Date: getThaiDate(o.created_at),
                     Time: getThaiTime(o.created_at),
                     Status: o.status === 'PAID' ? 'จ่ายแล้ว' : 'ติดหนี้',
                     Customer: o.customer_name || '-',
                     Total: o.total_amount,
                     Items: o.order_items ? o.order_items.map((i: any) => `${i.product_name} x${i.quantity}`).join(', ') : ''
              }));
              const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sales"); XLSX.writeFile(wb, "Sales.xlsx");
       };

       return (
              <div className="flex flex-col h-dvh bg-gray-50 overflow-hidden">

                     {/* Header */}
                     <div className="flex-none p-4 pt-safe flex items-center justify-between z-20 bg-white shadow-sm">
                            <Link href="/" className="px-3 py-2 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center gap-1 active:scale-95 transition">
                                   <Home size={18} /> เมนู
                            </Link>
                            <div className="flex gap-2">
                                   <button onClick={loadOrders} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-full active:scale-95 transition flex items-center gap-1 border">
                                          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                                   </button>
                                   <button onClick={downloadExcel} className="bg-green-600 text-white px-3 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-md active:scale-95 transition">
                                          <Download size={18} /> Excel
                                   </button>
                            </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-4 pb-safe">
                            <div className="max-w-3xl mx-auto pb-20">

                                   {/* Cards (สรุปยอดวันนี้) */}
                                   <div className="grid grid-cols-3 gap-3 mb-6">
                                          <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-blue-500">
                                                 <div className="text-gray-400 text-[10px] font-bold mb-1 uppercase">เงินเข้าวันนี้</div>
                                                 <div className="text-xl sm:text-3xl font-extrabold text-blue-600 truncate">{realSales.toLocaleString()}</div>
                                          </div>
                                          <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-orange-500">
                                                 <div className="text-gray-400 text-[10px] font-bold mb-1 uppercase">รอเก็บ (หนี้)</div>
                                                 <div className="text-xl sm:text-3xl font-extrabold text-orange-500 truncate">{debtPending.toLocaleString()}</div>
                                          </div>
                                          <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-gray-500">
                                                 <div className="text-gray-400 text-[10px] font-bold mb-1 uppercase">บิลวันนี้</div>
                                                 <div className="text-xl sm:text-3xl font-extrabold text-gray-700 truncate">{totalCount}</div>
                                          </div>
                                   </div>

                                   {/* List Header */}
                                   <div className="flex items-center gap-2 mb-3 px-2">
                                          <FileText size={18} className="text-gray-500" />
                                          <h3 className="font-bold text-gray-700">รายการล่าสุด (เรียงตามเลขบิล)</h3>
                                   </div>

                                   {/* List Body */}
                                   <div className="space-y-3">
                                          {orders.length === 0 && !loading && (
                                                 <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed">
                                                        ยังไม่มีรายการขาย
                                                 </div>
                                          )}

                                          {orders.map((order) => {
                                                 const isToday = getThaiDate(order.created_at) === todayDateStr;
                                                 return (
                                                        <div key={order.id} className={`p-4 rounded-2xl shadow-sm border transition-all animate-in slide-in-from-bottom-2 ${isToday ? 'bg-white border-blue-100' : 'bg-gray-100 border-gray-200 opacity-70 grayscale-[0.5]'}`}>
                                                               {/* บรรทัดบน: ID + สถานะ + ปุ่มลบ */}
                                                               <div className="flex justify-between items-start mb-2">
                                                                      <div className="flex flex-wrap items-center gap-2">
                                                                             <span className="font-bold text-gray-800 text-sm">#{order.id}</span>
                                                                             {order.status === 'UNPAID' ?
                                                                                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold text-white bg-orange-500">ติดหนี้ ({order.customer_name})</span> :
                                                                                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold text-white bg-green-500">จ่ายแล้ว ({order.payment_method})</span>
                                                                             }
                                                                      </div>
                                                                      <div className="flex items-center gap-3">
                                                                             <span className={`font-bold text-lg ${order.status === 'UNPAID' ? 'text-orange-500' : 'text-blue-600'}`}>{order.total_amount}.-</span>
                                                                             <button onClick={() => handleDelete(order.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                                                      </div>
                                                               </div>

                                                               {/* เวลา */}
                                                               <div className="text-[10px] text-gray-400 mb-2 border-b pb-1">
                                                                      {getThaiDate(order.created_at)} • {getThaiTime(order.created_at)} น.
                                                               </div>

                                                               {/* รายการสินค้า */}
                                                               <div className="space-y-1 pl-2 border-l-2 border-gray-100">
                                                                      {order.order_items && order.order_items.length > 0 ? (
                                                                             order.order_items.map((item: any) => (
                                                                                    <div key={item.id} className="text-sm flex items-center gap-2 min-h-[24px]">
                                                                                           {editingItemId === item.id ? (
                                                                                                  <div className="flex items-center gap-1 w-full animate-in fade-in">
                                                                                                         <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} className="border p-1 rounded w-full text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                                                                                                         <button onClick={() => handleSaveEdit(item.id)} className="bg-green-100 text-green-600 p-1 rounded"><Check size={14} /></button>
                                                                                                         <button onClick={() => setEditingItemId(null)} className="bg-gray-100 text-gray-500 p-1 rounded"><X size={14} /></button>
                                                                                                  </div>
                                                                                           ) : (
                                                                                                  <>
                                                                                                         <span className="text-gray-600 text-sm">• {item.product_name} <span className="text-gray-400">x{item.quantity}</span></span>
                                                                                                         <button onClick={() => handleStartEdit(item)} className="text-gray-300 hover:text-blue-500"><Edit2 size={12} /></button>
                                                                                                  </>
                                                                                           )}
                                                                                    </div>
                                                                             ))
                                                                      ) : (
                                                                             <div className="text-xs text-red-300 italic">ไม่พบรายการสินค้า</div>
                                                                      )}
                                                               </div>
                                                        </div>
                                                 );
                                          })}
                                   </div>
                            </div>
                     </div>
              </div>
       );
}