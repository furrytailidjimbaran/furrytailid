import { NextRequest, NextResponse } from 'next/server';

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;

// Koordinat pusat Furrytail (Jl. Raya Uluwatu, Jimbaran, Bali)
const FURRYTAIL_LAT = -8.7972729;
const FURRYTAIL_LNG = 115.1618883;
const RADIUS_METER = 100;

// ===== Helper: hitung jarak dua koordinat (Haversine formula) =====
function hitungJarak(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // radius bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // jarak dalam meter
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

// ===== POST /api/absensi/checkin =====
// Body: { uid, password, presensiId, lat, lng, action: 'checkin' | 'checkout' }
export async function POST(req: NextRequest) {
  try {
    if (!ODOO_URL || !ODOO_DB) {
      return NextResponse.json({ error: 'Konfigurasi server belum lengkap.' }, { status: 500 });
    }

    const { uid, password, presensiId, lat, lng, action } = await req.json();

    if (!uid || !password || !presensiId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    if (action !== 'checkin' && action !== 'checkout') {
      return NextResponse.json({ error: "Action harus 'checkin' atau 'checkout'." }, { status: 400 });
    }

    // 1. Validasi geofencing — hitung jarak ke Furrytail
    const jarak = hitungJarak(lat, lng, FURRYTAIL_LAT, FURRYTAIL_LNG);
    if (jarak > RADIUS_METER) {
      return NextResponse.json(
        {
          error: `Kamu berada ${Math.round(jarak)}m dari Furrytail. Check-in/out hanya bisa dilakukan dalam radius ${RADIUS_METER}m.`,
          jarak: Math.round(jarak),
          dalamRadius: false,
        },
        { status: 403 }
      );
    }

    const koordinat = `${lat.toFixed(7)}, ${lng.toFixed(7)}`;
    const serverActionId = action === 'checkin' ? 858 : 859;
    const fieldLokasi = action === 'checkin'
      ? 'x_studio_lokasi_check_in'
      : 'x_studio_lokasi_check_out';

    // 2. Trigger server action Check In (858) atau Check Out (859)
    await odooExecuteKw(uid, password, 'ir.actions.server', 'run', [[serverActionId]], {
      context: {
        active_id: presensiId,
        active_ids: [presensiId],
        active_model: 'x_presensi_staff',
      },
    });

    // 3. Write koordinat GPS ke field lokasi
    await odooExecuteKw(uid, password, 'x_presensi_staff', 'write', [
      [presensiId],
      { [fieldLokasi]: koordinat },
    ]);

    // 4. Baca record presensi terbaru untuk dikembalikan ke frontend
    const presensiTerbaru = await odooExecuteKw(
      uid, password, 'x_presensi_staff', 'read',
      [[presensiId], ['x_studio_status', 'x_studio_jam_check_in', 'x_studio_jam_check_out']]
    );

    return NextResponse.json({
      success: true,
      jarak: Math.round(jarak),
      dalamRadius: true,
      presensi: {
        id: presensiId,
        status: presensiTerbaru[0]?.x_studio_status,
        jamCheckIn: presensiTerbaru[0]?.x_studio_jam_check_in || null,
        jamCheckOut: presensiTerbaru[0]?.x_studio_jam_check_out || null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}