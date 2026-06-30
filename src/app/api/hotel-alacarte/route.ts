import { NextResponse } from 'next/server';

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD;

async function odooJsonRpc(method: string, params: Record<string, unknown>) {
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service: 'object', method, ...params }, id: Math.floor(Math.random() * 1000000) }),
  });
  if (!res.ok) throw new Error(`Odoo HTTP error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error?.data?.message || json.error?.message || 'Unknown Odoo error');
  return json.result;
}

async function odooLogin(): Promise<number> {
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 1, params: { service: 'common', method: 'login', args: [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD] } }),
  });
  const json = await res.json();
  if (json.error || !json.result) throw new Error('Gagal login ke Odoo. Cek ODOO_DB / ODOO_USERNAME / ODOO_PASSWORD.');
  return json.result as number;
}

async function odooExecuteKw(uid: number, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  return odooJsonRpc('execute_kw', { args: [ODOO_DB, uid, ODOO_PASSWORD, model, method, args, kwargs] });
}

export async function GET() {
  try {
    if (!ODOO_URL || !ODOO_DB || !ODOO_USERNAME || !ODOO_PASSWORD)
      return NextResponse.json({ error: 'Konfigurasi server Odoo belum lengkap (cek environment variables).' }, { status: 500 });

    const uid = await odooLogin();
    const products = await odooExecuteKw(uid, 'x_product', 'search_read',
      [[['x_studio_kategori_jasa', '=', 'À La Carte'], ['x_studio_tipe_product', '=', 'Service']]],
      { fields: ['id', 'x_name', 'x_studio_harga', 'x_studio_deskripsi'], order: 'x_name asc' }
    ) as Array<{ id: number; x_name: string; x_studio_harga: number; x_studio_deskripsi: string | false }>;

    return NextResponse.json({ results: products.map((p) => ({ id: p.id, name: p.x_name, harga: p.x_studio_harga, deskripsi: p.x_studio_deskripsi || '' })) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga.' }, { status: 500 });
  }
}