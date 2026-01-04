'use server'

import { supabase } from './lib/supabase';

// --- Helper: เวลาปัจจุบัน (UTC) ---
const getCurrentISO = () => new Date().toISOString();

// --- 1. โหลดข้อมูล POS ---
export async function getPOSData() {
       const { data: products } = await supabase.from('products').select('*').eq('is_active', true).order('category');
       const { data: quickButtons } = await supabase.from('quick_buttons').select('*').order('amount');
       const { data: settings } = await supabase.from('settings').select('*').eq('key', 'promptpay_id').single();

       return {
              products: products || [],
              quickButtons: quickButtons || [],
              promptpayId: settings?.value || '0000000000'
       };
}

// --- 2. สร้างออเดอร์ (Core Logic) ---
export async function submitOrder(cartItems: any[], total: number, paymentMethod: string, slipUrl?: string, debtorInfo?: any) {
       const nowISO = getCurrentISO();
       const isCredit = paymentMethod === 'CREDIT';

       // A. บันทึกบิลลง DB
       const { data: order, error } = await supabase
              .from('orders')
              .insert({
                     total_amount: total,
                     payment_method: isCredit ? 'CREDIT' : paymentMethod,
                     slip_url: slipUrl || null,
                     created_at: nowISO,
                     status: isCredit ? 'UNPAID' : 'PAID',
                     paid_at: isCredit ? null : nowISO,
                     customer_name: debtorInfo?.name || null,
                     customer_contact: debtorInfo?.contact || null
              })
              .select().single();

       if (error || !order) {
              console.error("Order Error:", error);
              return { success: false, message: 'บันทึกบิลไม่สำเร็จ: ' + error?.message };
       }

       // B. บันทึกรายการสินค้า + ตัดสต็อก
       for (const item of cartItems) {
              await supabase.from('order_items').insert({
                     order_id: order.id,
                     product_id: item.id === 999 ? null : item.id,
                     product_name: item.name,
                     quantity: 1,
                     price: item.price,
                     cost: item.cost || 0
              });

              if (item.id !== 999) {
                     // เรียกฟังก์ชันตัดสต็อกใน DB
                     await supabase.rpc('decrement_stock', { row_id: item.id, amount: 1 });
              }
       }

       // C. ส่ง Discord (ใส่ try-catch เพื่อไม่ให้กระทบการขายถ้าเน็ตหลุด)
       try {
              await sendToDiscord(order.id, cartItems, total, paymentMethod, slipUrl, debtorInfo);
       } catch (err) {
              console.error("Discord Failed:", err);
       }

       return { success: true };
}

// --- 3. ฟังก์ชันอื่นๆ ---
export async function getDebtors() {
       const { data } = await supabase.from('orders').select('*, order_items(*)').eq('status', 'UNPAID').order('created_at', { ascending: false });
       return data || [];
}

export async function repayDebt(orderId: number, method: 'CASH' | 'QR') {
       const nowISO = getCurrentISO();
       const { data: order, error } = await supabase.from('orders').update({ status: 'PAID', payment_method: method, paid_at: nowISO }).eq('id', orderId).select().single();
       if (error) return { success: false, message: error.message };

       // แจ้งเตือนเมื่อหนี้ถูกจ่าย
       try { await sendRepaymentDiscord(order); } catch (e) { }

       return { success: true };
}

// --- Discord Helpers ---
async function sendToDiscord(orderId: number, items: any[], total: number, paymentMethod: string, slipUrl?: string, debtorInfo?: any) {
       const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
       if (!webhookUrl) return;

       const isCredit = paymentMethod === 'CREDIT';
       // สี: ส้ม(หนี้) / น้ำเงิน(QR) / เขียว(สด)
       const color = isCredit ? 16753920 : (paymentMethod === 'QR' ? 3447003 : 5763719);

       const itemsList = items.map((i: any) => `▫️ ${i.name} (${i.price}.-)`).join('\n');

       const embed: any = {
              title: isCredit ? `📝 บิลแปะโป้ง #${orderId}` : `💰 บิลขายใหม่ #${orderId}`,
              description: `เวลา: ${new Date().toLocaleTimeString('th-TH')}`,
              color: color,
              fields: [
                     { name: "รายการสินค้า", value: itemsList || "-" },
                     { name: "ยอดสุทธิ", value: `**${total.toLocaleString()} บาท**` },
                     { name: "การชำระเงิน", value: paymentMethod }
              ]
       };

       if (isCredit && debtorInfo) {
              embed.fields.push({ name: "👤 ผู้ติดหนี้", value: `${debtorInfo.name} (${debtorInfo.contact || '-'})` });
       }

       if (slipUrl) {
              embed.image = { url: slipUrl };
       }

       await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ embeds: [embed] }),
       });
}

async function sendRepaymentDiscord(order: any) {
       const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
       if (!webhookUrl) return;

       await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                     embeds: [{
                            title: `✅ ได้รับชำระหนี้แล้ว #${order.id}`,
                            description: `ลูกหนี้: **${order.customer_name}**\nยอดเงิน: **${order.total_amount}** บาท`,
                            color: 5763719, // สีเขียว
                            timestamp: new Date().toISOString()
                     }]
              }),
       });
}

// Admin Actions
export async function updateSetting(key: string, value: string) {
       await supabase.from('settings').upsert({ key, value });
}
export async function addQuickButton(amount: number) {
       await supabase.from('quick_buttons').insert({ amount, label: amount.toString() });
}
export async function removeQuickButton(id: number) {
       await supabase.from('quick_buttons').delete().eq('id', id);
}
export async function updateOrderItemName(itemId: number, newName: string) {
       const { error } = await supabase.rpc('update_item_name', { item_id: itemId, new_name: newName });
       return { success: !error };
}
export async function deleteOrder(orderId: number) {
       // คืนของเข้าสต็อกก่อนลบ
       const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
       if (items) {
              for (const item of items) {
                     if (item.product_id) await supabase.rpc('increment_stock', { row_id: item.product_id, amount: item.quantity });
              }
       }
       await supabase.from('order_items').delete().eq('order_id', orderId);
       await supabase.from('orders').delete().eq('id', orderId);
       return { success: true };
}