import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

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

interface PetLinePayload {
  petId: number | null;
  namaPetBaru: string; jenisPetBaru: string; rasBaru: string; beratBaru: string;
  vaccinePhotoBase64: string | null;
  tipeKamarReq: string; groomingReq: string;
  alacarteIds: number[]; aktivitasIds: number[];
  antiparasitMerk: string; antiparasitLainnya: string;
  makanan: string; alergiMakanan: string; instruksiMakan: string;
  sedangPengobatan: boolean; instruksiObat: string;
  sifatManusia: string; sifatAnabul: string; catatanPet: string;
}

interface BookingRequestPayload {
  ownerId: number | null; isNewCustomer: boolean;
  namaBaru: string; teleponBaru: string; emailBaru: string; instagramBaru: string; alamatBaru: string;
  kontakEmergency: string; teleponEmergency: string;
  tanggalCheckin: string; tanggalCheckout: string;
  butuhTransport: boolean; transportModa: string; transportArah: string; alamatTransport: string;
  catatan: string; setujuTc: boolean;
  pets: PetLinePayload[];
}

export async function POST(req: NextRequest) {
  try {
    if (!ODOO_URL || !ODOO_DB || !ODOO_USERNAME || !ODOO_PASSWORD)
      return NextResponse.json({ error: 'Konfigurasi server Odoo belum lengkap (cek environment variables).' }, { status: 500 });

    const payload: BookingRequestPayload = await req.json();

    if (!payload.setujuTc) return NextResponse.json({ error: 'Anda harus menyetujui syarat & ketentuan.' }, { status: 400 });
    if (payload.isNewCustomer && (!payload.namaBaru || !payload.teleponBaru)) return NextResponse.json({ error: 'Nama dan telepon pemilik wajib diisi.' }, { status: 400 });
    if (!payload.isNewCustomer && !payload.ownerId) return NextResponse.json({ error: 'Silakan pilih pemilik yang sudah terdaftar.' }, { status: 400 });
    if (!payload.tanggalCheckin || !payload.tanggalCheckout) return NextResponse.json({ error: 'Tanggal check-in dan check-out wajib diisi.' }, { status: 400 });
    if (payload.pets.length === 0) return NextResponse.json({ error: 'Minimal satu hewan harus ditambahkan.' }, { status: 400 });
    if (!payload.kontakEmergency || !payload.teleponEmergency) return NextResponse.json({ error: 'Kontak emergency wajib diisi.' }, { status: 400 });

    const uid = await odooLogin();

    // 1. Resolve owner
    let ownerId: number;
    if (!payload.isNewCustomer && payload.ownerId) {
      ownerId = payload.ownerId;
    } else {
      const existing = await odooExecuteKw(uid, 'x_nama', 'search', [[['x_studio_nomor_telepon', '=', payload.teleponBaru]]]) as number[];
      if (existing.length > 0) {
        ownerId = existing[0];
      } else {
        ownerId = await odooExecuteKw(uid, 'x_nama', 'create', [{
          x_studio_nama_lengkap: payload.namaBaru,
          x_studio_nomor_telepon: payload.teleponBaru,
          x_studio_e_mail: payload.emailBaru || false,
          x_studio_instagram: payload.instagramBaru || false,
          x_studio_alamat: payload.alamatBaru || false,
        }]) as number;
      }
    }

    // 2. Create header
    const bookingId = await odooExecuteKw(uid, 'x_booking_request_hote', 'create', [{
      x_studio_owner: ownerId,
      x_studio_is_new_customer: payload.isNewCustomer,
      x_studio_nama_baru: payload.isNewCustomer ? payload.namaBaru : false,
      x_studio_telepon_baru: payload.isNewCustomer ? payload.teleponBaru : false,
      x_studio_email_baru: payload.emailBaru || false,
      x_studio_instagram_baru: payload.instagramBaru || false,
      x_studio_alamat_baru: payload.alamatBaru || false,
      x_studio_kontak_emergency: payload.kontakEmergency,
      x_studio_telepon_emergency: payload.teleponEmergency,
      x_studio_tanggal_checkin: payload.tanggalCheckin,
      x_studio_tanggal_checkout: payload.tanggalCheckout,
      x_studio_butuh_transport: payload.butuhTransport,
      x_studio_transport_moda: payload.butuhTransport ? payload.transportModa : false,
      x_studio_transport_arah: payload.butuhTransport ? payload.transportArah : false,
      x_studio_alamat_transport: payload.butuhTransport ? (payload.alamatTransport || false) : false,
      x_studio_catatan: payload.catatan || false,
      x_studio_setuju_tc: true,
      x_studio_status: 'Menunggu Konfirmasi',
    }]) as number;

    // 3. Create lines
    const createdLineIds: number[] = [];
    try {
      for (const pet of payload.pets) {
        const lineId = await odooExecuteKw(uid, 'x_booking_request_line', 'create', [{
          x_studio_booking_request: bookingId,
          x_studio_pet: pet.petId || false,
          x_studio_nama_pet_baru: pet.namaPetBaru || false,
          x_studio_jenis_pet_baru: pet.jenisPetBaru || false,
          x_studio_ras_baru: pet.rasBaru || false,
          x_studio_berat_baru: pet.beratBaru ? parseFloat(pet.beratBaru) : false,
          x_studio_bukti_vaksin: pet.vaccinePhotoBase64 || false,
          x_studio_tipe_kamar_req: pet.tipeKamarReq || false,
          x_studio_grooming_req: pet.groomingReq || false,
          x_studio_alacarte_req: [[6, 0, pet.alacarteIds]],
          x_studio_aktivitas: [[6, 0, pet.aktivitasIds]],
          x_studio_antiparasit_merk: pet.antiparasitMerk || false,
          x_studio_antiparasit_lainnya: pet.antiparasitLainnya || false,
          x_studio_makanan: pet.makanan || false,
          x_studio_alergi_makanan: pet.alergiMakanan || false,
          x_studio_instruksi_makan: pet.instruksiMakan || false,
          x_studio_sedang_pengobatan: pet.sedangPengobatan,
          x_studio_instruksi_obat: pet.instruksiObat || false,
          x_studio_sifat_manusia: pet.sifatManusia || false,
          x_studio_sifat_anabul_lain: pet.sifatAnabul || false,
          x_studio_catatan_pet: pet.catatanPet || false,
        }]) as number;
        createdLineIds.push(lineId);
      }
    } catch (lineErr) {
      if (createdLineIds.length > 0) await odooExecuteKw(uid, 'x_booking_request_line', 'unlink', [createdLineIds]).catch(() => {});
      await odooExecuteKw(uid, 'x_booking_request_hote', 'unlink', [[bookingId]]).catch(() => {});
      throw lineErr;
    }

    return NextResponse.json({
      success: true, bookingId, lineIds: createdLineIds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}