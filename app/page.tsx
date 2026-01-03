"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Trash2, X, Loader2, Image as ImageIcon, Settings, Camera, Lock, User, Phone, FileText } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getPOSData, submitOrder } from "./actions";
import { supabase } from "./lib/supabase";
import generatePayload from "promptpay-qr";
import { QRCodeSVG } from "qrcode.react";

const ADMIN_PIN = "1234";

export default function POS() {
  const router = useRouter();

  // Data
  const [products, setProducts] = useState<any[]>([]);
  const [quickButtons, setQuickButtons] = useState<any[]>([]);
  const [promptpayId, setPromptpayId] = useState("");
  const [loading, setLoading] = useState(true);

  // Cart
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Payment
  const [paymentMode, setPaymentMode] = useState<'SELECT' | 'QR' | 'CREDIT'>('SELECT');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debtor
  const [debtorName, setDebtorName] = useState("");
  const [debtorContact, setDebtorContact] = useState("");

  // Admin
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pin, setPin] = useState("");

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
      if (data) {
        const { data: pUrl } = supabase.storage.from('slips').getPublicUrl(fileName);
        slipUrl = pUrl.publicUrl;
      }
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

  const verifyPin = () => {
    if (pin === ADMIN_PIN) {
      return (
        <div className="space-y-3">
          <p className="text-green-600 font-bold mb-2">🔓 ยินดีต้อนรับ</p>
          <button onClick={() => router.push('/admin')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">📦 จัดการสต็อก & สมุดหนี้</button>
          <button onClick={() => router.push('/dashboard')} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold">📊 ดูยอดขาย & แก้ประวัติ</button>
        </div>
      )
    }
    return (
      <>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength={4} className="text-center text-3xl tracking-widest border-2 w-full p-2 rounded-xl mb-4" placeholder="••••" />
        <div className="flex justify-end gap-2"><button onClick={() => setShowAdminLogin(false)} className="px-4 py-2 text-gray-500">ยกเลิก</button></div>
      </>
    );
  };

  return (
    // 🟢 LAYOUT หลัก: ใช้ Flex Column เต็มจอ (h-[100dvh])
    <div className="flex flex-col h-[100dvh] bg-gray-100 max-w-md mx-auto relative shadow-2xl border-x border-gray-200 overflow-hidden">

      {/* 🟢 ส่วนที่ 1: Header (ขนาด Fix) */}
      <div className="flex-none bg-white p-3 flex justify-between items-center border-b px-4 z-20 pt-safe">
        <h1 className="font-bold text-gray-800 text-lg">🛒 ร้านแม่</h1>
        <button onClick={() => { setPin(""); setShowAdminLogin(true); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><Settings size={20} className="text-gray-600" /></button>
      </div>

      {showAdminLogin && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-xl font-bold mb-4 flex justify-center items-center gap-2"><Lock size={20} /> ผู้จัดการร้าน</h2>
            {verifyPin()}
          </div>
        </div>
      )}

      {/* 🟢 ส่วนที่ 2: Quick Buttons (ขนาด Fix) */}
      <div className="flex-none bg-white p-3 shadow-sm z-10 border-b border-gray-100">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {quickButtons.map(qb => (
            <button key={qb.id} onClick={() => setCart([...cart, { id: 999, name: `ปุ่มด่วน ${qb.amount}`, price: qb.amount, category: 'Quick' }])}
              className="flex-shrink-0 w-14 h-14 bg-blue-50 text-blue-600 rounded-xl font-bold border border-blue-100 flex items-center justify-center text-lg active:scale-90 transition shadow-sm">
              {qb.amount}
            </button>
          ))}
        </div>
      </div>

      {/* 🟢 ส่วนที่ 3: Products (สำคัญ: flex-1 คือให้กินพื้นที่ที่เหลือทั้งหมด) */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
        {loading ? <div className="text-center mt-10"><Loader2 className="animate-spin inline" /></div> :
          <div className="grid grid-cols-3 gap-2 pb-4">
            {/* pb-4 เผื่อไว้หายใจนิดหน่อย แต่ไม่จำเป็นต้องเยอะเพราะตะกร้าไม่บังแล้ว */}
            {products.map(p => (
              <button key={p.id} onClick={() => setCart([...cart, { ...p, cartId: Math.random().toString() }])} disabled={p.stock <= 0}
                className={`bg-white p-1 rounded-xl shadow-sm border border-gray-100 h-36 flex flex-col items-center relative transition-all active:scale-95 ${p.stock <= 0 ? 'opacity-50 grayscale' : ''}`}>
                <div className="w-full h-20 relative rounded-lg overflow-hidden mb-1 bg-gray-100">
                  {p.image_url ? <Image src={p.image_url} alt="" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-gray-300" /></div>}
                </div>
                <span className="text-xs font-medium text-gray-700 line-clamp-2 h-8 flex items-center text-center leading-tight px-1">{p.name}</span>
                <div className="mt-auto w-full text-center pb-1"><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-md">{p.price}.-</span></div>
                <span className={`absolute top-1 right-1 text-[8px] px-1.5 py-0.5 rounded text-white font-bold shadow-sm ${p.stock < 5 ? 'bg-red-500' : 'bg-gray-400/80'}`}>{p.stock}</span>
              </button>
            ))}
          </div>
        }
      </div>

      {/* 🟢 ส่วนที่ 4: Cart Bar (ตะกร้าแบบ Compact) */}
      {/* ไม่ใช้ absolute แล้ว แต่เป็น flex-none เพื่อต่อท้ายรายการสินค้าเลย */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            // pb-safe จำเป็นสำหรับ iPhone เพื่อดันหนีขีดขาว
            className="flex-none bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-40 pb-safe"
          >
            <div onClick={() => setIsCartOpen(true)} className="p-4 flex justify-between items-center cursor-pointer active:bg-gray-50 rounded-t-3xl">
              <div className="flex items-center gap-3"><div className="bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg text-sm">{cart.length}</div><span className="text-gray-500 font-medium">รวมเงิน</span></div>
              <span className="text-3xl font-extrabold text-blue-600">{total}.-</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 ส่วนที่ 5: Cart Modal (ตะกร้าแบบเต็มจอ/Overlay) */}
      {/* อันนี้ต้องใช้ fixed ทับทุกอย่าง เพราะเป็น Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-white flex flex-col h-[100dvh]"
          >
            {/* Header ตะกร้า */}
            <div className="flex-none p-4 pt-safe border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><ShoppingCart className="text-blue-600" /> ตะกร้าสินค้า</h2>
              <button onClick={() => { setIsCartOpen(false); setPaymentMode('SELECT'); }} className="bg-white p-2 rounded-full hover:bg-gray-100"><X size={20} /></button>
            </div>

            {/* รายการในตะกร้า (Scroll ได้) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {cart.map((item, i) => (
                <div key={item.cartId} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 overflow-hidden"><span className="font-bold text-gray-400 text-sm min-w-[20px]">{i + 1}.</span><span className="font-bold text-gray-700 truncate">{item.name}</span></div>
                  <div className="flex items-center gap-3 flex-shrink-0"><span className="font-bold text-blue-600">{item.price}</span> <button onClick={() => setCart(cart.filter(c => c.cartId !== item.cartId))} className="text-red-400 p-1 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button></div>
                </div>
              ))}
            </div>

            {/* Footer ชำระเงิน */}
            <div className="flex-none p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-white border-t safe-area-bottom shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              {paymentMode === 'SELECT' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-end px-2 mb-2"><span className="text-gray-500 font-medium">ยอดสุทธิ</span><span className="text-4xl font-extrabold text-blue-600">{total}.-</span></div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleCheckout('CASH')} disabled={processing} className="py-4 bg-gray-800 text-white rounded-xl font-bold shadow-lg flex justify-center gap-2">💵 เงินสด</button>
                    <button onClick={() => setPaymentMode('QR')} disabled={processing} className="py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex justify-center gap-2">📱 QR Code</button>
                  </div>
                  <button onClick={() => setPaymentMode('CREDIT')} className="w-full py-3 bg-orange-100 text-orange-700 border border-orange-200 rounded-xl font-bold flex justify-center gap-2">📝 ติดไว้ก่อน (แปะโป้ง)</button>
                </div>
              )}

              {paymentMode === 'QR' && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-white p-4 border rounded-2xl mb-4 shadow-sm"><QRCodeSVG value={ppPayload} size={150} /></div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => setSlipFile(e.target.files?.[0] || null)} />
                  <button onClick={() => fileInputRef.current?.click()} className={`w-full py-3 mb-3 border-2 border-dashed rounded-xl font-bold flex justify-center items-center gap-2 ${slipFile ? 'bg-green-50 text-green-700 border-green-500' : 'text-gray-400'}`}>
                    <Camera size={20} /> {slipFile ? "แนบสลิปแล้ว" : "ถ่ายสลิป"}
                  </button>
                  <button onClick={() => handleCheckout('QR')} disabled={processing} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg">{processing ? "..." : "ยืนยันรับเงิน"}</button>
                  <button onClick={() => setPaymentMode('SELECT')} className="mt-3 text-sm text-gray-400">ย้อนกลับ</button>
                </div>
              )}

              {paymentMode === 'CREDIT' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-3">
                  <h3 className="font-bold text-orange-600 flex items-center gap-2 text-lg"><FileText /> ลงบัญชีติดหนี้</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border p-3 rounded-xl bg-gray-50"><User className="text-gray-400" /><input placeholder="ชื่อลูกหนี้ (ต้องใส่)" value={debtorName} onChange={e => setDebtorName(e.target.value)} className="bg-transparent w-full outline-none font-bold text-gray-700" /></div>
                    <div className="flex items-center gap-2 border p-3 rounded-xl bg-gray-50"><Phone className="text-gray-400" /><input placeholder="เบอร์โทร / หมายเหตุ" value={debtorContact} onChange={e => setDebtorContact(e.target.value)} className="bg-transparent w-full outline-none" /></div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => setSlipFile(e.target.files?.[0] || null)} />
                  <button onClick={() => fileInputRef.current?.click()} className={`w-full py-3 border-2 border-dashed rounded-xl font-bold flex justify-center items-center gap-2 ${slipFile ? 'bg-green-50 text-green-700 border-green-500' : 'text-gray-400'}`}>
                    <Camera size={20} /> {slipFile ? "ถ่ายรูปคนติดหนี้แล้ว" : "ถ่ายรูปคนซื้อ (กันลืม)"}
                  </button>
                  <button onClick={() => handleCheckout('CREDIT')} disabled={processing} className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold shadow-lg hover:bg-orange-600">{processing ? "..." : "ยืนยันการติดหนี้"}</button>
                  <button onClick={() => setPaymentMode('SELECT')} className="w-full text-center text-sm text-gray-400">ย้อนกลับ</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}