"use client";

import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Plus, X, Image as ImageIcon, Lock, LogIn, Archive, Settings, LayoutGrid, Package, BookUser, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { updateSetting, addQuickButton, removeQuickButton, getDebtors, repayDebt } from "../actions";

const ADMIN_PIN = "1234";

export default function AdminPage() {
       const [isAuthenticated, setIsAuthenticated] = useState(false);
       const [pinInput, setPinInput] = useState("");
       const [activeTab, setActiveTab] = useState("stock");

       // Data
       const [products, setProducts] = useState<any[]>([]);
       const [quickButtons, setQuickButtons] = useState<any[]>([]);
       const [promptpayId, setPromptpayId] = useState("");
       const [debtors, setDebtors] = useState<any[]>([]); // รายชื่อลูกหนี้
       const [loading, setLoading] = useState(false);

       // Forms
       const [isEditing, setIsEditing] = useState(false);
       const [formData, setFormData] = useState<any>({ name: "", price: "", category: "ทั่วไป", cost: "", stock: "" });
       const [imageFile, setImageFile] = useState<File | null>(null);
       const [newQuickPrice, setNewQuickPrice] = useState("");
       const fileInputRef = useRef<HTMLInputElement>(null);

       const handleLogin = () => {
              if (pinInput === ADMIN_PIN) {
                     setIsAuthenticated(true);
                     fetchData();
              } else { alert("รหัสผิด"); setPinInput(""); }
       };

       const fetchData = async () => {
              setLoading(true);
              const { data: p } = await supabase.from('products').select('*').eq('is_active', true).order('id', { ascending: false });
              if (p) setProducts(p);
              const { data: q } = await supabase.from('quick_buttons').select('*').order('amount');
              if (q) setQuickButtons(q);
              const { data: s } = await supabase.from('settings').select('*').eq('key', 'promptpay_id').single();
              if (s) setPromptpayId(s.value);

              // ดึงลูกหนี้
              const debtorsData = await getDebtors();
              setDebtors(debtorsData);

              setLoading(false);
       };

       // Actions
       const handleSaveProduct = async () => {
              if (!formData.name || !formData.price) return alert("กรอกข้อมูลให้ครบ");
              setLoading(true);
              let imageUrl = formData.image_url;
              if (imageFile) {
                     const fileName = `${Date.now()}-${imageFile.name}`;
                     const { data } = await supabase.storage.from('products').upload(fileName, imageFile);
                     if (data) { const { data: pUrl } = supabase.storage.from('products').getPublicUrl(fileName); imageUrl = pUrl.publicUrl; }
              }
              await supabase.from('products').insert({ name: formData.name, price: Number(formData.price), cost: Number(formData.cost) || 0, stock: Number(formData.stock) || 0, category: formData.category, image_url: imageUrl, is_active: true });
              setIsEditing(false); setFormData({ name: "", price: "", category: "ทั่วไป", cost: "", stock: "" }); setImageFile(null); fetchData();
       };

       const handleArchive = async (id: number) => { if (confirm("ปิดการใช้งาน?")) { await supabase.from('products').update({ is_active: false }).eq('id', id); fetchData(); } };
       const handleSavePromptPay = async () => { await updateSetting('promptpay_id', promptpayId); alert("บันทึกแล้ว"); };
       const handleAddQuickButton = async () => { if (newQuickPrice) { await addQuickButton(Number(newQuickPrice)); setNewQuickPrice(""); fetchData(); } };
       const handleRemoveQuickButton = async (id: number) => { if (confirm("ลบปุ่ม?")) { await removeQuickButton(id); fetchData(); } };

       // ชำระหนี้
       const handleRepay = async (orderId: number, method: 'CASH' | 'QR') => {
              if (!confirm(`ยืนยันรับชำระหนี้ด้วย ${method}?`)) return;
              const res = await repayDebt(orderId, method);
              if (res.success) {
                     alert("✅ รับชำระเรียบร้อย ย้ายเข้ายอดวันนี้แล้ว");
                     fetchData(); // รีโหลดรายชื่อ
              }
       };

       if (!isAuthenticated) return (
              <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
                     <Lock size={48} className="mb-4 text-blue-400" /><h1 className="text-xl font-bold mb-4">Admin Access</h1>
                     <div className="flex gap-2"><input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} className="text-black text-center text-2xl w-32 p-2 rounded-lg font-bold" maxLength={4} placeholder="••••" /><button onClick={handleLogin} className="bg-blue-600 p-3 rounded-lg"><LogIn /></button></div>
                     <Link href="/" className="mt-8 text-gray-500 text-sm">กลับหน้าร้าน</Link>
              </div>
       );

       return (
              <div className="min-h-screen bg-gray-100 pb-20">
                     <div className="bg-white p-4 shadow-sm mb-4 sticky top-0 z-10">
                            <div className="flex justify-between items-center max-w-2xl mx-auto mb-4"><h1 className="text-xl font-bold text-gray-800">จัดการระบบ</h1><Link href="/" className="text-sm bg-gray-100 px-3 py-1 rounded-lg">ออก</Link></div>
                            <div className="flex p-1 bg-gray-100 rounded-xl max-w-2xl mx-auto overflow-x-auto">
                                   {['stock', 'debt', 'quick', 'settings'].map(tab => (
                                          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs sm:text-sm flex justify-center items-center gap-1 whitespace-nowrap ${activeTab === tab ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>
                                                 {tab === 'stock' && <><Package size={16} /> สต็อก</>}
                                                 {tab === 'debt' && <><BookUser size={16} /> สมุดหนี้ ({debtors.length})</>}
                                                 {tab === 'quick' && <><LayoutGrid size={16} /> ปุ่มด่วน</>}
                                                 {tab === 'settings' && <><Settings size={16} /> ตั้งค่า</>}
                                          </button>
                                   ))}
                            </div>
                     </div>

                     <div className="max-w-2xl mx-auto p-4">
                            {activeTab === 'stock' && (
                                   <>
                                          <button onClick={() => setIsEditing(true)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-sm mb-4 flex justify-center items-center gap-2"><Plus /> เพิ่มสินค้า</button>
                                          <div className="grid gap-3">
                                                 {products.map(p => (
                                                        <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm flex items-center gap-3 border border-gray-100">
                                                               <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden relative border">{p.image_url ? <Image src={p.image_url} alt="" fill className="object-cover" /> : <ImageIcon className="m-auto text-gray-300" />}</div>
                                                               <div className="flex-1 min-w-0"><div className="font-bold truncate">{p.name}</div><div className="text-xs text-gray-500">คงเหลือ <span className={p.stock < 5 ? 'text-red-500 font-bold' : 'text-green-600'}>{p.stock}</span></div></div>
                                                               <div className="text-right"><div className="text-blue-600 font-bold">{p.price}.-</div><button onClick={() => handleArchive(p.id)} className="text-xs text-gray-300 hover:text-red-500 mt-1 flex items-center gap-1 justify-end"><Archive size={12} /> ปิด</button></div>
                                                        </div>
                                                 ))}
                                          </div>
                                   </>
                            )}

                            {/* --- TAB: สมุดหนี้ --- */}
                            {activeTab === 'debt' && (
                                   <div className="space-y-4">
                                          {debtors.length === 0 ? <div className="text-center text-gray-400 py-10">ไม่มีคนติดหนี้</div> : debtors.map(order => (
                                                 <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                                                        <div className="flex justify-between items-start mb-3">
                                                               <div>
                                                                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><BookUser size={18} className="text-orange-500" /> {order.customer_name}</h3>
                                                                      <p className="text-sm text-gray-500">{order.customer_contact || "ไม่มีเบอร์โทร"}</p>
                                                                      <p className="text-xs text-gray-400 mt-1">วันที่: {new Date(order.created_at).toLocaleDateString('th-TH')}</p>
                                                               </div>
                                                               <div className="text-right">
                                                                      <span className="block text-2xl font-extrabold text-orange-600">{order.total_amount}.-</span>
                                                                      {order.slip_url && <a href={order.slip_url} target="_blank" className="text-xs text-blue-500 flex items-center justify-end gap-1 mt-1 hover:underline"><ExternalLink size={10} /> ดูรูปคนติด</a>}
                                                               </div>
                                                        </div>
                                                        <div className="bg-gray-50 p-2 rounded-lg text-sm text-gray-600 mb-3 max-h-20 overflow-y-auto">
                                                               {order.order_items.map((i: any) => <span key={i.id} className="block">• {i.product_name} ({i.quantity})</span>)}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                               <button onClick={() => handleRepay(order.id, 'CASH')} className="py-2 bg-green-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-green-700">รับเงินสด 💵</button>
                                                               <button onClick={() => handleRepay(order.id, 'QR')} className="py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700">รับโอน/QR 📱</button>
                                                        </div>
                                                 </div>
                                          ))}
                                   </div>
                            )}

                            {activeTab === 'quick' && (
                                   <div className="bg-white p-6 rounded-2xl shadow-sm">
                                          <h3 className="font-bold mb-4">ปุ่มราคาด่วน</h3>
                                          <div className="flex gap-2 mb-6"><input type="number" placeholder="ราคา" value={newQuickPrice} onChange={e => setNewQuickPrice(e.target.value)} className="flex-1 p-3 border rounded-xl" /><button onClick={handleAddQuickButton} className="bg-green-600 text-white px-4 rounded-xl font-bold">เพิ่ม</button></div>
                                          <div className="grid grid-cols-4 gap-3">{quickButtons.map(qb => (<div key={qb.id} className="relative bg-blue-50 h-20 rounded-xl flex items-center justify-center border border-blue-100"><span className="text-xl font-bold text-blue-600">{qb.amount}</span><button onClick={() => handleRemoveQuickButton(qb.id)} className="absolute top-1 right-1 text-red-400 bg-white rounded-full p-1 shadow-sm"><X size={12} /></button></div>))}</div>
                                   </div>
                            )}

                            {activeTab === 'settings' && (
                                   <div className="bg-white p-6 rounded-2xl shadow-sm">
                                          <h3 className="font-bold mb-4">ตั้งค่ารับเงิน</h3>
                                          <label className="block text-sm text-gray-500 mb-2">PromptPay</label>
                                          <div className="flex gap-2"><input value={promptpayId} onChange={e => setPromptpayId(e.target.value)} className="flex-1 p-3 border rounded-xl font-mono text-lg" /><button onClick={handleSavePromptPay} className="bg-blue-600 text-white px-4 rounded-xl font-bold">บันทึก</button></div>
                                   </div>
                            )}
                     </div>

                     {isEditing && (
                            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                                   {/* Modal Add Product (ย่อ) */}
                                   <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                                          <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">เพิ่มสินค้า</h3><button onClick={() => setIsEditing(false)}><X /></button></div>
                                          <div className="space-y-3">
                                                 <div onClick={() => fileInputRef.current?.click()} className="h-32 bg-gray-50 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer relative overflow-hidden">{imageFile ? <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover" /> : <span className="text-gray-400 text-sm">เลือกรูป</span>}<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} /></div>
                                                 <input placeholder="ชื่อสินค้า" className="w-full p-2 border rounded-lg" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                                 <div className="grid grid-cols-3 gap-2"><input type="number" placeholder="ราคา" className="p-2 border rounded-lg" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} /><input type="number" placeholder="ทุน" className="p-2 border rounded-lg" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} /><input type="number" placeholder="สต็อก" className="p-2 border rounded-lg" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} /></div>
                                                 <button onClick={handleSaveProduct} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold mt-2">บันทึก</button>
                                          </div>
                                   </div>
                            </div>
                     )}
              </div>
       );
}