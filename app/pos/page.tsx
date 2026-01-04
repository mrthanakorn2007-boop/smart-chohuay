"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Trash2, X, Loader2, Image as ImageIcon, Camera, User, Phone, FileText, Home, LayoutGrid, Download, CheckCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPOSData, submitOrder } from "../actions";
import { supabase } from "../lib/supabase";
import generatePayload from "promptpay-qr";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas"; // 

export default function POS() {
       const [products, setProducts] = useState<any[]>([]);
       const [categories, setCategories] = useState<any[]>([]);
       const [quickButtons, setQuickButtons] = useState<any[]>([]);
       const [promptpayId, setPromptpayId] = useState("");
       const [loading, setLoading] = useState(true);
       const [selectedCat, setSelectedCat] = useState<number | 'ALL'>('ALL');

       const [cart, setCart] = useState<any[]>([]);
       const [isCartOpen, setIsCartOpen] = useState(false);
       const [processing, setProcessing] = useState(false);
       const [paymentMode, setPaymentMode] = useState<'SELECT' | 'QR' | 'CREDIT'>('SELECT');
       const [slipFile, setSlipFile] = useState<File | null>(null);
       const fileInputRef = useRef<HTMLInputElement>(null);
       const [debtorName, setDebtorName] = useState("");
       const [debtorContact, setDebtorContact] = useState("");

       // --- Receipt State ---
       const [showReceipt, setShowReceipt] = useState(false);
       const [receiptData, setReceiptData] = useState<any>(null);
       const receiptRef = useRef<HTMLDivElement>(null);

       useEffect(() => { loadData(); }, []);

       async function loadData() {
              try {
                     const data = await getPOSData();
                     setProducts(data.products);
                     setCategories(data.categories || []);
                     setQuickButtons(data.quickButtons);
                     setPromptpayId(data.promptpayId);
              } catch (e) { } finally { setLoading(false); }
       }

       const filteredProducts = selectedCat === 'ALL' ? products : products.filter(p => p.category_id === selectedCat);
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

              // ส่งข้อมูลไปบันทึก
              const res = await submitOrder(cart, total, method, slipUrl, debtorInfo);

              if (res.success) {
                     // ✅ เตรียมข้อมูลใบเสร็จ
                     setReceiptData({
                            orderId: res.orderId, // ได้รับจาก actions แล้ว
                            items: [...cart],
                            total: total,
                            paymentMethod: method,
                            date: new Date(),
                            customer: debtorInfo ? debtorInfo.name : 'ลูกค้าทั่วไป'
                     });

                     // ✅ เปิดหน้าต่างใบเสร็จ
                     setShowReceipt(true);

                     // เคลียร์ค่าต่างๆ
                     setCart([]); setIsCartOpen(false); setPaymentMode('SELECT'); setSlipFile(null); setDebtorName(""); setDebtorContact("");
                     loadData();
              } else {
                     alert("Error: " + res.message);
              }
              setProcessing(false);
       };

       // ฟังก์ชันดาวน์โหลดใบเสร็จเป็นรูปภาพ
       const handleDownloadReceipt = async () => {
              if (!receiptRef.current) return;
              try {
                     const canvas = await html2canvas(receiptRef.current, { scale: 2 }); // scale 2 เพื่อความชัด
                     const image = canvas.toDataURL("image/png");
                     const link = document.createElement("a");
                     link.href = image;
                     link.download = `receipt-${receiptData.orderId}.png`;
                     link.click();
              } catch (e) {
                     alert("บันทึกรูปไม่ได้ โปรดลองแคปหน้าจอแทน");
              }
       };

       return (
              <div className="flex flex-col h-dvh grid-background overflow-hidden">

                     {/* Header & Tabs ... (Code เดิม) */}
                     <div className="flex-none p-4 pt-safe flex justify-between items-center z-20">
                            <div className="flex items-center gap-2">
                                   <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200"><ShoppingCart size={20} /></div>
                                   <h1 className="font-extrabold text-gray-800 text-lg">หน้าร้าน</h1>
                            </div>
                            <Link href="/" className="glass-card px-3 py-2 rounded-full text-gray-600 hover:bg-white transition flex items-center gap-1 text-sm font-bold"><Home size={16} /> เมนูหลัก</Link>
                     </div>

                     <div className="flex-none px-4 pb-2 z-10">
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                   <button onClick={() => setSelectedCat('ALL')} className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all border ${selectedCat === 'ALL' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'glass-card text-gray-600 border-transparent hover:bg-white'}`}><div className="flex items-center gap-1"><LayoutGrid size={14} /> ทั้งหมด</div></button>
                                   {categories.map(c => (<button key={c.id} onClick={() => setSelectedCat(c.id)} className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all border ${selectedCat === c.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'glass-card text-gray-600 border-transparent hover:bg-white'}`}>{c.name}</button>))}
                            </div>
                     </div>

                     <div className="flex-none px-4 pb-2 z-10">
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                   {quickButtons.map(qb => (
                                          <button key={qb.id} onClick={() => setCart([...cart, { id: 999, name: `ปุ่มด่วน ${qb.amount}`, price: qb.amount, category: 'Quick' }])}
                                                 className="glass-card flex-shrink-0 w-16 h-12 rounded-xl font-bold text-blue-600 text-lg active:scale-90 transition flex items-center justify-center border border-blue-50">{qb.amount}</button>
                                   ))}
                            </div>
                     </div>

                     <div className="flex-1 overflow-y-auto px-4 pb-4">
                            {loading ? <div className="text-center mt-20"><Loader2 className="animate-spin inline text-blue-500" size={32} /></div> :
                                   <div className="grid grid-cols-3 gap-3 pb-24 animate-in fade-in duration-300">
                                          {filteredProducts.length === 0 ? (<div className="col-span-3 text-center text-gray-400 py-10 bg-white/50 rounded-2xl border border-dashed">ไม่มีสินค้าในหมวดนี้</div>) : (
                                                 filteredProducts.map(p => (
                                                        <button key={p.id} onClick={() => setCart([...cart, { ...p, cartId: Math.random().toString() }])} disabled={p.stock <= 0} className={`glass-card p-2 rounded-2xl flex flex-col items-center relative transition-all active:scale-95 ${p.stock <= 0 ? 'opacity-50 grayscale' : ''}`}>
                                                               <div className="w-full aspect-square relative rounded-xl overflow-hidden mb-2 bg-gray-100">{p.image_url ? <Image src={p.image_url} alt="" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-gray-300" /></div>}</div>
                                                               <span className="text-xs font-bold text-gray-700 line-clamp-1 w-full text-center">{p.name}</span>
                                                               <div className="mt-1 w-full text-center"><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{p.price}.-</span></div>
                                                               <span className={`absolute top-1 right-1 text-[8px] px-1.5 py-0.5 rounded-full text-white font-bold shadow-sm ${p.stock < 5 ? 'bg-red-500' : 'bg-gray-400/80'}`}>{p.stock}</span>
                                                        </button>
                                                 ))
                                          )}
                                   </div>
                            }
                     </div>

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

                     <AnimatePresence>
                            {isCartOpen && (
                                   <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed inset-0 z-50 bg-gray-50/95 backdrop-blur-md flex flex-col h-dvh">
                                          <div className="flex-none p-4 pt-safe flex justify-between items-center">
                                                 <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2"><ShoppingCart className="text-blue-600" /> ตะกร้า</h2>
                                                 <button onClick={() => { setIsCartOpen(false); setPaymentMode('SELECT'); }} className="bg-white p-2 rounded-full shadow-sm"><X size={24} /></button>
                                          </div>

                                          <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                                 {cart.map((item, i) => (
                                                        <div key={item.cartId} className="glass-card bg-white p-3 rounded-2xl flex justify-between items-center">
                                                               <div className="flex items-center gap-3 overflow-hidden"><span className="font-bold text-gray-400 text-sm w-6">{i + 1}.</span><span className="font-bold text-gray-700 truncate">{item.name}</span></div>
                                                               <div className="flex items-center gap-3 flex-shrink-0"><span className="font-bold text-blue-600 text-lg">{item.price}</span> <button onClick={() => setCart(cart.filter(c => c.cartId !== item.cartId))} className="text-red-400 p-2 bg-red-50 rounded-xl"><Trash2 size={18} /></button></div>
                                                        </div>
                                                 ))}
                                          </div>

                                          <div className="flex-none p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                                                 {paymentMode === 'SELECT' && (
                                                        <div className="space-y-3">
                                                               <div className="flex justify-between items-end px-2 mb-4"><span className="text-gray-500 font-medium">ยอดสุทธิ</span><span className="text-5xl font-extrabold text-blue-600">{total}.-</span></div>
                                                               <div className="grid grid-cols-2 gap-3">
                                                                      <button onClick={() => handleCheckout('CASH')} disabled={processing} className="py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition flex justify-center gap-2 text-lg">💵 เงินสด</button>
                                                                      <button onClick={() => setPaymentMode('QR')} disabled={processing} className="py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition flex justify-center gap-2 text-lg">📱 QR Code</button>
                                                               </div>
                                                               <button onClick={() => setPaymentMode('CREDIT')} className="w-full py-3 bg-orange-100 text-orange-700 rounded-2xl font-bold flex justify-center gap-2 border-2 border-orange-200">เซ็นไว้ก่อน(ติดหนี้)</button>
                                                        </div>
                                                 )}

                                                 {paymentMode === 'QR' && (
                                                        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
                                                               <div className="bg-white p-4 border rounded-3xl mb-4 shadow-sm text-center">
                                                                      <QRCodeSVG value={ppPayload} size={250} className="mx-auto" />
                                                                      <p className="mt-4 text-gray-500 font-medium">ยอดชำระเงิน</p>
                                                                      <p className="text-4xl font-extrabold text-blue-600">{total} บาท</p>
                                                               </div>
                                                               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => setSlipFile(e.target.files?.[0] || null)} />
                                                               <button onClick={() => fileInputRef.current?.click()} className={`w-full py-3 mb-3 border-2 border-dashed rounded-2xl font-bold flex justify-center items-center gap-2 ${slipFile ? 'bg-green-50 text-green-700 border-green-500' : 'text-gray-400'}`}><Camera size={20} /> {slipFile ? "แนบสลิปแล้ว" : "ถ่ายสลิป"}</button>
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
                                                               <button onClick={() => fileInputRef.current?.click()} className={`w-full py-3 border-2 border-dashed rounded-2xl font-bold flex justify-center items-center gap-2 mt-2 ${slipFile ? 'bg-green-50 text-green-700 border-green-500' : 'text-gray-400'}`}><Camera size={20} /> {slipFile ? "ถ่ายรูปแล้ว" : "ถ่ายรูปคนซื้อ"}</button>
                                                               <button onClick={() => handleCheckout('CREDIT')} disabled={processing} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg text-lg mt-2">{processing ? "..." : "ยืนยันการติดหนี้"}</button>
                                                               <button onClick={() => setPaymentMode('SELECT')} className="w-full text-center text-gray-400 mt-2">ย้อนกลับ</button>
                                                        </div>
                                                 )}
                                          </div>
                                   </motion.div>
                            )}
                     </AnimatePresence>

                     {/* --- 🧾 RECEIPT MODAL --- */}
                     <AnimatePresence>
                            {showReceipt && receiptData && (
                                   <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                                          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90dvh]">
                                                 <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                                        <h3 className="font-bold text-gray-700 flex items-center gap-2"><CheckCircle className="text-green-500" /> ทำรายการสำเร็จ</h3>
                                                        <button onClick={() => setShowReceipt(false)} className="bg-gray-200 p-1 rounded-full"><X size={20} /></button>
                                                 </div>

                                                 {/* ส่วนที่จะถูกแคปรูป */}
                                                 <div className="p-6 bg-white overflow-y-auto" ref={receiptRef}>
                                                        <div className="text-center mb-4">
                                                               <div className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2"><ShoppingCart size={24} /></div>
                                                               <h2 className="text-xl font-extrabold text-gray-800">ร้านแม่</h2>
                                                               <p className="text-xs text-gray-400 mt-1">ใบเสร็จรับเงิน (Receipt)</p>
                                                               <p className="text-xs text-gray-400">#{receiptData.orderId} • {new Date(receiptData.date).toLocaleString('th-TH')}</p>
                                                        </div>

                                                        <div className="border-t border-dashed my-4"></div>

                                                        <div className="space-y-2 mb-4">
                                                               {receiptData.items.map((item: any, i: number) => (
                                                                      <div key={i} className="flex justify-between text-sm">
                                                                             <span className="text-gray-700 truncate w-2/3">{item.name} <span className="text-gray-400">x{1}</span></span>
                                                                             <span className="font-bold text-gray-800">{item.price}</span>
                                                                      </div>
                                                               ))}
                                                        </div>

                                                        <div className="border-t border-dashed my-4"></div>

                                                        <div className="flex justify-between items-end mb-2">
                                                               <span className="text-gray-500 font-bold">ยอดรวมสุทธิ</span>
                                                               <span className="text-3xl font-extrabold text-blue-600">{receiptData.total}.-</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs text-gray-400">
                                                               <span>การชำระเงิน</span>
                                                               <span>{receiptData.paymentMethod}</span>
                                                        </div>
                                                        {receiptData.customer && receiptData.customer !== 'ลูกค้าทั่วไป' && (
                                                               <div className="flex justify-between text-xs text-gray-400 mt-1">
                                                                      <span>ลูกค้า</span>
                                                                      <span>{receiptData.customer}</span>
                                                               </div>
                                                        )}

                                                        <div className="mt-6 flex flex-col items-center gap-2">
                                                               {/* QR Code สำหรับติดต่อ หรือจ่ายเงินครั้งหน้า */}
                                                               <div className="p-2 bg-white border rounded-lg">
                                                                      <QRCodeSVG value={ppPayload} size={80} />
                                                               </div>
                                                               <p className="text-[10px] text-gray-400">ขอบคุณที่อุดหนุนครับ</p>
                                                        </div>
                                                 </div>

                                                 <div className="p-4 bg-gray-50 border-t flex gap-2">
                                                        <button onClick={handleDownloadReceipt} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition">
                                                               <Download size={18} /> บันทึกรูป
                                                        </button>
                                                        <button onClick={() => setShowReceipt(false)} className="px-4 py-3 bg-white border rounded-xl font-bold text-gray-600 active:scale-95 transition">
                                                               ปิด
                                                        </button>
                                                 </div>
                                          </div>
                                   </motion.div>
                            )}
                     </AnimatePresence>
              </div>
       );
}