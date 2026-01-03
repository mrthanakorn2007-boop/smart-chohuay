'use server'

import { supabase } from './lib/supabase';

const getThaiTime = () => {
       const now = new Date();
       const offset = 7 * 60 * 60 * 1000;
       return new Date(now.getTime() + offset);
};

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

// --- 2. สร้างออเดอร์ (รองรับการติดหนี้) ---
export async function submitOrder(cartItems: any[], total: number, paymentMethod: string, slipUrl?: string, debtorInfo?: any) {
       const thaiNow = getThaiTime();
       const isCredit = paymentMethod === 'CREDIT';

       // สร้างบิล
       const { data: order, error } = await supabase
              .from('orders')
              .insert({
                     total_amount: total,
                     payment_method: isCredit ? 'CREDIT' : paymentMethod, // ถ้าติดหนี้ ให้ method เป็น CREDIT
                     slip_url: slipUrl || null,
                     created_at: thaiNow.toISOString(),
                     status: isCredit ? 'UNPAID' : 'PAID', // ถ้าติดหนี้ status = UNPAID
                     paid_at: isCredit ? null : thaiNow.toISOString(), // ถ้าติดหนี้ ยังไม่มีวันที่รับเงิน
                     customer_name: debtorInfo?.name || null,
                     customer_contact: debtorInfo?.contact || null
              })
              .select().single();

       if (error || !order) return { success: false, message: 'บันทึกบิลไม่สำเร็จ' };

       // บันทึกรายการ + ตัดสต็อก (ตัดทันทีเสมอ)
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
                     await supabase.rpc('decrement_stock', { row_id: item.id, amount: 1 });
              }
       }

       // ส่ง Discord
       await sendToDiscord(order.id, cartItems, total, paymentMethod, slipUrl, debtorInfo);

       return { success: true };
}

// --- 3. ดึงรายชื่อลูกหนี้ ---
export async function getDebtors() {
       const { data } = await supabase
              .from('orders')
              .select('*, order_items(*)')
              .eq('status', 'UNPAID')
              .order('created_at', { ascending: false });
       return data || [];
}

// --- 4. รับชำระหนี้ (Repay) ---
export async function repayDebt(orderId: number, method: 'CASH' | 'QR') {
       const thaiNow = getThaiTime();

       // อัปเดตบิลเป็นจ่ายแล้ว
       const { data: order, error } = await supabase
              .from('orders')
              .update({
                     status: 'PAID',
                     payment_method: method,
                     paid_at: thaiNow.toISOString() // บันทึกวันที่รับเงินจริง
              })
              .eq('id', orderId)
              .select().single();

       if (error) return { success: false, message: error.message };

       // ส่ง Discord แจ้งเตือนว่าได้รับเงินคืนแล้ว
       await sendRepaymentDiscord(order);

       return { success: true };
}

// --- Discord Helpers ---
async function sendToDiscord(orderId: number, items: any[], total: number, paymentMethod: string, slipUrl?: string, debtorInfo?: any) {
       const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
       if (!webhookUrl) return;

       const isCredit = paymentMethod === 'CREDIT';
       const color = isCredit ? 16753920 : (paymentMethod === 'QR' ? 3447003 : 9807270); // ส้ม (หนี้) / น้ำเงิน / เทา
       const icon = isCredit ? '📝' : (paymentMethod === 'QR' ? '📱' : '💵');
       const title = isCredit ? `บิลแปะโป้ง (ติดหนี้) #${orderId}` : `บิลขายปกติ #${orderId}`;

       const itemsList = items.map((i: any) => `▫️ ${i.name} (${i.price}.-)`).join('\n');

       const fields = [
              { name: "🛒 รายการสินค้า", value: itemsList || "-" },
              { name: isCredit ? "💸 ยอดค้างชำระ" : "💰 ยอดสุทธิ", value: `**${total.toLocaleString()} บาท**` }
       ];

       if (isCredit && debtorInfo) {
              fields.unshift({ name: "👤 ลูกหนี้", value: `${debtorInfo.name} (${debtorInfo.contact || '-'})` });
       }

       const embed: any = {
              title: `${icon} ${title}`,
              description: `เวลา: ${new Date().toLocaleTimeString('th-TH')}`,
              color: color,
              fields: fields
       };

       if (slipUrl) {
              embed.image = { url: slipUrl };
              embed.footer = { text: isCredit ? "📷 รูปถ่ายลูกหนี้/หลักฐาน" : "✅ มีสลิปโอนเงิน" };
       }

       try { await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ embeds: [embed] }) }); } catch (e) { }
}

async function sendRepaymentDiscord(order: any) {
       const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
       if (!webhookUrl) return;

       const embed = {
              title: `✅ รับชำระหนี้เรียบร้อย #${order.id}`,
              description: `จาก: **${order.customer_name}**`,
              color: 5763719, // เขียว
              fields: [
                     { name: "ยอดชำระ", value: `**${order.total_amount.toLocaleString()} บาท**` },
                     { name: "ช่องทาง", value: order.payment_method }
              ],
              timestamp: new Date().toISOString()
       };

       try { await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ embeds: [embed] }) }); } catch (e) { }
}

// --- อื่นๆ (Admin/Settings) ---
export async function updateSetting(key: string, value: string) { await supabase.from('settings').upsert({ key, value }); }
export async function addQuickButton(amount: number) { await supabase.from('quick_buttons').insert({ amount, label: amount.toString() }); }
export async function removeQuickButton(id: number) { await supabase.from('quick_buttons').delete().eq('id', id); }
export async function updateOrderItemName(itemId: number, newName: string) { const { error } = await supabase.rpc('update_item_name', { item_id: itemId, new_name: newName }); return { success: !error }; }
export async function deleteOrder(orderId: number) {
       const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
       if (items) {
              for (const item of items) { if (item.product_id) await supabase.rpc('increment_stock', { row_id: item.product_id, amount: item.quantity }); }
       }
       await supabase.from('order_items').delete().eq('order_id', orderId);
       await supabase.from('orders').delete().eq('id', orderId);
       return { success: true };
}