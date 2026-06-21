import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { owner, pets } = body;

    // Menampilkan kiriman data di logs console komputer/Vercel untuk pengecekan
    console.log("--- DATA MASUK DARI FORM ---");
    console.log("Data Owner:", owner);
    console.log("Daftar Pet:", pets);

    /* Sesuai Dokumentasi Teknis Furrytail Odoo Studio (Free Plan):
      Di sini backend Vercel bertugas menembak API XML-RPC milik Odoo.
      Langkah yang dijalankan secara otomatis nanti:
      1. Create Data Kontak Owner baru di model Odoo 'x_nama'
      2. Mendapatkan ID Owner dari Odoo
      3. Melakukan looping untuk membuat data Pet di model Odoo 'x_pets' 
         dengan menyertakan field ID Owner tadi ke field Relasi (Many2one).
    */

    // Mengembalikan jawaban sukses ke tampilan Web Front-end
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}