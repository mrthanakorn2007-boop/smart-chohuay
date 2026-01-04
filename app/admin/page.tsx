"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
// เพิ่ม Pencil (ไอคอนดินสอ) เข้ามา
import { Plus, X, Image as ImageIcon, Archive, Settings, LayoutGrid, Package, BookUser, ExternalLink, Home, Trash2, LayoutList, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { updateSetting, addQuickButton, removeQuickButton, getDebtors, repayDebt, getCategories, createCategory, deleteCategory } from "../actions";

export default function AdminPage() {
       const searchParams = useSearchParams();
       const initialTab = searchParams.get('tab') || 'stock';
       const [activeTab, setActiveTab] = useState(initialTab);

       const [products, setProducts] = useState<any[]>([]);
       const [categories, setCategories] = useState<any[]>([]);
       const [quickButtons, setQuickButtons] = useState<any[]>([]);
       const [promptpayId, setPromptpayId] = useState("");
       const [debtors, setDebtors] = useState<any[]>([]);
       const [loading, setLoading] = useState(false);

       // Forms & Editing State
       const [isEditing, setIsEditing] = useState(false);
       const [editingId, setEditingId] = useState<number | null>(null); // เก็บ ID สินค้าที่กำลังแก้ (ถ้ามี)
       const [formData, setFormData] = useState<any>({ name: "", price: "", category_id: "", cost: "", stock: "", image_url: "" });

       const [newCatName, setNewCatName] = useState("");
       const [imageFile, setImageFile] = useState<File | null>(null);
       const [newQuickPrice, setNewQuickPrice] = useState("");
       const fileInputRef = useRef<HTMLInputElement>(null);

       useEffect(() => { fetchData(); }, []);

       const fetchData = async () => {
              setLoading(true);
              const { data: p } = await supabase.from('products').select('*').eq('is_active', true).order('id', { ascending: false });
              if (p) setProducts(p);
              const cats = await getCategories();
              setCategories(cats);
              const { data: q } = await supabase.from('quick_buttons').select('*').order('amount');
              if (q) setQuickButtons(q);
              const { data: s } = await supabase.from('settings').select('*').eq('key', 'promptpay_id').single();
              if (s) setPromptpayId(s.value);
              const debtorsData = await getDebtors();
              setDebtors(debtorsData);
              setLoading(false);
       };

       // ฟังก์ชันเตรียมข้อมูลสำหรับแก้ไข
       const handleEditClick = (product: any) => {
              setEditingId(product.id);
              setFormData({
                     name: product.name,
                     price: product.price,
                     cost: product.cost,
                     stock: product.stock,
                     category_id: product.category_id || "", // ดึงหมวดหมู่เดิมมาใส่
                     image_url: product.image_url
              });
              setImageFile(null);
              setIsEditing(true);
       };

       // ฟังก์ชันเตรียมสำหรับเพิ่มสินค้าใหม่
       const handleAddClick = () => {
              setEditingId(null); // เคลียร์ ID เพื่อบอกว่าเป็นของใหม่
              setFormData({ name: "", price: "", category_id: "", cost: "", stock: "", image_url: "" });
              setImageFile(null);
              setIsEditing(true);
       };

       const handleSaveProduct = async () => {
              if (!formData.name || !formData.price) return alert("กรอกข้อมูลให้ครบ");
              setLoading(true);

              let imageUrl = formData.image_url;

              // ถ้ามีการอัปโหลดรูปใหม่
              if (imageFile) {
                     const fileName = `${Date.now()}-${imageFile.name}`;
                     const { data } = await supabase.storage.from('products').upload(fileName, imageFile);
                     if (data) {
                            const { data: pUrl } = supabase.storage.from('products').getPublicUrl(fileName);
                            imageUrl = pUrl.publicUrl;
                     }
              }

              const catId = formData.category_id ? Number(formData.category_id) : null;
              const payload = {
                     name: formData.name,
                     price: Number(formData.price),
                     cost: Number(formData.cost) || 0,
                     stock: Number(formData.stock) || 0,
                     category_id: catId,
                     image_url: imageUrl,
                     is_active: true
              };

              if (editingId) {
                     // --- กรณีแก้ไข (Update) ---
                     await supabase.from('products').update(payload).eq('id', editingId);
              } else {
                     // --- กรณีเพิ่มใหม่ (Insert) ---
                     await supabase.from('products').insert(payload);
              }

              setIsEditing(false);
              setFormData({ name: "", price: "", category_id: "", cost: "", stock: "", image_url: "" });
              setImageFile(null);
              setEditingId(null);
              fetchData();
       };

       const handleCreateCategory = async () => { if (!newCatName) return; await createCategory(newCatName); setNewCatName(""); fetchData(); };
       const handleDeleteCategory = async (id: number) => { if (confirm("ลบหมวดหมู่นี้?")) { await deleteCategory(id); fetchData(); } };

       const handleArchive = async (id: number) => { if (confirm("ปิดการใช้งานสินค้าตัวนี้?")) { await supabase.from('products').update({ is_active: false }).eq('id', id); fetchData(); } };
       const handleSavePromptPay = async () => { await updateSetting('promptpay_id', promptpayId); alert("บันทึกเบอร์พร้อมเพย์แล้ว ✅"); };
       const handleAddQuickButton = async () => { if (newQuickPrice) { await addQuickButton(Number(newQuickPrice)); setNewQuickPrice(""); fetchData(); } };
       const handleRemoveQuickButton = async (id: number) => { if (confirm("ลบปุ่มนี้?")) { await removeQuickButton(id); fetchData(); } };
       const handleRepay = async (orderId: number, method: 'CASH' | 'QR') => {
              if (!confirm(`ยืนยันรับชำระหนี้ด้วย ${method}?`)) return;
              const res = await repayDebt(orderId, method);
              if (res.success) { alert("✅ รับชำระเรียบร้อย"); fetchData(); }
       };

       return (
              <div className="flex flex-col h-dvh grid-background overflow-hidden">

                     {/* Header */}
                     <div className="flex-none p-4 pt-safe flex items-center justify-between z-10">
                            <h1 className="font-bold text-gray-800 text-lg">จัดการหลังบ้าน</h1>
                            <Link href="/" className="glass-card px-3 py-2 rounded-full text-gray-600 font-bold flex items-center gap-1 hover:bg-white transition">
                                   <Home size={18} /> เมนู
                            </Link>
                     </div>

                     {/* Tabs */}
                     <div className="flex-none px-4 pb-2">
                            <div className="glass-card p-1 rounded-2xl flex overflow-x-auto no-scrollbar">
                                   {['stock', 'category', 'debt', 'quick', 'settings'].map(tab => (
                                          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 whitespace-nowrap transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                                                 {tab === 'stock' && <><Package size={18} /> สินค้า</>}
                                                 {tab === 'category' && <><LayoutList size={18} /> หมวด</>}
                                                 {tab === 'debt' && <><BookUser size={18} /> หนี้</>}
                                                 {tab === 'quick' && <><LayoutGrid size={18} /> ปุ่ม</>}
                                                 {tab === 'settings' && <><Settings size={18} /> ตั้งค่า</>}
                                          </button>
                                   ))}
                            </div>
                     </div>

                     {/* Content */}
                     <div className="flex-1 overflow-y-auto p-4 pb-safe">
                            <div className="max-w-2xl mx-auto pb-20">

                                   {/* --- STOCK --- */}
                                   {activeTab === 'stock' && (
                                          <>
                                                 <button onClick={handleAddClick} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 mb-4 flex justify-center items-center gap-2 hover:bg-blue-700 active:scale-95 transition">
                                                        <Plus /> เพิ่มสินค้าใหม่
                                                 </button>
                                                 <div className="grid gap-3">
                                                        {products.map(p => {
                                                               const catName = categories.find(c => c.id === p.category_id)?.name || "ไม่ระบุ";
                                                               return (
                                                                      <div key={p.id} className="glass-card bg-white p-3 rounded-2xl flex items-center gap-3">
                                                                             <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden relative border flex-shrink-0">
                                                                                    {p.image_url ? <Image src={p.image_url} alt="" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-gray-300" /></div>}
                                                                             </div>
                                                                             <div className="flex-1 min-w-0">
                                                                                    <div className="font-bold truncate text-gray-800">{p.name}</div>
                                                                                    <div className="flex items-center gap-2 text-xs">
                                                                                           <span className={`px-1.5 py-0.5 rounded ${p.category_id ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                                                                                  {catName}
                                                                                           </span>
                                                                                           <span className="text-gray-500">คงเหลือ <span className={p.stock < 5 ? 'text-red-500 font-bold' : 'text-green-600'}>{p.stock}</span></span>
                                                                                    </div>
                                                                             </div>
                                                                             <div className="text-right flex flex-col items-end gap-1">
                                                                                    <div className="text-blue-600 font-bold text-lg">{p.price}.-</div>
                                                                                    <div className="flex gap-1">
                                                                                           <button onClick={() => handleEditClick(p)} className="bg-yellow-50 text-yellow-600 p-1.5 rounded-lg hover:bg-yellow-100 transition">
                                                                                                  <Pencil size={14} />
                                                                                           </button>
                                                                                           <button onClick={() => handleArchive(p.id)} className="bg-red-50 text-red-400 p-1.5 rounded-lg hover:bg-red-100 transition">
                                                                                                  <Archive size={14} />
                                                                                           </button>
                                                                                    </div>
                                                                             </div>
                                                                      </div>
                                                               );
                                                        })}
                                                 </div>
                                          </>
                                   )}

                                   {/* --- CATEGORY --- */}
                                   {activeTab === 'category' && (
                                          <div className="glass-card bg-white p-6 rounded-3xl">
                                                 <h3 className="font-bold mb-4 text-gray-700">จัดการหมวดหมู่สินค้า</h3>
                                                 <div className="flex gap-2 mb-6">
                                                        <input placeholder="ชื่อหมวดหมู่ใหม่" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                                        <button onClick={handleCreateCategory} className="bg-blue-600 text-white px-4 rounded-xl font-bold active:scale-95 transition">เพิ่ม</button>
                                                 </div>
                                                 <div className="space-y-2">
                                                        {categories.map(c => (
                                                               <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border">
                                                                      <span className="font-bold text-gray-700">{c.name}</span>
                                                                      <button onClick={() => handleDeleteCategory(c.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                                               </div>
                                                        ))}
                                                 </div>
                                          </div>
                                   )}

                                   {/* --- DEBT --- */}
                                   {activeTab === 'debt' && (
                                          <div className="space-y-4">
                                                 {debtors.length === 0 ? <div className="text-center text-gray-400 py-10">ไม่มีคนติดหนี้</div> : debtors.map(order => (
                                                        <div key={order.id} className="glass-card bg-white p-4 rounded-2xl relative overflow-hidden">
                                                               <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                                                               <div className="flex justify-between items-start mb-3">
                                                                      <div>
                                                                             <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><BookUser size={18} className="text-orange-500" /> {order.customer_name}</h3>
                                                                             <p className="text-sm text-gray-500">{order.customer_contact || "ไม่มีเบอร์โทร"}</p>
                                                                             <p className="text-xs text-gray-400 mt-1">วันที่: {new Date(order.created_at).toLocaleDateString('th-TH')}</p>
                                                                      </div>
                                                                      <div className="text-right">
                                                                             <span className="block text-2xl font-extrabold text-orange-600">{order.total_amount}.-</span>
                                                                      </div>
                                                               </div>
                                                               <div className="grid grid-cols-2 gap-3">
                                                                      <button onClick={() => handleRepay(order.id, 'CASH')} className="py-2 bg-green-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-green-700 active:scale-95 transition">รับเงินสด 💵</button>
                                                                      <button onClick={() => handleRepay(order.id, 'QR')} className="py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 active:scale-95 transition">รับโอน/QR 📱</button>
                                                               </div>
                                                        </div>
                                                 ))}
                                          </div>
                                   )}

                                   {/* --- QUICK BUTTONS --- */}
                                   {activeTab === 'quick' && (
                                          <div className="glass-card bg-white p-6 rounded-3xl">
                                                 <h3 className="font-bold mb-4 text-gray-700">จัดการปุ่มราคาด่วน</h3>
                                                 <div className="flex gap-2 mb-6">
                                                        <input type="number" placeholder="ราคา" value={newQuickPrice} onChange={e => setNewQuickPrice(e.target.value)} className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                                        <button onClick={handleAddQuickButton} className="bg-green-600 text-white px-4 rounded-xl font-bold active:scale-95 transition">เพิ่ม</button>
                                                 </div>
                                                 <div className="grid grid-cols-4 gap-3">
                                                        {quickButtons.map(qb => (
                                                               <div key={qb.id} className="relative bg-blue-50 h-20 rounded-xl flex items-center justify-center border border-blue-100">
                                                                      <span className="text-xl font-bold text-blue-600">{qb.amount}</span>
                                                                      <button onClick={() => handleRemoveQuickButton(qb.id)} className="absolute top-1 right-1 text-red-400 bg-white rounded-full p-1 shadow-sm hover:bg-red-50"><Trash2 size={12} /></button>
                                                               </div>
                                                        ))}
                                                 </div>
                                          </div>
                                   )}

                                   {/* --- SETTINGS --- */}
                                   {activeTab === 'settings' && (
                                          <div className="glass-card bg-white p-6 rounded-3xl">
                                                 <h3 className="font-bold mb-4 text-gray-700">ตั้งค่ารับเงิน</h3>
                                                 <label className="block text-sm text-gray-500 mb-2">เบอร์ PromptPay / รหัสบัตร ปชช.</label>
                                                 <div className="flex gap-2">
                                                        <input value={promptpayId} onChange={e => setPromptpayId(e.target.value)} className="flex-1 p-3 border rounded-xl font-mono text-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                                        <button onClick={handleSavePromptPay} className="bg-blue-600 text-white px-4 rounded-xl font-bold active:scale-95 transition">บันทึก</button>
                                                 </div>
                                          </div>
                                   )}
                            </div>
                     </div>

                     {/* Modal Add/Edit Product */}
                     {isEditing && (
                            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                                   <div className="glass-card bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                                          <div className="flex justify-between mb-4">
                                                 <h3 className="font-bold text-lg">{editingId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</h3>
                                                 <button onClick={() => setIsEditing(false)} className="bg-gray-100 p-1 rounded-full"><X size={20} /></button>
                                          </div>

                                          <div className="space-y-3">
                                                 {/* Image Upload */}
                                                 <div onClick={() => fileInputRef.current?.click()} className="h-32 bg-gray-50 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer relative overflow-hidden hover:bg-gray-100 transition">
                                                        {/* ถ้ามีการเลือกรูปใหม่ ให้โชว์รูปใหม่ */}
                                                        {imageFile ? (
                                                               <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover" />
                                                        ) : (
                                                               /* ถ้าไม่มีรูปใหม่ แต่มี URL เดิม ให้โชว์รูปเดิม */
                                                               formData.image_url ? (
                                                                      <img src={formData.image_url} className="w-full h-full object-cover" />
                                                               ) : (
                                                                      <span className="text-gray-400 text-sm flex flex-col items-center"><ImageIcon className="mb-1" /> เลือกรูปภาพ</span>
                                                               )
                                                        )}
                                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                                                 </div>

                                                 <input placeholder="ชื่อสินค้า" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />

                                                 {/* หมวดหมู่ Dropdown */}
                                                 <select className="w-full p-2 border rounded-lg outline-none bg-white focus:border-blue-500" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                                                        <option value="">-- เลือกหมวดหมู่ --</option>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                 </select>

                                                 <div className="grid grid-cols-3 gap-2">
                                                        <input type="number" placeholder="ราคา" className="p-2 border rounded-lg outline-none focus:border-blue-500 font-bold text-blue-600" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                                                        <input type="number" placeholder="ทุน" className="p-2 border rounded-lg outline-none focus:border-blue-500 text-gray-500" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} />
                                                        <input type="number" placeholder="สต็อก" className="p-2 border rounded-lg outline-none focus:border-blue-500" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                                                 </div>

                                                 <button onClick={handleSaveProduct} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold mt-2 shadow-lg hover:bg-blue-700 active:scale-95 transition">
                                                        {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
                                                 </button>
                                          </div>
                                   </div>
                            </div>
                     )}
              </div>
       );
}