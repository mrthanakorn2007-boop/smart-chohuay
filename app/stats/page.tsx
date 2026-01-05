"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, DollarSign, PieChart as PieIcon, BarChart3, Calendar, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { getSalesStats } from "../actions";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export default function StatsPage() {
       const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');
       const [data, setData] = useState<{ topSelling: any[], totalSales: number } | null>(null);
       const [loading, setLoading] = useState(true);

       useEffect(() => { loadStats(); }, [period]);

       async function loadStats() {
              setLoading(true);
              try {
                     const res = await getSalesStats(period);
                     setData(res);
              } catch (e) {
                     console.error(e);
              } finally {
                     setLoading(false);
              }
       }

       // Helper สำหรับแปลงคำ
       const getPeriodLabel = () => {
              switch (period) {
                     case 'TODAY': return 'วันนี้';
                     case 'WEEK': return '7 วันล่าสุด';
                     case 'MONTH': return 'เดือนนี้';
                     case 'ALL': return 'ตั้งแต่เริ่มขาย';
              }
       };

       return (
              <div className="flex flex-col h-dvh grid-background overflow-hidden">

                     {/* Header */}
                     <div className="flex-none p-4 pt-safe flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                   <Link href="/" className="bg-white p-2 rounded-full shadow-sm text-gray-600 hover:bg-gray-50 transition active:scale-95">
                                          <ArrowLeft size={20} />
                                   </Link>
                                   <h1 className="font-extrabold text-gray-800 text-xl flex items-center gap-2">
                                          <TrendingUp className="text-blue-600" /> สถิติร้าน
                                   </h1>
                            </div>
                     </div>

                     {/* Filter Tabs */}
                     <div className="flex-none px-4 pb-4">
                            <div className="bg-white p-1.5 rounded-2xl flex justify-between shadow-sm border">
                                   {['TODAY', 'WEEK', 'MONTH', 'ALL'].map((p) => (
                                          <button
                                                 key={p}
                                                 onClick={() => setPeriod(p as any)}
                                                 className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${period === p ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                                          >
                                                 {p === 'TODAY' && 'วันนี้'}
                                                 {p === 'WEEK' && '7 วัน'}
                                                 {p === 'MONTH' && 'เดือนนี้'}
                                                 {p === 'ALL' && 'ทั้งหมด'}
                                          </button>
                                   ))}
                            </div>
                     </div>

                     {/* Content */}
                     <div className="flex-1 overflow-y-auto p-4 pb-safe space-y-4">
                            {loading ? (
                                   <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2">
                                          <Loader2 className="animate-spin text-blue-500" size={32} />
                                          <span>กำลังคำนวณตัวเลข...</span>
                                   </div>
                            ) : (
                                   <>
                                          {/* 1. การ์ดสีฟ้า (ยอดขายรวม) */}
                                          <div className="glass-card p-6 rounded-3xl bg-gradient-to-r from-blue-500 to-cyan-500 text-black shadow-lg shadow-blue-200 border-none relative overflow-hidden">
                                                 <div className="absolute top-0 right-0 p-4 opacity-20"><DollarSign size={80} /></div>
                                                 <div className="flex items-center gap-2 opacity-90 mb-1 font-medium text-sm">
                                                        <Calendar size={14} /> ยอดขายรวม ({getPeriodLabel()})
                                                 </div>
                                                 <div className="text-4xl font-extrabold tracking-tight mt-2">
                                                        {data?.totalSales.toLocaleString()} <span className="text-lg font-normal opacity-80">บาท</span>
                                                 </div>
                                          </div>

                                          {/* เช็คว่ามีข้อมูลสินค้าขายดีไหม */}
                                          {data?.topSelling && data.topSelling.length > 0 ? (
                                                 <>
                                                        {/* 2. กราฟแท่ง (Top 10) */}
                                                        <div className="glass-card p-5 rounded-3xl bg-white shadow-sm border animate-in slide-in-from-bottom-4">
                                                               <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2 border-b pb-2">
                                                                      <BarChart3 className="text-blue-500" size={18} /> 10 อันดับสินค้าขายดี
                                                               </h3>
                                                               <div className="h-[300px] w-full">
                                                                      <ResponsiveContainer width="100%" height="100%">
                                                                             <BarChart data={data?.topSelling} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                                                                    <XAxis type="number" hide />
                                                                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} />
                                                                                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                                                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                                                                           {data?.topSelling.map((entry, index) => (
                                                                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                                           ))}
                                                                                    </Bar>
                                                                             </BarChart>
                                                                      </ResponsiveContainer>
                                                               </div>
                                                        </div>

                                                        {/* 3. กราฟวงกลม (Share) */}
                                                        <div className="glass-card p-5 rounded-3xl bg-white shadow-sm border pb-10 animate-in slide-in-from-bottom-8">
                                                               <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2 border-b pb-2">
                                                                      <PieIcon className="text-orange-500" size={18} /> สัดส่วนยอดขาย
                                                               </h3>
                                                               <div className="h-[300px] w-full">
                                                                      <ResponsiveContainer width="100%" height="100%">
                                                                             <PieChart>
                                                                                    <Pie
                                                                                           data={data?.topSelling}
                                                                                           cx="50%"
                                                                                           cy="50%"
                                                                                           innerRadius={60}
                                                                                           outerRadius={80}
                                                                                           paddingAngle={5}
                                                                                           dataKey="value"
                                                                                    >
                                                                                           {data?.topSelling.map((entry, index) => (
                                                                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                                           ))}
                                                                                    </Pie>
                                                                                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                                                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} iconType="circle" />
                                                                             </PieChart>
                                                                      </ResponsiveContainer>
                                                               </div>
                                                        </div>
                                                 </>
                                          ) : (
                                                 // กรณีไม่มีข้อมูลขายเลย
                                                 <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white/50 rounded-3xl border border-dashed">
                                                        <BarChart3 size={48} className="mb-2 opacity-20" />
                                                        <p>ยังไม่มีข้อมูลการขายในช่วงนี้</p>
                                                 </div>
                                          )}
                                   </>
                            )}
                     </div>
              </div>
       );
}