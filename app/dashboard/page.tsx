"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Trash2, Edit2, Check, X } from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
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
              const today = new Date(); today.setHours(0, 0, 0, 0);
              // ดึงบิลที่สร้างวันนี้ หรือ จ่ายเงินวันนี้
              // *หมายเหตุ: การดึงแบบนี้อาจซับซ้อนใน SQL จริง แต่เพื่อความง่ายเราดึง created_at วันนี้มาแสดงเป็นหลักก่อน
              // แต่ยอดเงินจะนับเฉพาะที่ status = PAID
              const { data } = await supabase.from('orders').select('*, order_items(*)').gte('created_at', today.toISOString()).order('created_at', { ascending: false });
              if (data) setOrders(data);
              setLoading(false);
       }

       // คำนวณยอด (The Truth)
       const realSales = orders.filter(o => o.status === 'PAID').reduce((sum, o) => sum + o.total_amount, 0);
       const debtPending = orders.filter(o => o.status === 'UNPAID').reduce((sum, o) => sum + o.total_amount, 0);
       const totalCount = orders.length;

       // กราฟ (แสดงเฉพาะยอดที่เก็บเงินได้จริง)
       const hourlyData = Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, total: 0 }));
       orders.filter(o => o.status === 'PAID').forEach(o => { const h = new Date(o.created_at).getHours(); hourlyData[h].total += o.total_amount; });

       const handleDelete = async (id: number) => { if (confirm("ลบบิลและคืนของ?")) { const res = await deleteOrder(id); if (res.success) setOrders(orders.filter(o => o.id !== id)); } };
       const handleStartEdit = (item: any) => { setEditingItemId(item.id); setEditName(item.product_name); };
       const handleSaveEdit = async (itemId: number) => { const res = await updateOrderItemName(itemId, editName); if (res.success) { setOrders(orders.map(o => ({ ...o, order_items: o.order_items.map((i: any) => i.id === itemId ? { ...i, product_name: editName } : i) }))); setEditingItemId(null); } };

       const downloadExcel = () => {
              const data = orders.map(o => ({
                     ID: o.id,
                     Time: new Date(o.created_at).toLocaleTimeString('th-TH'),
                     Status: o.status === 'PAID' ? 'จ่ายแล้ว' : 'ติดหนี้',
                     Customer: o.customer_name || '-',
                     Total: o.total_amount,
                     Items: o.order_items.map((i: any) => `${i.product_name} x${i.quantity}`).join(', ')
              }));
              const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sales"); XLSX.writeFile(wb, "Sales.xlsx");
       };

       if (loading) return <div className="p-10 text-center">Loading...</div>;

       return (
              <div className="min-h-screen bg-gray-50 p-6 max-w-3xl mx-auto pb-20">
                     <div className="flex items-center justify-between mb-6"><Link href="/" className="text-gray-500 font-bold flex items-center gap-1"><ArrowLeft size={20} /> หน้าร้าน</Link><button onClick={downloadExcel} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Download size={18} /> Excel</button></div>

                     <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
                                   <div className="text-gray-400 text-xs font-bold mb-1">เงินเข้ากระเป๋าวันนี้</div>
                                   <div className="text-2xl font-extrabold text-blue-600">{realSales.toLocaleString()}.-</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
                                   <div className="text-gray-400 text-xs font-bold mb-1">ยอดติดหนี้ (รอเก็บ)</div>
                                   <div className="text-2xl font-extrabold text-orange-500">{debtPending.toLocaleString()}.-</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                   <div className="text-gray-400 text-xs font-bold mb-1">บิลทั้งหมด</div>
                                   <div className="text-2xl font-extrabold text-gray-700">{totalCount}</div>
                            </div>
                     </div>

                     <div className="bg-white p-5 rounded-2xl shadow-sm mb-6 h-64 border border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 mb-2">กราฟรายได้จริง (ไม่รวมหนี้)</h4>
                            <ResponsiveContainer width="100%" height="100%"><BarChart data={hourlyData.filter(h => h.total > 0).length > 0 ? hourlyData : []}><XAxis dataKey="name" fontSize={10} /><Tooltip cursor={{ fill: '#f3f4f6' }} /><Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                     </div>

                     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b bg-gray-50"><h3 className="font-bold text-gray-700">รายการวันนี้</h3></div>
                            <div className="divide-y">
                                   {orders.map((order) => (
                                          <div key={order.id} className="p-4 hover:bg-gray-50 transition">
                                                 <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                               <span className="font-bold text-gray-800">#{order.id}</span>
                                                               {order.status === 'UNPAID' ? <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white bg-orange-500">ติดหนี้ ({order.customer_name})</span> : <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white bg-green-500">จ่ายแล้ว ({order.payment_method})</span>}
                                                        </div>
                                                        <div className="flex items-center gap-3"><span className={`font-bold text-lg ${order.status === 'UNPAID' ? 'text-orange-500' : 'text-blue-600'}`}>{order.total_amount}.-</span><button onClick={() => handleDelete(order.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button></div>
                                                 </div>
                                                 <div className="space-y-1">
                                                        {order.order_items.map((item: any) => (
                                                               <div key={item.id} className="text-sm flex items-center gap-2 group">
                                                                      {editingItemId === item.id ? (
                                                                             <div className="flex items-center gap-2 w-full"><input autoFocus value={editName} onChange={e => setEditName(e.target.value)} className="border p-1 rounded w-full" /><button onClick={() => handleSaveEdit(item.id)} className="text-green-600"><Check size={16} /></button><button onClick={() => setEditingItemId(null)} className="text-gray-400"><X size={16} /></button></div>
                                                                      ) : (
                                                                             <><span className="text-gray-600">• {item.product_name} ({item.quantity})</span><button onClick={() => handleStartEdit(item)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition"><Edit2 size={12} /></button></>
                                                                      )}
                                                               </div>
                                                        ))}
                                                 </div>
                                          </div>
                                   ))}
                            </div>
                     </div>
              </div>
       );
}