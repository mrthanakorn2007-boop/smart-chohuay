'use server'

import { supabase } from './lib/supabase';

const getCurrentISO = () => new Date().toISOString();

export async function getPOSData() {
       // ✅ เรียงหมวดหมู่ตาม sort_order (ถ้าเท่ากันเรียงตาม id)
       const { data: categories } = await supabase.from('categories').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true });
       const { data: products } = await supabase.from('products').select('*').eq('is_active', true).order('category_id');
       const { data: quickButtons } = await supabase.from('quick_buttons').select('*').order('amount');
       const { data: settings } = await supabase.from('settings').select('*').eq('key', 'promptpay_id').single();

       return {
              categories: categories || [],
              products: products || [],
              quickButtons: quickButtons || [],
              promptpayId: settings?.value || '0000000000'
       };
}

export async function getCategories() {
       const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true });
       return data || [];
}

// ✅ เพิ่ม sort_order ตอนสร้างหมวดหมู่
export async function createCategory(name: string, sortOrder: number) {
       const { error } = await supabase.from('categories').insert({ name, sort_order: sortOrder });
       return { success: !error, message: error?.message };
}

// ✅ เพิ่มฟังก์ชันอัปเดตลำดับหมวดหมู่
export async function updateCategoryOrder(id: number, sortOrder: number) {
       const { error } = await supabase.from('categories').update({ sort_order: sortOrder }).eq('id', id);
       return { success: !error };
}

export async function deleteCategory(id: number) {
       const { error } = await supabase.from('categories').delete().eq('id', id);
       return { success: !error, message: error?.message };
}

export async function submitOrder(cartItems: any[], total: number, paymentMethod: string, slipUrl?: string, debtorInfo?: any) {
       const nowISO = getCurrentISO();
       const isCredit = paymentMethod === 'CREDIT';

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

       if (error || !order) return { success: false, message: 'บันทึกบิลไม่สำเร็จ: ' + error?.message };

       for (const item of cartItems) {
              await supabase.from('order_items').insert({
                     order_id: order.id,
                     product_id: item.id === 999 ? null : item.id,
                     product_name: item.name,
                     quantity: item.quantity, // ✅ ใช้จำนวนจริงที่รวมมาแล้ว
                     price: item.price,
                     cost: item.cost || 0
              });

              if (item.id !== 999) {
                     // ✅ ตัดสต็อกตามจำนวน (amount = item.quantity)
                     await supabase.rpc('decrement_stock', { row_id: item.id, amount: item.quantity });
              }
       }

       try { await sendToDiscord(order.id, cartItems, total, paymentMethod, slipUrl, debtorInfo); } catch (err) { console.error(err); }
       return { success: true, orderId: order.id };
}

// ... (ฟังก์ชันอื่นๆ: getSalesStats, getDebtors, repayDebt, updateSetting, etc. เหมือนเดิม ไม่ต้องแก้)
export async function getSalesStats(period: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL' | 'CUSTOM', customDays?: number) {
       let startDate = new Date();
       startDate.setHours(0, 0, 0, 0);

       if (period === 'CUSTOM' && customDays) {
              startDate.setDate(startDate.getDate() - customDays);
       } else if (period === 'WEEK') {
              startDate.setDate(startDate.getDate() - 7);
       } else if (period === 'MONTH') {
              startDate.setMonth(startDate.getMonth() - 1);
       } else if (period === 'ALL') {
              startDate = new Date(0);
       }

       const { data: items } = await supabase
              .from('order_items')
              .select('product_name, quantity, price, cost, created_at')
              .gte('created_at', startDate.toISOString());

       if (!items) return { topSelling: [], totalSales: 0, totalCost: 0, totalProfit: 0, profitMargin: 0 };

       const totalSales = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
       const totalCost = items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
       const totalProfit = totalSales - totalCost;
       const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;

       const productMap: Record<string, number> = {};
       items.forEach(item => {
              if (!productMap[item.product_name]) productMap[item.product_name] = 0;
              productMap[item.product_name] += item.quantity;
       });

       const topSelling = Object.entries(productMap)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10);

       return { topSelling, totalSales, totalCost, totalProfit, profitMargin };
}
export async function getDebtors() {
       const { data } = await supabase.from('orders').select('*, order_items(*)').eq('status', 'UNPAID').order('created_at', { ascending: false });
       return data || [];
}
export async function repayDebt(orderId: number, method: 'CASH' | 'QR') {
       const nowISO = getCurrentISO();
       const { data: order, error } = await supabase.from('orders').update({ status: 'PAID', payment_method: method, paid_at: nowISO }).eq('id', orderId).select().single();
       if (error) return { success: false, message: error.message };
       try { await sendRepaymentDiscord(order); } catch (e) { }
       return { success: true };
}
export async function updateSetting(key: string, value: string) { await supabase.from('settings').upsert({ key, value }); }
export async function addQuickButton(amount: number) { await supabase.from('quick_buttons').insert({ amount, label: amount.toString() }); }
export async function removeQuickButton(id: number) { await supabase.from('quick_buttons').delete().eq('id', id); }
export async function updateOrderItemName(itemId: number, newName: string) { const { error } = await supabase.rpc('update_item_name', { item_id: itemId, new_name: newName }); return { success: !error }; }
export async function deleteOrder(orderId: number) {
       const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
       if (items) { for (const item of items) { if (item.product_id) await supabase.rpc('increment_stock', { row_id: item.product_id, amount: item.quantity }); } }
       await supabase.from('order_items').delete().eq('order_id', orderId);
       await supabase.from('orders').delete().eq('id', orderId);
       return { success: true };
}
async function sendToDiscord(orderId: number, items: any[], total: number, paymentMethod: string, slipUrl?: string, debtorInfo?: any) {
       const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
       if (!webhookUrl) return;
       const isCredit = paymentMethod === 'CREDIT';
       const embed: any = {
              title: isCredit ? `📝 บิลแปะโป้ง #${orderId}` : `💰 บิลขายใหม่ #${orderId}`,
              description: `เวลา: ${new Date().toLocaleTimeString('th-TH')}`,
              color: isCredit ? 16753920 : 5763719,
              fields: [
                     { name: "สินค้า", value: items.map((i: any) => `${i.name} (${i.price}) x${i.quantity}`).join('\n') || "-" }, // โชว์จำนวนใน Discord ด้วย
                     { name: "ยอดรวม", value: `**${total}** บาท` },
                     { name: "จ่ายโดย", value: paymentMethod }
              ]
       };
       if (isCredit && debtorInfo) embed.fields.push({ name: "ลูกหนี้", value: `${debtorInfo.name} ${debtorInfo.contact || ''}` });
       if (slipUrl) embed.image = { url: slipUrl };
       await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ embeds: [embed] }) });
}
async function sendRepaymentDiscord(order: any) {
       const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
       if (!webhookUrl) return;
       await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ embeds: [{ title: `✅ รับชำระหนี้ #${order.id}`, description: `ยอด ${order.total_amount} บาท`, color: 5763719 }] }) });
}