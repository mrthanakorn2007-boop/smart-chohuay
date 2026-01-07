"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, DollarSign, PieChart as PieIcon, BarChart3, Calendar, Loader2, TrendingDown, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { getSalesStats } from "../actions";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export default function StatsPage() {
       const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL' | 'CUSTOM'>('TODAY');
       const [customDays, setCustomDays] = useState<number>(7);
       const [data, setData] = useState<{ topSelling: any[], totalSales: number, totalCost: number, totalProfit: number, profitMargin: number } | null>(null);
       const [loading, setLoading] = useState(true);

       useEffect(() => { loadStats(); }, [period, customDays]);

       async function loadStats() {
              setLoading(true);
              try {
                     const res = await getSalesStats(period, period === 'CUSTOM' ? customDays : undefined);
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
                     case 'CUSTOM': return `${customDays} วันล่าสุด`;
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
                            <div className="bg-white p-1.5 rounded-2xl flex justify-between shadow-sm border mb-3">
                                   {['TODAY', 'WEEK', 'MONTH', 'ALL', 'CUSTOM'].map((p) => (
                                          <button
                                                 key={p}
                                                 onClick={() => setPeriod(p as any)}
                                                 className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${period === p ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                                          >
                                                 {p === 'TODAY' && 'วันนี้'}
                                                 {p === 'WEEK' && '7 วัน'}
                                                 {p === 'MONTH' && 'เดือนนี้'}
                                                 {p === 'ALL' && 'ทั้งหมด'}
                                                 {p === 'CUSTOM' && 'กำหนดเอง'}
                                          </button>
                                   ))}
                            </div>

                            {/* Custom Days Selector */}
                            {period === 'CUSTOM' && (
                                   <div className="bg-white p-3 rounded-2xl shadow-sm border">
                                          <label className="text-xs text-gray-500 mb-2 block">ดูย้อนหลัง (วัน)</label>
                                          <input
                                                 type="number"
                                                 min="1"
                                                 max="30"
                                                 value={customDays}
                                                 onChange={(e) => setCustomDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                                                 className="w-full p-2 border rounded-xl text-center font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
                                          />
                                          <p className="text-xs text-gray-400 mt-1 text-center">สูงสุด 30 วัน</p>
                                   </div>
                            )}
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
                                          {/* Financial Cards Grid */}
                                          <div className="grid grid-cols-2 gap-3">
                                                 {/* 1. Total Sales */}
                                                 <div className="glass-card p-4 rounded-2xl bg-white shadow-lg border border-blue-100">
                                                        <div className="flex items-center gap-1 mb-1 text-xs text-blue-600">
                                                               <DollarSign size={12} /> ยอดขาย
                                                        </div>
                                                        <div className="text-2xl font-extrabold text-blue-600">{data?.totalSales.toLocaleString()}.-</div>
                                                 </div>

                                                 {/* 2. Total Cost */}
                                                 <div className="glass-card p-4 rounded-2xl bg-white shadow-lg border border-orange-100">
                                                        <div className="flex items-center gap-1 mb-1 text-xs text-orange-600">
                                                               <TrendingDown size={12} /> ทุน
                                                        </div>
                                                        <div className="text-2xl font-extrabold text-orange-600">{data?.totalCost.toLocaleString()}.-</div>
                                                 </div>

                                                 {/* 3. Total Profit */}
                                                 <div className="glass-card p-4 rounded-2xl bg-white shadow-lg border border-green-100">
                                                        <div className="flex items-center gap-1 mb-1 text-xs text-green-600">
                                                               <TrendingUp size={12} /> กำไร
                                                        </div>
                                                        <div className="text-2xl font-extrabold text-green-600">{data?.totalProfit.toLocaleString()}.-</div>
                                                 </div>

                                                 {/* 4. Profit Margin */}
                                                 <div className="glass-card p-4 rounded-2xl bg-white shadow-lg border border-purple-100">
                                                        <div className="flex items-center gap-1 mb-1 text-xs text-purple-600">
                                                               <Percent size={12} /> อัตรากำไร
                                                        </div>
                                                        <div className="text-2xl font-extrabold text-purple-600">{data?.profitMargin.toFixed(1)}%</div>
                                                 </div>
                                          </div>

                                          {/* Summary Card */}
                                          <div className="glass-card p-5 rounded-3xl bg-gradient-to-r from-blue-50 to-cyan-50 shadow-sm border">
                                                 <div className="flex items-center gap-2 mb-3">
                                                        <Calendar size={16} className="text-blue-600" />
                                                        <h3 className="font-bold text-gray-700">สรุป ({getPeriodLabel()})</h3>
                                                 </div>
                                                 <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                               <span className="text-gray-600">💰 ยอดขายรวม:</span>
                                                               <span className="font-bold text-blue-600">{data?.totalSales.toLocaleString()} บาท</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                               <span className="text-gray-600">📦 ทุนการขาย:</span>
                                                               <span className="font-bold text-orange-600">{data?.totalCost.toLocaleString()} บาท</span>
                                                        </div>
                                                        <div className="flex justify-between border-t pt-2">
                                                               <span className="text-gray-700 font-bold">✨ กำไรสุทธิ:</span>
                                                               <span className="font-extrabold text-green-600 text-lg">{data?.totalProfit.toLocaleString()} บาท</span>
                                                        </div>
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
