'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Fredoka, Nunito } from 'next/font/google';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fredoka',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
});

// ===== Tipe data =====
interface PresensiData {
  id: number;
  name: string;
  status: string;
  jamCheckIn: string | null;
  jamCheckOut: string | null;
}

interface SessionData {
  uid: number;
  password: string;
  staffId: number;
  staffName: string;
  presensi: PresensiData | null;
}

// ===== Helper: format datetime UTC → WITA =====
function formatWITA(datetimeUtc: string | null): string {
  if (!datetimeUtc) return '—';
  // Odoo mengembalikan datetime format "YYYY-MM-DD HH:MM:SS" (spasi sebagai separator, UTC).
  // Browser kadang menginterpretasikan format spasi sebagai local time, bukan UTC.
  // Ganti spasi jadi 'T' dan tambahkan 'Z' supaya selalu diparse sebagai UTC.
  const normalized = datetimeUtc.replace(' ', 'T') + (datetimeUtc.includes('Z') ? '' : 'Z');
  const date = new Date(normalized);
  return date.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ===== Helper: warna & label status =====
function statusStyle(status: string): { bg: string; text: string; label: string } {
  // Nilai status ini harus PERSIS sama dengan selection options di Odoo x_presensi_staff
  switch (status) {
    case 'Tepat Waktu':
      return { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Tepat Waktu' };
    case 'Telat':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⚠️ Telat' };
    case 'Telat - Approved':
      return { bg: 'bg-blue-100', text: 'text-blue-800', label: '✅ Telat (Approved)' };
    case 'Tidak Hadir':
      return { bg: 'bg-red-100', text: 'text-red-800', label: '❌ Tidak Hadir' };
    case 'Libur':
      return { bg: 'bg-purple-100', text: 'text-purple-800', label: '🌴 Libur' };
    case 'Belum Check In': // nilai exact dari Odoo (spasi, bukan dash)
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: '🕐 Belum Check-in' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: `🕐 ${status}` };
  }
}

// ===== Komponen utama =====
export default function PresensiForm() {
  // State login
  const [email, setEmail] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // State session setelah login berhasil
  const [session, setSession] = useState<SessionData | null>(null);

  // State check-in/out
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // ===== Handle Login =====
  const handleLogin = async () => {
    if (!email || !passwordInput) {
      setLoginError('Email dan password wajib diisi.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/presensi/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: passwordInput }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSession(data);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login gagal.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ===== Handle Check In / Check Out =====
  const handleAction = async (action: 'checkin' | 'checkout') => {
    if (!session?.presensi) return;

    setActionLoading(true);
    setActionMessage('');
    setActionError('');

    // Capture GPS dulu
    const getPosition = (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      );

    try {
      setActionMessage('📍 Mengambil lokasi GPS...');
      const position = await getPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setActionMessage(action === 'checkin' ? '⏳ Memproses Check In...' : '⏳ Memproses Check Out...');

      const res = await fetch('/api/presensi/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: session.uid,
          password: session.password,
          presensiId: session.presensi.id,
          lat,
          lng,
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update state presensi dengan data terbaru dari Odoo
      setSession((prev) =>
        prev
          ? {
              ...prev,
              presensi: prev.presensi
                ? { ...prev.presensi, ...data.presensi }
                : null,
            }
          : null
      );

      setActionMessage(
        action === 'checkin'
          ? `✅ Check In berhasil! (${data.jarak}m dari Furrytail)`
          : `✅ Check Out berhasil! (${data.jarak}m dari Furrytail)`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan.';

      // Pesan khusus kalau GPS gagal (user tolak permission atau timeout)
      if (msg.includes('denied') || msg.includes('PERMISSION_DENIED')) {
        setActionError('❌ Akses lokasi ditolak. Izinkan akses lokasi di browser kamu, lalu coba lagi.');
      } else if (msg.includes('TIMEOUT') || msg.includes('timeout')) {
        setActionError('❌ GPS timeout. Pastikan kamu berada di luar ruangan atau koneksi GPS stabil, lalu coba lagi.');
      } else {
        setActionError(`❌ ${msg}`);
      }
      setActionMessage('');
    } finally {
      setActionLoading(false);
    }
  };

  // ===== Render: Halaman Login =====
  if (!session) {
    return (
      <div
        className={`${fredoka.variable} ${nunito.variable} min-h-screen flex items-center justify-center px-4 bg-[#FDF8F4]`}
        style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
      >
        <div className="w-full max-w-sm bg-[#FEFEF2] rounded-3xl shadow-xl border border-amber-100 p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-40 h-20 mb-3">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
            </div>
            <h1
              className="text-xl font-semibold text-[#5C3A21] uppercase tracking-wide text-center"
              style={{ fontFamily: 'var(--font-fredoka), sans-serif' }}
            >
              Presensi Staff
            </h1>
            <p className="text-xs text-[#8a6f5a] mt-1">Furrytail Pet Grooming & Dog Hotel</p>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email Odoo kamu"
              value={email}
              className="w-full p-3 rounded-xl border border-[#EEDCD0] text-sm"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <input
              type="password"
              placeholder="Password"
              value={passwordInput}
              className="w-full p-3 rounded-xl border border-[#EEDCD0] text-sm"
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />

            {loginError && (
              <p className="text-xs text-red-600 text-center">{loginError}</p>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full bg-[#5C3A21] text-white py-3 rounded-2xl font-semibold uppercase tracking-widest text-sm disabled:opacity-60"
              style={{ fontFamily: 'var(--font-fredoka), sans-serif' }}
            >
              {loginLoading ? 'Masuk...' : 'Masuk'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Render: Halaman Presensi =====
  const { staffName, presensi } = session;
  const status = presensi?.status ?? 'Belum Check In';
  const style = statusStyle(status);

  const bisaCheckIn = status === 'Belum Check In'; // nilai exact Odoo (spasi, bukan dash)
  const bisaCheckOut =
    status === 'Tepat Waktu' || status === 'Telat' || status === 'Telat - Approved';
  const sudahCheckOut = !!presensi?.jamCheckOut;

  const today = new Date().toLocaleDateString('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className={`${fredoka.variable} ${nunito.variable} min-h-screen flex items-center justify-center px-4 bg-[#FDF8F4]`}
      style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
    >
      <div className="w-full max-w-sm bg-[#FEFEF2] rounded-3xl shadow-xl border border-amber-100 p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-16 mb-2">
            <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <h1
            className="text-lg font-semibold text-[#5C3A21] uppercase tracking-wide text-center"
            style={{ fontFamily: 'var(--font-fredoka), sans-serif' }}
          >
            Presensi Staff
          </h1>
        </div>

        {/* Info staff & tanggal */}
        <div className="text-center">
          <p className="text-base font-bold text-[#5C3A21]">{staffName}</p>
          <p className="text-xs text-[#8a6f5a] mt-1">{today}</p>
        </div>

        {/* Status badge */}
        <div className={`rounded-2xl p-4 text-center ${style.bg}`}>
          <p className={`text-sm font-bold ${style.text}`}>{style.label}</p>
          {presensi?.jamCheckIn && (
            <p className="text-xs text-gray-500 mt-1">
              Check In: {formatWITA(presensi.jamCheckIn)}
            </p>
          )}
          {presensi?.jamCheckOut && (
            <p className="text-xs text-gray-500">
              Check Out: {formatWITA(presensi.jamCheckOut)}
            </p>
          )}
        </div>

        {/* Tombol Check In / Check Out */}
        {presensi === null && (
          <div className="bg-yellow-50 rounded-xl p-3 text-center">
            <p className="text-xs text-yellow-700">
              Record presensi hari ini belum dibuat. Hubungi admin — scheduled action belum jalan hari ini.
            </p>
          </div>
        )}

        {bisaCheckIn && !sudahCheckOut && (
          <button
            type="button"
            onClick={() => handleAction('checkin')}
            disabled={actionLoading}
            className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-base disabled:opacity-60"
            style={{ fontFamily: 'var(--font-fredoka), sans-serif' }}
          >
            {actionLoading ? '⏳ Memproses...' : '📍 Check In'}
          </button>
        )}

        {bisaCheckOut && !sudahCheckOut && (
          <button
            type="button"
            onClick={() => handleAction('checkout')}
            disabled={actionLoading}
            className="w-full bg-[#5C3A21] text-white py-4 rounded-2xl font-semibold text-base disabled:opacity-60"
            style={{ fontFamily: 'var(--font-fredoka), sans-serif' }}
          >
            {actionLoading ? '⏳ Memproses...' : '🏠 Check Out'}
          </button>
        )}

        {sudahCheckOut && (
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-green-700 font-semibold">
              Absensi hari ini sudah selesai. Sampai jumpa besok! 🐾
            </p>
          </div>
        )}

        {(status === 'Tidak Hadir' || status === 'Libur') && (
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">
              {status === 'Libur'
                ? 'Kamu sedang libur hari ini. Selamat beristirahat! 🌴'
                : 'Status kamu tercatat Tidak Hadir untuk hari ini.'}
            </p>
          </div>
        )}

        {/* Pesan aksi (sukses/error) */}
        {actionMessage && (
          <p className="text-xs text-green-700 text-center font-semibold">{actionMessage}</p>
        )}
        {actionError && (
          <p className="text-xs text-red-600 text-center">{actionError}</p>
        )}

        {/* Tombol logout */}
        <button
          type="button"
          onClick={() => {
            setSession(null);
            setEmail('');
            setPasswordInput('');
            setActionMessage('');
            setActionError('');
          }}
          className="w-full text-xs text-[#8a6f5a] underline text-center"
        >
          Keluar / Ganti Akun
        </button>
      </div>
    </div>
  );
}