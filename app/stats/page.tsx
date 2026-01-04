"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { getSalesStats } from "../actions";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function StatsPage() {
       const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');
       const [data, setData] = useState<{ topSelling: any[], totalSales: number } | null>(null);
       const [loading, setLoading] = useState(true);

       useEffect(() => {
              loadStats();
       }, [period]);

       async function loadStats() {
              setLoading(true);
              const res = await getSalesStats(period);
              setData(res);
              setLoading(false);
       }

       return (
              <div className="flex flex-col h-dvh grid-background overflow-hidden">
                     {/* Header */}
                     <div className="flex-none p-4 pt-safe flex items-center justify-between z-10">
                            <Link href="/" className="glass-card px-3 py-2 rounded-full text-gray-600 font-bold flex items-center gap-1 hover:bg-white transition">
                                   <ArrowLeft size={18} /> กลับ
                            </Link>
                            <h1 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                   <TrendingUp className="text-blue-600" /> สถิติการขาย
                            </h1>
                     </div>

                     {/* Filter Tabs */}
                     <div className="flex-none px-4 pb-2">
                            <div className="glass-card p-1 rounded-2xl flex justify-between">
                                   {['TODAY', 'WEEK', 'MONTH', 'ALL'].map((p) => (
                                          <button
                                                 key={p}
                                                 onClick={() => setPeriod(p as any)}
                                                 className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${period === p ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
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
                                   <div className="text-center py-20 text-gray-400">กำลังประมวลผล...</div>
                            ) : (
                                   <>
                                          {/* Total Sales Card */}
                                          <div className="glass-card p-6 rounded-3xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200 border-none">
                                                 <div className="flex items-center gap-2 opacity-90 mb-1">
                                                        <DollarSign size={18} /> ยอดขายรวม ({period === 'TODAY' ? 'วันนี้' : period})
                                                 </div>
                                                 <div className="text-4xl font-extrabold tracking-tight">
                                                        {data?.totalSales.toLocaleString()}.-
                                                 </div>
                                          </div>

                                          {/* Top Selling Chart */}
                                          <div className="glass-card p-5 rounded-3xl bg-white/90">
                                                 <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">🏆 10 อันดับสินค้าขายดี</h3>
                                                 <div className="h-64">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                               <BarChart data={data?.topSelling} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                                      <XAxis type="number" hide />
                                                                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                                                                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                                                             {data?.topSelling.map((entry, index) => (
                                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                             ))}
                                                                      </Bar>
                                                               </BarChart>
                                                        </ResponsiveContainer>
                                                 </div>
                                          </div>

                                          {/* Pie Chart (Share) */}
                                          <div className="glass-card p-5 rounded-3xl bg-white/90 pb-10">
                                                 <h3 className="font-bold text-gray-700 mb-2">🍰 สัดส่วนยอดขาย</h3>
                                                 <div className="h-64">
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
                                                                      <Tooltip />
                                                                      <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                                                               </PieChart>
                                                        </ResponsiveContainer>
                                                 </div>
                                          </div>
                                   </>
                            )}
                     </div>
              </div>
       );
}