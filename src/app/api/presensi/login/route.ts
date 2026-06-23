import { NextRequest, NextResponse } from 'next/server';

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;

// ===== Helper: login staff dengan email + password mereka sendiri =====
async function odooLogin(email: string, password: string): Promise<number> {
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'common',
        method: 'login',
        args: [ODOO_DB, email, password],
      },
      id: 1,
    }),
  });

  const json = await res.json();
  if (json.error || !json.result) {
    throw new Error('Email atau password salah.');
  }
  return json.result as number; // uid
}

// ===== Helper: execute_kw =====
async function odooExecuteKw(
  uid: number,
  password: string,
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
) {
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [ODOO_DB, uid, password, model, method, args, kwargs],
      },
      id: Math.floor(Math.random() * 1000000),
    }),
  });

  const json = await res.json();
  if (json.error) {
    const message = json.error?.data?.message || json.error?.message || 'Unknown Odoo error';
    throw new Error(message);
  }
  return json.result;
}

// ===== POST /api/absensi/login =====
// Body: { email, password }
// Response: { uid, staffId, staffName, presensi: { id, status, jamCheckIn, jamCheckOut } | null }
export async function POST(req: NextRequest) {
  try {
    if (!ODOO_URL || !ODOO_DB) {
      return NextResponse.json({ error: 'Konfigurasi server belum lengkap.' }, { status: 500 });
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
    }

    // 1. Login dengan akun staff
    const uid = await odooLogin(email, password);

    // 2. Cari record x_staff yang terhubung ke user ini (match via relasi user atau nama)
    //    Kita cari x_staff yang aktif, lalu match ke uid lewat field res.users kalau ada,
    //    atau fallback: cari staff dengan nama yang sama dengan user yang login.
    //    Cara paling reliable: cari semua x_staff lalu ambil yang pertama match uid via
    //    read user info dulu.
    const userInfo = await odooExecuteKw(uid, password, 'res.users', 'read', [
      [uid],
      ['name', 'email'],
    ]);
    const userName = userInfo[0]?.name || '';

    // Cari record x_staff berdasarkan nama lengkap (x_studio_nama_lengkap)
    const staffRecords = await odooExecuteKw(
      uid, password, 'x_staff', 'search_read',
      [[['x_studio_nama_lengkap', '=', userName]]],
      { fields: ['id', 'x_studio_nama_lengkap'], limit: 1 }
    );

    if (!staffRecords || staffRecords.length === 0) {
      return NextResponse.json(
        { error: 'Akun ini tidak terhubung ke data staff Furrytail. Hubungi admin.' },
        { status: 403 }
      );
    }

    const staff = staffRecords[0];
    const staffId = staff.id;
    const staffName = staff.x_studio_nama_lengkap;

    // 3. Cari record presensi hari ini untuk staff ini
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Makassar', // WITA = UTC+8
    }); // format YYYY-MM-DD

    const presensiRecords = await odooExecuteKw(
      uid, password, 'x_presensi_staff', 'search_read',
      [[
        ['x_studio_staff', '=', staffId],
        ['x_studio_tanggal', '=', today],
      ]],
      {
        fields: [
          'id', 'x_name', 'x_studio_status',
          'x_studio_jam_check_in', 'x_studio_jam_check_out',
        ],
        limit: 1,
      }
    );

    const presensi = presensiRecords?.[0] || null;

    return NextResponse.json({
      uid,
      password, // dikembalikan supaya client bisa simpan di session state untuk call berikutnya
      staffId,
      staffName,
      presensi: presensi ? {
        id: presensi.id,
        name: presensi.x_name,
        status: presensi.x_studio_status,
        jamCheckIn: presensi.x_studio_jam_check_in || null,
        jamCheckOut: presensi.x_studio_jam_check_out || null,
      } : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}