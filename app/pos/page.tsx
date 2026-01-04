"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Trash2, X, Loader2, Image as ImageIcon, Camera, User, Phone, FileText, Home, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPOSData, submitOrder } from "../actions"; // path อาจต้องแก้เป็น ../../actions ถ้าอยู่ลึก แต่ถ้าย้ายไฟล์มา app/pos ใช้ ../actions ถูกแล้ว
import { supabase } from "../lib/supabase";
import generatePayload from "promptpay-qr";
import { QRCodeSVG } from "qrcode.react";

export default function POS() {
       // Data
       const [products, setProducts] = useState<any[]>([]);
       const [quickButtons, setQuickButtons] = useState<any[]>([]);
       const [promptpayId, setPromptpayId] = useState("");
       const [loading, setLoading] = useState(true);

       // Cart & State
       const [cart, setCart] = useState<any[]>([]);
       const [isCartOpen, setIsCartOpen] = useState(false);
       const [processing, setProcessing] = useState(false);
       const [paymentMode, setPaymentMode] = useState<'SELECT' | 'QR' | 'CREDIT'>('SELECT');
       const [slipFile, setSlipFile] = useState<File | null>(null);
       const fileInputRef = useRef<HTMLInputElement>(null);

       // Debtor
       const [debtorName, setDebtorName] = useState("");
       const [debtorContact, setDebtorContact] = useState("");

       useEffect(() => { loadData(); }, []);

       async function loadData() {
              try {
                     const data = await getPOSData();
                     setProducts(data.products);
                     setQuickButtons(data.quickButtons);
                     setPromptpayId(data.promptpayId);
              } catch (e) { } finally { setLoading(false); }
       }

       const total = cart.reduce((sum, item) => sum + item.price, 0);
       const ppPayload = generatePayload(promptpayId || "000", { amount: total > 0 ? total : 0 });

       const handleCheckout = async (method: 'CASH' | 'QR' | 'CREDIT') => {
              if (cart.length === 0) return;
              if (method === 'CREDIT' && !debtorName.trim()) { alert("ใส่ชื่อลูกหนี้ด้วยครับ"); return; }

              setProcessing(true);
              let slipUrl = "";
              if (slipFile) {
                     const fileName = `slip-${Date.now()}.jpg`;
                     const { data } = await supabase.storage.from('slips').upload(fileName, slipFile);
                     if (data) { const { data: pUrl } = supabase.storage.from('slips').getPublicUrl(fileName); slipUrl = pUrl.publicUrl; }
              }
              const debtorInfo = method === 'CREDIT' ? { name: debtorName, contact: debtorContact } : null;
              const res = await submitOrder(cart, total, method, slipUrl, debtorInfo);

              if (res.success) {
                     setCart([]); setIsCartOpen(false); setPaymentMode('SELECT'); setSlipFile(null); setDebtorName(""); setDebtorContact("");
                     loadData();
                     alert(method === 'CREDIT' ? "บันทึกหนี้แล้ว" : "ขายเรียบร้อย");
              } else { alert("Error: " + res.message); }
              setProcessing(false);
       };

       return (
              <div className="flex flex-col h-dvh grid-background overflow-hidden">

                     {/* Header */}
                     <div className="flex-none p-4 pt-safe flex justify-between items-center z-20">
                            <div className="flex items-center gap-2">
                                   <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                                          <ShoppingCart size={20} />
                                   </div>
                                   <h1 className="font-extrabold text-gray-800 text-lg">หน้าร้าน</h1>
                            </div>
                            <Link href="/" className="glass-card px-3 py-2 rounded-full text-gray-600 hover:bg-white transition flex items-center gap-1 text-sm font-bold">
                                   <Home size={16} /> เมนูหลัก
                            </Link>
                     </div>

                     {/* Quick Buttons */}
                     <div className="flex-none px-4 pb-2 z-10">
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                   {quickButtons.map(qb => (
                                          <button key={qb.id} onClick={() => setCart([...cart, { id: 999, name: `ปุ่มด่วน ${qb.amount}`, price: qb.amount, category: 'Quick' }])}
                                                 className="glass-card flex-shrink-0 w-16 h-14 rounded-2xl font-bold text-blue-600 text-xl active:scale-90 transition flex items-center justify-center">
                                                 {qb.amount}
                                          </button>
                                   ))}
                            </div>
                     </div>

                     {/* Products Grid */}
                     <div className="flex-1 overflow-y-auto px-4 pb-4">
                            {loading ? <div className="text-center mt-20"><Loader2 className="animate-spin inline text-blue-500" size={32} /></div> :
                                   <div className="grid grid-cols-3 gap-3 pb-24">
                                          {products.map(p => (
                                                 <button key={p.id} onClick={() => setCart([...cart, { ...p, cartId: Math.random().toString() }])} disabled={p.stock <= 0}
                                                        className={`glass-card p-2 rounded-2xl flex flex-col items-center relative transition-all active:scale-95 ${p.stock <= 0 ? 'opacity-50 grayscale' : ''}`}>
                                                        <div className="w-full aspect-square relative rounded-xl overflow-hidden mb-2 bg-gray-100">
                                                               {p.image_url ? <Image src={p.image_url} alt="" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-gray-300" /></div>}
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-700 line-clamp-1 w-full text-center">{p.name}</span>
                                                        <div className="mt-1 w-full text-center"><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{p.price}.-</span></div>
                                                        <span className={`absolute top-1 right-1 text-[8px] px-1.5 py-0.5 rounded-full text-white font-bold shadow-sm ${p.stock < 5 ? 'bg-red-500' : 'bg-gray-400/80'}`}>{p.stock}</span>
                                                 </button>
                                          ))}
                                   </div>
                            }
                     </div>

                     {/* Cart Bar (Compact) */}
                     <AnimatePresence>
                            {cart.length > 0 && !isCartOpen && (
                                   <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="absolute bottom-0 w-full px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-40">
                                          <div onClick={() => setIsCartOpen(true)} className="glass-card bg-white/95 p-4 flex justify-between items-center cursor-pointer rounded-3xl shadow-xl border-t border-white/50">
                                                 <div className="flex items-center gap-3"><div className="bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg shadow-red-200">{cart.length}</div><span className="text-gray-500 font-bold">รวมเงิน</span></div>
                                                 <span className="text-3xl font-extrabold text-blue-600">{total}.-</span>
                                          </div>
                                   </motion.div>
                            )}
                     </AnimatePresence>

                     {/* Cart Modal (Full) */}
                     <AnimatePresence>
                            {isCartOpen && (
                                   <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                          className="fixed inset-0 z-50 bg-gray-50/95 backdrop-blur-md flex flex-col h-dvh"
                                   >
                                          {/* Header Modal */}
                                          <div className="flex-none p-4 pt-safe flex justify-between items-center">
                                                 <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2"><ShoppingCart className="text-blue-600" /> ตะกร้า</h2>
                                                 <button onClick={() => { setIsCartOpen(false); setPaymentMode('SELECT'); }} className="bg-white p-2 rounded-full shadow-sm"><X size={24} /></button>
                                          </div>

                                          {/* Cart Items */}
                                          <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                                 {cart.map((item, i) => (
                                                        <div key={item.cartId} className="glass-card bg-white p-3 rounded-2xl flex justify-between items-center">
                                                               <div className="flex items-center gap-3 overflow-hidden"><span className="font-bold text-gray-400 text-sm w-6">{i + 1}.</span><span className="font-bold text-gray-700 truncate">{item.name}</span></div>
                                                               <div className="flex items-center gap-3 flex-shrink-0"><span className="font-bold text-blue-600 text-lg">{item.price}</span> <button onClick={() => setCart(cart.filter(c => c.cartId !== item.cartId))} className="text-red-400 p-2 bg-red-50 rounded-xl"><Trash2 size={18} /></button></div>
                                                        </div>
                                                 ))}
                                          </div>

                                          {/* Footer Payment */}
                                          <div className="flex-none p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                                                 {paymentMode === 'SELECT' && (
                                                        <div className="space-y-3">
                                                               <div className="flex justify-between items-end px-2 mb-4"><span className="text-gray-500 font-medium">ยอดสุทธิ</span><span className="text-5xl font-extrabold text-blue-600">{total}.-</span></div>
                                                               <div className="grid grid-cols-2 gap-3">
                                                                      <button onClick={() => handleCheckout('CASH')} disabled={processing} className="py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition flex justify-center gap-2 text-lg">💵 เงินสด</button>
                                                                      <button onClick={() => setPaymentMode('QR')} disabled={processing} className="py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition flex justify-center gap-2 text-lg">📱 QR Code</button>
                                                               </div>
                                                               <button onClick={() => setPaymentMode('CREDIT')} className="w-full py-3 bg-orange-100 text-orange-700 rounded-2xl font-bold flex justify-center gap-2 border-2 border-orange-200">📝 แปะโป้ง (ติดหนี้)</button>
                                                        </div>
                                                 )}

                                                 {paymentMode === 'QR' && (
                                                        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
                                                               {/* QR Code ใหญ่ขึ้น + คำอธิบาย */}
                                                               <div className="bg-white p-4 border rounded-3xl mb-4 shadow-sm text-center">
                                                                      <QRCodeSVG value={ppPayload} size={250} className="mx-auto" />
                                                                      <p className="mt-4 text-gray-500 font-medium">ยอดชำระเงิน</p>
                                                                      <p className="text-4xl font-extrabold text-blue-600">{total} บาท</p>
                                                               </div>

                                                               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => setSlipFile(e.target.files?.[0] || null)} />
                                                               <button onClick={() => fileInputRef.current?.click()} className={`w-full py-3 mb-3 border-2 border-dashed rounded-2xl font-bold flex justify-center items-center gap-2 ${slipFile ? 'bg-green-50 text-green-700 border-green-500' : 'text-gray-400'}`}>
                                                                      <Camera size={20} /> {slipFile ? "แนบสลิปแล้ว" : "ถ่ายสลิป"}
                                                               </button>
                                                               <button onClick={() => handleCheckout('QR')} disabled={processing} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg text-lg">{processing ? "กำลังบันทึก..." : "ยืนยันรับเงิน"}</button>
                                                               <button onClick={() => setPaymentMode('SELECT')} className="mt-4 text-gray-400 font-bold flex items-center gap-2"><ArrowLeft size={16} /> เปลี่ยนวิธีจ่าย</button>
                                                        </div>
                                                 )}

                                                 {paymentMode === 'CREDIT' && (
                                                        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-3">
                                                               <h3 className="font-bold text-orange-600 flex items-center gap-2 text-lg mb-2"><FileText /> ลงบัญชีติดหนี้</h3>
                                                               <div className="space-y-3">
                                                                      <div className="flex items-center gap-3 border-2 p-3 rounded-2xl bg-gray-50 focus-within:border-orange-500 focus-within:bg-white transition"><User className="text-gray-400" /><input placeholder="ชื่อลูกหนี้ (ต้องใส่)" value={debtorName} onChange={e => setDebtorName(e.target.value)} className="bg-transparent w-full outline-none font-bold text-gray-700 text-lg" /></div>
                                                                      <div className="flex items-center gap-3 border-2 p-3 rounded-2xl bg-gray-50 focus-within:border-orange-500 focus-within:bg-white transition"><Phone className="text-gray-400" /><input placeholder="เบอร์โทร / หมายเหตุ" value={debtorContact} onChange={e => setDebtorContact(e.target.value)} className="bg-transparent w-full outline-none text-lg" /></div>
                                                               </div>
                                                               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => setSlipFile(e.target.files?.[0] || null)} />
                                                               <button onClick={() => fileInputRef.current?.click()} className={`w-full py-3 border-2 border-dashed rounded-2xl font-bold flex justify-center items-center gap-2 mt-2 ${slipFile ? 'bg-green-50 text-green-700 border-green-500' : 'text-gray-400'}`}>
                                                                      <Camera size={20} /> {slipFile ? "ถ่ายรูปแล้ว" : "ถ่ายรูปคนซื้อ"}
                                                               </button>
                                                               <button onClick={() => handleCheckout('CREDIT')} disabled={processing} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg text-lg mt-2">{processing ? "..." : "ยืนยันการติดหนี้"}</button>
                                                               <button onClick={() => setPaymentMode('SELECT')} className="w-full text-center text-gray-400 mt-2">ย้อนกลับ</button>
                                                        </div>
                                                 )}
                                          </div>
                                   </motion.div>
                            )}
                     </AnimatePresence>
              </div>
       );
}