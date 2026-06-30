'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Fredoka, Nunito } from 'next/font/google';

const fredoka = Fredoka({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-fredoka' });
const nunito  = Nunito({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-nunito' });

// ===== TIPE DATA =====
interface OwnerSearchResult { id: number; name: string; phone: string; }
interface PetResult { id: number; name: string; jenis: string; berat: number; ras: string; gender: string; kategoriBerat: string; }
interface ProductOption { id: number; name: string; harga: number; }
interface AktivitasOption { id: number; name: string; }

interface PetLine {
  petId: number | null; petLabel: string;
  namaPetBaru: string; jenisPetBaru: 'Anjing' | 'Kucing' | ''; rasBaru: string; beratBaru: string;
  vaccinePhoto: File | null; vaccinePhotoBase64: string | null;
  tipeKamarReq: 'Regular' | 'Large' | ''; groomingReq: string;
  alacarteIds: number[]; aktivitasIds: number[];
  antiparasitMerk: string; antiparasitLainnya: string;
  makanan: string; alergiMakanan: string; instruksiMakan: string;
  sedangPengobatan: boolean; instruksiObat: string;
  sifatManusia: string; sifatAnabul: string; catatanPet: string;
}

const emptyPet = (): PetLine => ({
  petId: null, petLabel: '',
  namaPetBaru: '', jenisPetBaru: '', rasBaru: '', beratBaru: '',
  vaccinePhoto: null, vaccinePhotoBase64: null,
  tipeKamarReq: '', groomingReq: 'Tidak',
  alacarteIds: [], aktivitasIds: [],
  antiparasitMerk: '', antiparasitLainnya: '',
  makanan: '', alergiMakanan: '', instruksiMakan: '',
  sedangPengobatan: false, instruksiObat: '', sifatManusia: '', sifatAnabul: '', catatanPet: '',
});

const PEAK_MONTHS = [12, 1];

function isPeakSeason(checkin: string): boolean {
  if (!checkin) return false;
  return PEAK_MONTHS.includes(new Date(checkin).getMonth() + 1);
}

function countNights(checkin: string, checkout: string): number {
  if (!checkin || !checkout) return 0;
  return Math.max(0, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000));
}

const MAX_PHOTO_SIZE = 3 * 1024 * 1024;
const GROOMING_OPTIONS = ['Tidak', 'Classic Grooming', 'Luxury Grooming', 'Classic Spa', 'Luxury Spa'];
const ANTIPARASIT_OPTIONS = ['Revolution', 'NexGard', 'Frontline', 'Bravecto', 'Simparica', 'Lainnya'];
// Value yang dikirim ke Odoo selalu Bahasa Indonesia (selection options di Odoo berbahasa Indonesia)
const SIFAT_VALUES = ['Ramah', 'Takut', 'Galak'];
const SIFAT_LABELS_ID = ['Ramah', 'Takut', 'Galak'];
const SIFAT_LABELS_EN = ['Friendly', 'Fearful', 'Aggressive'];
const ALERGI_VALUES = ['Tidak Ada', 'Ayam', 'Kambing', 'Sapi', 'Telur', 'Lainnya'];
const ALERGI_LABELS_ID = ['Tidak Ada', 'Ayam', 'Kambing', 'Sapi', 'Telur', 'Lainnya'];
const ALERGI_LABELS_EN = ['None', 'Chicken', 'Lamb', 'Beef', 'Egg', 'Other'];

// ===== DICTIONARY BILINGUAL =====
const dict = {
  id: {
    title: '🏨 Booking Pet Hotel',
    subtitle: 'Furrytail Pet Grooming Salon & Dog Hotel',
    steps: ['T&C', 'Pemilik', 'Tanggal', 'Hewan', 'Konfirmasi'],
    tcTitle: 'Peraturan & Syarat Ketentuan',
    tcA: 'A. Persyaratan Check-in',
    tcA1: 'Hanya menerima hewan peliharaan berusia di atas 2 bulan dengan vaksinasi lengkap. Bukti vaksin wajib dibawa saat check-in.',
    tcA2: 'Hanya menerima hewan yang sehat. Hewan dengan kondisi medis serius atau penyakit menular tidak dapat diterima.',
    tcA3a: 'Jika hewan memiliki kondisi kesehatan tertentu, ',
    tcA3b: 'wajib',
    tcA3c: ' diinformasikan kepada kami. Ketidakterbukaan menjadi tanggung jawab sepenuhnya pemilik.',
    tcA4: 'Vaksin kennel cough/bordetella sangat disarankan. Furrytail tidak bertanggung jawab atas penularan kennel cough selama menginap.',
    tcA5a: 'Obat anti-parasit (anti-kutu dan caplak) wajib diberikan minimal ',
    tcA5b: '1 minggu sebelum check-in',
    tcA5c: '. Hewan dengan kutu atau caplak tidak dapat diterima.',
    tcA6: 'Anjing/kucing betina yang sedang dalam siklus birahi wajib menggunakan pampers/alas lantai (tersedia di toko kami).',
    tcA7: 'Hewan yang sedang hamil atau akan melahirkan tidak dapat diterima.',
    tcB: 'B. Jam Operasional Hotel',
    tcBHours: 'Check-in & Check-out: 08:30 – 19:00 WITA',
    tcBNote: 'Early check-in (sebelum 08:30) dan late check-out (setelah 19:00) dikenakan biaya tambahan.',
    tcC: 'C. Tanggung Jawab & Situasi Darurat',
    tcC1: 'Dalam situasi darurat medis, Furrytail akan segera menghubungi kontak emergency dan membawa hewan ke dokter hewan. Seluruh biaya perawatan menjadi tanggung jawab pemilik, kecuali disebabkan langsung oleh kelalaian staf Furrytail.',
    tcC2: 'Furrytail tidak bertanggung jawab atas kerusakan atau kehilangan barang bawaan hewan (mainan, selimut, aksesoris, dll).',
    tcC3: 'Pemilik wajib menyediakan makanan dan snack hewan sendiri.',
    tcD: 'D. Ketentuan Pembayaran & DP',
    tcD1a: 'Musim sibuk', tcD1b: ' (Desember, Tahun Baru, Nyepi, Idul Fitri): DP 50% dari total biaya menginap wajib dibayarkan saat konfirmasi booking.',
    tcD2a: 'Musim reguler, menginap lebih dari 3 malam:', tcD2b: ' DP Rp 100.000 wajib dibayarkan saat konfirmasi booking.',
    tcD3a: 'Musim reguler, menginap 3 malam atau kurang:', tcD3b: ' Tidak ada DP.',
    tcD4: 'Pelunasan wajib dilakukan saat hari check-in.',
    tcD5: 'Metode pembayaran DP: Transfer Bank. Di toko: Tunai, Debit/Kredit, QRIS.',
    tcE: 'E. Kebijakan Pembatalan',
    tcE1: 'Lebih dari 7 hari sebelum check-in: DP dikembalikan penuh.',
    tcE2: '3–7 hari sebelum check-in: DP dikembalikan 50%.',
    tcE3: 'Kurang dari 3 hari sebelum check-in: DP hangus.',
    tcE4: 'No-show tanpa konfirmasi: DP hangus.',
    tcAgree: 'Saya telah membaca dan menyetujui seluruh peraturan dan syarat ketentuan Furrytail Pet Hotel.',
    tcError: 'Anda harus menyetujui syarat & ketentuan untuk melanjutkan.',
    wa: 'Pertanyaan? WhatsApp',
    ownerTitle: 'Data Pemilik',
    modeBaru: 'Customer Baru', modeLama: 'Customer Lama',
    searchPH: 'Ketik nama atau nomor telepon...', searching: 'Mencari...', notFound: 'Tidak ditemukan.',
    selectedOwner: 'Pemilik terpilih', change: 'Ganti',
    namaLabel: 'Nama Lengkap *', namaPH: 'Nama lengkap pemilik',
    telLabel: 'No. WhatsApp / Telepon *', telPH: 'Nomor telepon',
    emailLabel: 'Email', emailPH: 'email@example.com',
    igLabel: 'Instagram', igPH: '@username',
    alamatLabel: 'Alamat Rumah', alamatPH: 'Alamat lengkap',
    emergencyTitle: '🚨 Kontak Emergency (Wajib)',
    emergencyNama: 'Nama Kontak Emergency *', emergencyNamaPH: 'Nama kontak darurat',
    emergencyTel: 'Nomor Telepon Emergency *', emergencyTelPH: 'Nomor telepon darurat',
    errOwnerRequired: 'Silakan pilih pemilik yang sudah terdaftar.',
    errNamaTel: 'Nama dan nomor telepon wajib diisi.',
    errEmergency: 'Kontak emergency wajib diisi.',
    dateTitle: 'Tanggal Menginap & Transport',
    checkinLabel: 'Tanggal Check-in *', checkoutLabel: 'Tanggal Check-out *',
    nightsUnit: 'malam', totalWord: 'Total',
    peakMsg: '⚠️ Musim Sibuk — DP 50% dari total biaya menginap wajib dibayarkan saat konfirmasi.',
    longStayMsg: 'ℹ️ Menginap lebih dari 3 malam — DP Rp 100.000 wajib dibayarkan saat konfirmasi.',
    noDPMsg: '✅ Tidak ada DP yang dibutuhkan untuk periode ini.',
    checkHours: 'Jam check-in/out: 08:30 – 19:00 WITA',
    transportToggle: 'Butuh layanan transport?',
    transportModa: 'Moda Transport *', transportArah: 'Arah Transport *',
    transportAlamat: 'Alamat Pick-up / Drop-off', transportAlamatPH: 'Alamat lengkap',
    pilihPH: '— Pilih —',
    mobil: 'Mobil', motor: 'Motor',
    pickupOnly: 'Pick-up Only (antar ke Furrytail)',
    dropoffOnly: 'Drop-off Only (jemput dari Furrytail)',
    bothWays: 'Pick-up & Drop-off (antar & jemput)',
    catatanLabel: 'Catatan Tambahan', catatanPH: 'Ada permintaan khusus atau informasi lain?',
    errDates: 'Tanggal check-in dan check-out wajib diisi.',
    errTransport: 'Moda dan arah transport wajib dipilih.',
    petTitle: 'Informasi Hewan', addPet: '+ Tambah Hewan',
    petNum: 'Hewan', remove: 'Hapus',
    selectPet: 'Pilih Hewan *', selectPetPH: '— Pilih Hewan —',
    namaPetLabel: 'Nama Hewan *', namaPetPH: 'Nama hewan',
    jenisLabel: 'Jenis *', selectPH: '— Pilih —',
    anjing: 'Anjing', kucing: 'Kucing',
    rasLabel: 'Ras', rasPH: 'Ras hewan', beratLabel: 'Berat (kg)',
    kamarLabel: 'Tipe Kamar yang Diinginkan',
    kamarInfo: '1 kamar: 1 anjing besar / 2 anjing kecil / 3 anjing mini',
    groomingLabel: 'Layanan Grooming (opsional)',
    alacarteLabel: 'Layanan À La Carte (opsional, boleh pilih beberapa)',
    aktivitasLabel: 'Aktivitas (opsional, boleh pilih beberapa)',
    healthTitle: '🏥 Info Kesehatan',
    antiparasitLabel: 'Merk Obat Anti-parasit *', antiparasitLainPH: 'Sebutkan merk...',
    makananLabel: 'Makanan yang Dimakan *', makananPH: 'Nama makanan, merk, dll',
    alergiLabel: 'Alergi Makanan',
    instruksiLabel: 'Instruksi Makan *', instruksiPH: 'Berapa kali sehari, porsi, dll',
    obatToggle: 'Sedang dalam pengobatan / konsumsi suplemen?',
    obatPH: 'Nama obat/suplemen, dosis, frekuensi...',
    sifatManusia: 'Sifat ke Manusia', sifatAnabul: 'Sifat ke Hewan Lain',
    vaksinLabel: 'Bukti Vaksin (maks. 3MB)',
    catatanPetLabel: 'Catatan Khusus', catatanPetPH: 'Info tambahan tentang hewan ini',
    errPetSelect: 'Pilih hewan untuk Hewan',
    errPetName: 'Nama hewan',
    errAntiparasit: 'Merk anti-parasit Hewan',
    errMakanan: 'Informasi makanan Hewan',
    errInstruksi: 'Instruksi makan Hewan',
    errWajib: 'wajib diisi.',
    errPilih: 'wajib dipilih.',
    summaryTitle: 'Ringkasan Booking',
    ownerSection: '👤 Pemilik', dateSection: '📅 Tanggal',
    checkinLbl: 'Check-in', checkoutLbl: 'Check-out', totalLbl: 'Total',
    transportLbl: 'Transport', petSection: '🐾 Hewan',
    kamarLbl: 'Kamar', groomingLbl: 'Grooming',
    namaWord: 'Nama', emailWord: 'Email', emergencyWord: 'Kontak Emergency', hewanWord: 'Hewan',
    infoDP: 'Setelah booking request dikirim, tim Furrytail akan menghubungi Anda via WhatsApp dalam waktu 1x24 jam untuk konfirmasi dan info pembayaran DP (jika ada).',
    submitBtn: 'Kirim Booking Request 🐾', submitting: 'Mengirim...',
    successTitle: 'Booking Request Terkirim!',
    successMessage: 'Booking request berhasil dikirim. Tim kami akan menghubungi Anda via WhatsApp untuk konfirmasi.',
    next: 'Lanjut →', back: '← Kembali',
    loading: 'Memuat data layanan...',
    photoTooBig: 'Ukuran foto maksimal 3MB.',
  },
  en: {
    title: '🏨 Pet Hotel Booking',
    subtitle: 'Furrytail Pet Grooming Salon & Dog Hotel',
    steps: ['T&C', 'Owner', 'Dates', 'Pets', 'Confirm'],
    tcTitle: 'Rules & Terms and Conditions',
    tcA: 'A. Check-in Requirements',
    tcA1: 'Only accepting pets older than 2 months with complete vaccination. Vaccine proof is required at check-in.',
    tcA2: 'Only accepting healthy pets. Pets with serious medical conditions or contagious diseases cannot be accepted.',
    tcA3a: 'If your pet has any health condition, you ',
    tcA3b: 'must',
    tcA3c: ' inform us. Non-disclosure is entirely the owner\u2019s responsibility.',
    tcA4: 'Kennel cough/bordetella vaccine is strongly recommended. Furrytail is not responsible for kennel cough transmission during the stay.',
    tcA5a: 'Anti-parasite medicine (flea and tick) must be administered at least ',
    tcA5b: '1 week before check-in',
    tcA5c: '. Pets with fleas or ticks cannot be accepted.',
    tcA6: 'Female dogs/cats in heat must use diapers/floor pads (available at our store).',
    tcA7: 'Pregnant pets or pets about to give birth cannot be accepted.',
    tcB: 'B. Hotel Operating Hours',
    tcBHours: 'Check-in & Check-out: 08:30 – 19:00 WITA',
    tcBNote: 'Early check-in (before 08:30) and late check-out (after 19:00) incur additional charges.',
    tcC: 'C. Responsibility & Emergency',
    tcC1: 'In medical emergencies, Furrytail will immediately contact the emergency contact and take the pet to a vet. All medical costs are the owner\u2019s responsibility, unless directly caused by Furrytail staff negligence.',
    tcC2: 'Furrytail is not responsible for damage or loss of pet belongings (toys, blankets, accessories, etc).',
    tcC3: 'Owners must provide their own pet food and snacks.',
    tcD: 'D. Payment & Deposit Policy',
    tcD1a: 'Peak season', tcD1b: ' (December, New Year, Nyepi, Eid): 50% deposit of total stay cost required at booking confirmation.',
    tcD2a: 'Regular season, stay longer than 3 nights:', tcD2b: ' Rp 100,000 deposit required at booking confirmation.',
    tcD3a: 'Regular season, 3 nights or less:', tcD3b: ' No deposit required.',
    tcD4: 'Full payment required on check-in day.',
    tcD5: 'Deposit payment: Bank Transfer. In-store: Cash, Debit/Credit, QRIS.',
    tcE: 'E. Cancellation Policy',
    tcE1: 'More than 7 days before check-in: full deposit refund.',
    tcE2: '3–7 days before check-in: 50% deposit refund.',
    tcE3: 'Less than 3 days before check-in: deposit forfeited.',
    tcE4: 'No-show without notice: deposit forfeited.',
    tcAgree: 'I have read and agree to all rules and terms & conditions of Furrytail Pet Hotel.',
    tcError: 'You must agree to the terms & conditions to continue.',
    wa: 'Questions? WhatsApp',
    ownerTitle: 'Owner Information',
    modeBaru: 'New Customer', modeLama: 'Returning Customer',
    searchPH: 'Type name or phone number...', searching: 'Searching...', notFound: 'Not found.',
    selectedOwner: 'Selected owner', change: 'Change',
    namaLabel: 'Full Name *', namaPH: 'Owner full name',
    telLabel: 'WhatsApp / Phone *', telPH: 'Phone number',
    emailLabel: 'Email', emailPH: 'email@example.com',
    igLabel: 'Instagram', igPH: '@username',
    alamatLabel: 'Home Address', alamatPH: 'Full address',
    emergencyTitle: '🚨 Emergency Contact (Required)',
    emergencyNama: 'Emergency Contact Name *', emergencyNamaPH: 'Emergency contact name',
    emergencyTel: 'Emergency Phone Number *', emergencyTelPH: 'Emergency phone number',
    errOwnerRequired: 'Please select a registered owner.',
    errNamaTel: 'Name and phone number are required.',
    errEmergency: 'Emergency contact is required.',
    dateTitle: 'Stay Dates & Transport',
    checkinLabel: 'Check-in Date *', checkoutLabel: 'Check-out Date *',
    nightsUnit: 'nights', totalWord: 'Total',
    peakMsg: '⚠️ Peak Season — 50% deposit of total stay cost required at booking confirmation.',
    longStayMsg: 'ℹ️ Stay longer than 3 nights — Rp 100,000 deposit required at booking confirmation.',
    noDPMsg: '✅ No deposit required for this period.',
    checkHours: 'Check-in/out hours: 08:30 – 19:00 WITA',
    transportToggle: 'Need transport service?',
    transportModa: 'Transport Mode *', transportArah: 'Transport Direction *',
    transportAlamat: 'Pick-up / Drop-off Address', transportAlamatPH: 'Full address',
    pilihPH: '— Select —',
    mobil: 'Car', motor: 'Motorbike',
    pickupOnly: 'Pick-up Only (to Furrytail)',
    dropoffOnly: 'Drop-off Only (from Furrytail)',
    bothWays: 'Pick-up & Drop-off (both ways)',
    catatanLabel: 'Additional Notes', catatanPH: 'Any special requests or other information?',
    errDates: 'Check-in and check-out dates are required.',
    errTransport: 'Transport mode and direction are required.',
    petTitle: 'Pet Information', addPet: '+ Add Pet',
    petNum: 'Pet', remove: 'Remove',
    selectPet: 'Select Pet *', selectPetPH: '— Select Pet —',
    namaPetLabel: 'Pet Name *', namaPetPH: 'Pet name',
    jenisLabel: 'Type *', selectPH: '— Select —',
    anjing: 'Dog', kucing: 'Cat',
    rasLabel: 'Breed', rasPH: 'Pet breed', beratLabel: 'Weight (kg)',
    kamarLabel: 'Preferred Room Type',
    kamarInfo: '1 room fits: 1 large dog / 2 small dogs / 3 mini dogs',
    groomingLabel: 'Grooming Service (optional)',
    alacarteLabel: 'À La Carte Services (optional, multiple allowed)',
    aktivitasLabel: 'Activities (optional, multiple allowed)',
    healthTitle: '🏥 Health Information',
    antiparasitLabel: 'Anti-parasite Medicine Brand *', antiparasitLainPH: 'Specify brand...',
    makananLabel: 'Food / Diet *', makananPH: 'Food name, brand, etc.',
    alergiLabel: 'Food Allergies',
    instruksiLabel: 'Feeding Instructions *', instruksiPH: 'How many times per day, portion size, etc.',
    obatToggle: 'Currently on medication or supplements?',
    obatPH: 'Medicine/supplement name, dosage, frequency...',
    sifatManusia: 'Behavior with People', sifatAnabul: 'Behavior with Other Pets',
    vaksinLabel: 'Vaccine Proof (max. 3MB)',
    catatanPetLabel: 'Special Notes', catatanPetPH: 'Additional info about this pet',
    errPetSelect: 'Select pet for Pet',
    errPetName: 'Pet name',
    errAntiparasit: 'Anti-parasite brand for Pet',
    errMakanan: 'Food information for Pet',
    errInstruksi: 'Feeding instructions for Pet',
    errWajib: 'is required.',
    errPilih: 'must be selected.',
    summaryTitle: 'Booking Summary',
    ownerSection: '👤 Owner', dateSection: '📅 Dates',
    checkinLbl: 'Check-in', checkoutLbl: 'Check-out', totalLbl: 'Total',
    transportLbl: 'Transport', petSection: '🐾 Pet',
    kamarLbl: 'Room', groomingLbl: 'Grooming',
    namaWord: 'Name', emailWord: 'Email', emergencyWord: 'Emergency Contact', hewanWord: 'Pet',
    infoDP: 'After your booking request is submitted, the Furrytail team will contact you via WhatsApp within 24 hours for confirmation and deposit payment info (if applicable).',
    submitBtn: 'Submit Booking Request 🐾', submitting: 'Submitting...',
    successTitle: 'Booking Request Sent!',
    successMessage: 'Your booking request has been sent. Our team will contact you via WhatsApp for confirmation.',
    next: 'Next →', back: '← Back',
    loading: 'Loading service data...',
    photoTooBig: 'Maximum photo size is 3MB.',
  },
} as const;

export default function HotelBookingForm() {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState<'id' | 'en'>('id');
  const t = dict[lang];
  const sifatLabels = lang === 'id' ? SIFAT_LABELS_ID : SIFAT_LABELS_EN;
  const alergiLabels = lang === 'id' ? ALERGI_LABELS_ID : ALERGI_LABELS_EN;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [setujuTc, setSetujuTc] = useState(false);

  const [customerMode, setCustomerMode] = useState<'baru' | 'lama'>('baru');
  const [selectedOwner, setSelectedOwner] = useState<OwnerSearchResult | null>(null);
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerResults, setOwnerResults] = useState<OwnerSearchResult[]>([]);
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [namaBaru, setNamaBaru] = useState('');
  const [teleponBaru, setTeleponBaru] = useState('');
  const [emailBaru, setEmailBaru] = useState('');
  const [instagramBaru, setInstagramBaru] = useState('');
  const [alamatBaru, setAlamatBaru] = useState('');
  const [kontakEmergency, setKontakEmergency] = useState('');
  const [teleponEmergency, setTeleponEmergency] = useState('');

  const [tanggalCheckin, setTanggalCheckin] = useState('');
  const [tanggalCheckout, setTanggalCheckout] = useState('');
  const [butuhTransport, setButuhTransport] = useState(false);
  const [transportModa, setTransportModa] = useState('');
  const [transportArah, setTransportArah] = useState('');
  const [alamatTransport, setAlamatTransport] = useState('');
  const [catatan, setCatatan] = useState('');

  const [pets, setPets] = useState<PetLine[]>([emptyPet()]);
  const [ownerPets, setOwnerPets] = useState<PetResult[]>([]);
  const [alacarteOptions, setAlacarteOptions] = useState<ProductOption[]>([]);
  const [aktivitasOptions, setAktivitasOptions] = useState<AktivitasOption[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);

  useEffect(() => {
    if (step !== 3) return;
    setMasterLoading(true);
    Promise.all([fetch('/api/hotel-alacarte'), fetch('/api/hotel-aktivitas')])
      .then(([a, b]) => Promise.all([a.json(), b.json()]))
      .then(([ala, akt]) => { setAlacarteOptions(ala.results || []); setAktivitasOptions(akt.results || []); })
      .catch(() => {})
      .finally(() => setMasterLoading(false));
  }, [step]);

  useEffect(() => {
    if (!selectedOwner) { setOwnerPets([]); return; }
    fetch(`/api/hotel-pets?ownerId=${selectedOwner.id}`)
      .then((r) => r.json()).then((d) => setOwnerPets(d.results || [])).catch(() => setOwnerPets([]));
  }, [selectedOwner]);

  useEffect(() => {
    if (customerMode !== 'lama' || selectedOwner) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = ownerQuery.trim();
    if (q.length < 2) { setOwnerResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setOwnerSearchLoading(true);
      try {
        const res = await fetch(`/api/owners/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setOwnerResults(data.results || []);
      } catch { setOwnerResults([]); } finally { setOwnerSearchLoading(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [ownerQuery, customerMode, selectedOwner]);

  const updatePet = (idx: number, updates: Partial<PetLine>) => {
    setPets((prev) => prev.map((p, i) => i === idx ? { ...p, ...updates } : p));
  };

  const handlePhotoChange = async (idx: number, file: File | null) => {
    if (!file) { updatePet(idx, { vaccinePhoto: null, vaccinePhotoBase64: null }); return; }
    if (file.size > MAX_PHOTO_SIZE) { setError(t.photoTooBig); return; }
    setError('');
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
      reader.onerror = () => reject();
      reader.readAsDataURL(file);
    });
    updatePet(idx, { vaccinePhoto: file, vaccinePhotoBase64: base64 });
  };

  const toggleMulti = (idx: number, field: 'alacarteIds' | 'aktivitasIds', id: number) => {
    setPets((prev) => prev.map((p, i) => {
      if (i !== idx) return p;
      const arr = p[field];
      return { ...p, [field]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] };
    }));
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const payload = {
        ownerId: selectedOwner?.id ?? null,
        isNewCustomer: customerMode === 'baru',
        namaBaru, teleponBaru, emailBaru, instagramBaru, alamatBaru,
        kontakEmergency, teleponEmergency,
        tanggalCheckin, tanggalCheckout,
        butuhTransport, transportModa, transportArah, alamatTransport, catatan,
        setujuTc: true,
        pets: pets.map((p) => ({
          petId: p.petId, namaPetBaru: p.namaPetBaru, jenisPetBaru: p.jenisPetBaru,
          rasBaru: p.rasBaru, beratBaru: p.beratBaru, vaccinePhotoBase64: p.vaccinePhotoBase64,
          tipeKamarReq: p.tipeKamarReq, groomingReq: p.groomingReq,
          alacarteIds: p.alacarteIds, aktivitasIds: p.aktivitasIds,
          antiparasitMerk: p.antiparasitMerk, antiparasitLainnya: p.antiparasitLainnya,
          makanan: p.makanan, alergiMakanan: p.alergiMakanan, instruksiMakan: p.instruksiMakan,
          sedangPengobatan: p.sedangPengobatan, instruksiObat: p.instruksiObat,
          sifatManusia: p.sifatManusia, sifatAnabul: p.sifatAnabul, catatanPet: p.catatanPet,
        })),
      };
      const res = await fetch('/api/hotel-booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(t.successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally { setLoading(false); }
  };

  const inputCls = 'w-full p-3 rounded-xl border border-[#EEDCD0] text-sm bg-white';
  const selectCls = 'w-full p-3 rounded-xl border border-[#EEDCD0] text-sm bg-white';
  const labelCls = 'text-xs font-semibold text-[#5C3A21] block mb-1';
  const sectionTitle = (title: string) => (
    <p className="text-sm font-bold text-[#5C3A21] mb-3 uppercase tracking-wide"
       style={{ fontFamily: 'var(--font-fredoka), sans-serif' }}>{title}</p>
  );
  const btnPrimary = (text: string, onClick: () => void, disabled = false) => (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-full bg-[#5C3A21] text-white py-4 rounded-2xl font-semibold uppercase tracking-widest text-sm disabled:opacity-60"
      style={{ fontFamily: 'var(--font-fredoka), sans-serif' }}>{text}</button>
  );
  const btnSecondary = (text: string, onClick: () => void) => (
    <button type="button" onClick={onClick}
      className="w-full border-2 border-[#5C3A21] text-[#5C3A21] py-3 rounded-2xl font-semibold text-sm">{text}</button>
  );

  const nights = countNights(tanggalCheckin, tanggalCheckout);
  const isPeak = isPeakSeason(tanggalCheckin);
  const isLongStay = nights > 3 && !isPeak;

  if (success) {
    return (
      <div className={`${fredoka.variable} ${nunito.variable} min-h-screen flex items-center justify-center px-4 bg-[#FDF8F4]`}
           style={{ fontFamily: 'var(--font-nunito), sans-serif' }}>
        <div className="max-w-sm w-full bg-[#FEFEF2] rounded-3xl shadow-xl border border-amber-100 p-8 text-center space-y-4">
          <div className="relative w-32 h-16 mx-auto"><Image src="/logo.png" alt="Logo" fill className="object-contain" /></div>
          <div className="text-4xl">🐾</div>
          <p className="text-lg font-bold text-[#5C3A21]" style={{ fontFamily: 'var(--font-fredoka), sans-serif' }}>{t.successTitle}</p>
          <div className="bg-green-50 rounded-xl p-4"><p className="text-sm text-green-700">{success}</p></div>
          <p className="text-xs text-[#8a6f5a]">{t.wa}: <strong>+62813-8888-6476</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${fredoka.variable} ${nunito.variable} min-h-screen py-8 px-4 bg-[#FDF8F4]`}
         style={{ fontFamily: 'var(--font-nunito), sans-serif',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='56' height='56' viewBox='0 0 56 56' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%235C3A21' fill-opacity='0.07' transform='rotate(-18 28 28)'%3E%3Cellipse cx='28' cy='36' rx='10' ry='8.5'/%3E%3Cellipse cx='15' cy='23' rx='4.6' ry='6' transform='rotate(-20 15 23)'/%3E%3Cellipse cx='24' cy='15' rx='4.6' ry='6' transform='rotate(-7 24 15)'/%3E%3Cellipse cx='34' cy='15' rx='4.6' ry='6' transform='rotate(7 34 15)'/%3E%3Cellipse cx='42' cy='23' rx='4.6' ry='6' transform='rotate(20 42 23)'/%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: '90px 90px' }}>

      {/* Toggle Bahasa */}
      <div className="fixed top-4 right-4 z-50 bg-white p-1 rounded-full shadow-md flex gap-1">
        <button type="button" onClick={() => setLang('id')}
          className={`px-3 py-1 rounded-full text-xs font-bold ${lang === 'id' ? 'bg-[#5C3A21] text-white' : ''}`}>🇮🇩 ID</button>
        <button type="button" onClick={() => setLang('en')}
          className={`px-3 py-1 rounded-full text-xs font-bold ${lang === 'en' ? 'bg-[#5C3A21] text-white' : ''}`}>🇬🇧 EN</button>
      </div>

      <div className="max-w-2xl mx-auto bg-[#FEFEF2] rounded-3xl shadow-xl border border-amber-100 p-6 md:p-8">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="relative w-40 h-20 mx-auto mb-3"><Image src="/logo.png" alt="Logo" fill className="object-contain" priority /></div>
          <h1 className="text-xl font-bold text-[#5C3A21] uppercase tracking-wide" style={{ fontFamily: 'var(--font-fredoka), sans-serif' }}>{t.title}</h1>
          <p className="text-xs text-[#8a6f5a] mt-1">{t.subtitle}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {t.steps.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-[#5C3A21] text-white' : 'bg-[#EEDCD0] text-[#8a6f5a]'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < 4 && <div className={`h-0.5 w-4 ${i < step ? 'bg-[#5C3A21]' : 'bg-[#EEDCD0]'}`} />}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"><p className="text-xs text-red-600">{error}</p></div>}

        {/* ===== STEP 0: T&C (fully bilingual) ===== */}
        {step === 0 && (
          <div className="space-y-4">
            {sectionTitle(t.tcTitle)}
            <div className="bg-[#FAF3EC] rounded-2xl p-4 space-y-3 max-h-96 overflow-y-auto text-xs text-[#333] leading-5">
              <p className="font-bold text-[#5C3A21]">{t.tcA}</p>
              <p>1. {t.tcA1}</p>
              <p>2. {t.tcA2}</p>
              <p>3. {t.tcA3a}<strong>{t.tcA3b}</strong>{t.tcA3c}</p>
              <p>4. {t.tcA4}</p>
              <p>5. {t.tcA5a}<strong>{t.tcA5b}</strong>{t.tcA5c}</p>
              <p>6. {t.tcA6}</p>
              <p>7. {t.tcA7}</p>

              <p className="font-bold text-[#5C3A21] pt-2">{t.tcB}</p>
              <p>• <strong>{t.tcBHours}</strong></p>
              <p>• {t.tcBNote}</p>

              <p className="font-bold text-[#5C3A21] pt-2">{t.tcC}</p>
              <p>1. {t.tcC1}</p>
              <p>2. {t.tcC2}</p>
              <p>3. {t.tcC3}</p>

              <p className="font-bold text-[#5C3A21] pt-2">{t.tcD}</p>
              <p>• <strong>{t.tcD1a}</strong>{t.tcD1b}</p>
              <p>• <strong>{t.tcD2a}</strong>{t.tcD2b}</p>
              <p>• <strong>{t.tcD3a}</strong>{t.tcD3b}</p>
              <p>• {t.tcD4}</p>
              <p>• {t.tcD5}</p>

              <p className="font-bold text-[#5C3A21] pt-2">{t.tcE}</p>
              <p>• {t.tcE1}</p>
              <p>• {t.tcE2}</p>
              <p>• {t.tcE3}</p>
              <p>• {t.tcE4}</p>

              <p className="text-center text-[#8a6f5a] pt-2">{t.wa}: <strong>+62813-8888-6476</strong></p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={setujuTc} onChange={(e) => setSetujuTc(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#5C3A21]" />
              <span className="text-sm text-[#333]">{t.tcAgree}</span>
            </label>
            {btnPrimary(t.next, () => { if (!setujuTc) { setError(t.tcError); return; } setError(''); setStep(1); })}
          </div>
        )}

        {/* ===== STEP 1: OWNER ===== */}
        {step === 1 && (
          <div className="space-y-4">
            {sectionTitle(t.ownerTitle)}
            <div className="flex gap-3">
              {(['baru', 'lama'] as const).map((mode) => (
                <button key={mode} type="button"
                  onClick={() => { setCustomerMode(mode); setSelectedOwner(null); setOwnerQuery(''); setOwnerResults([]); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 ${customerMode === mode ? 'bg-[#5C3A21] text-white border-[#5C3A21]' : 'bg-white text-[#5C3A21] border-[#EEDCD0]'}`}>
                  {mode === 'baru' ? t.modeBaru : t.modeLama}
                </button>
              ))}
            </div>

            {customerMode === 'lama' && (
              <div>
                {selectedOwner ? (
                  <div className="flex items-center justify-between bg-white border border-[#EEDCD0] rounded-xl p-3">
                    <div>
                      <p className="text-xs text-[#8a6f5a]">{t.selectedOwner}</p>
                      <p className="text-sm font-semibold text-[#5C3A21]">{selectedOwner.name} <span className="font-normal text-[#8a6f5a]">({selectedOwner.phone})</span></p>
                    </div>
                    <button type="button" onClick={() => { setSelectedOwner(null); setOwnerQuery(''); setOwnerPets([]); }}
                      className="text-xs text-red-600 underline ml-3">{t.change}</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input type="text" placeholder={t.searchPH} value={ownerQuery} onChange={(e) => setOwnerQuery(e.target.value)} className={inputCls} />
                    {ownerSearchLoading && <p className="text-xs text-[#8a6f5a] mt-1">{t.searching}</p>}
                    {!ownerSearchLoading && ownerQuery.trim().length >= 2 && ownerResults.length === 0 && <p className="text-xs text-[#8a6f5a] mt-1">{t.notFound}</p>}
                    {ownerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-[#EEDCD0] rounded-xl shadow-lg overflow-hidden">
                        {ownerResults.map((o) => (
                          <button key={o.id} type="button" onClick={() => { setSelectedOwner(o); setOwnerQuery(o.name); setOwnerResults([]); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[#FAF3EC] border-b border-[#EEDCD0] last:border-b-0">
                            <span className="font-semibold text-[#5C3A21]">{o.name}</span> <span className="text-[#8a6f5a]">({o.phone})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {customerMode === 'baru' && (
              <div className="space-y-3">
                <div><label className={labelCls}>{t.namaLabel}</label><input type="text" value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} className={inputCls} placeholder={t.namaPH} /></div>
                <div><label className={labelCls}>{t.telLabel}</label><input type="tel" value={teleponBaru} onChange={(e) => setTeleponBaru(e.target.value)} className={inputCls} placeholder={t.telPH} /></div>
                <div><label className={labelCls}>{t.emailLabel}</label><input type="email" value={emailBaru} onChange={(e) => setEmailBaru(e.target.value)} className={inputCls} placeholder={t.emailPH} /></div>
                <div><label className={labelCls}>{t.igLabel}</label><input type="text" value={instagramBaru} onChange={(e) => setInstagramBaru(e.target.value)} className={inputCls} placeholder={t.igPH} /></div>
                <div><label className={labelCls}>{t.alamatLabel}</label><textarea value={alamatBaru} onChange={(e) => setAlamatBaru(e.target.value)} className={inputCls} rows={2} placeholder={t.alamatPH} /></div>
              </div>
            )}

            <div className="bg-[#FAF3EC] p-4 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-[#5C3A21]">{t.emergencyTitle}</p>
              <div><label className={labelCls}>{t.emergencyNama}</label><input type="text" value={kontakEmergency} onChange={(e) => setKontakEmergency(e.target.value)} className={inputCls} placeholder={t.emergencyNamaPH} /></div>
              <div><label className={labelCls}>{t.emergencyTel}</label><input type="tel" value={teleponEmergency} onChange={(e) => setTeleponEmergency(e.target.value)} className={inputCls} placeholder={t.emergencyTelPH} /></div>
            </div>

            <div className="flex gap-3">
              {btnSecondary(t.back, () => setStep(0))}
              {btnPrimary(t.next, () => {
                if (customerMode === 'lama' && !selectedOwner) { setError(t.errOwnerRequired); return; }
                if (customerMode === 'baru' && (!namaBaru || !teleponBaru)) { setError(t.errNamaTel); return; }
                if (!kontakEmergency || !teleponEmergency) { setError(t.errEmergency); return; }
                setError(''); setStep(2);
              })}
            </div>
          </div>
        )}

        {/* ===== STEP 2: TANGGAL & TRANSPORT ===== */}
        {step === 2 && (
          <div className="space-y-4">
            {sectionTitle(t.dateTitle)}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t.checkinLabel}</label>
                <input type="date" value={tanggalCheckin} min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => { setTanggalCheckin(e.target.value); if (tanggalCheckout && e.target.value >= tanggalCheckout) setTanggalCheckout(''); }}
                  className={selectCls} />
              </div>
              <div>
                <label className={labelCls}>{t.checkoutLabel}</label>
                <input type="date" value={tanggalCheckout} min={tanggalCheckin || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setTanggalCheckout(e.target.value)} className={selectCls} />
              </div>
            </div>

            {nights > 0 && (
              <div className={`rounded-xl p-3 text-xs ${isPeak ? 'bg-red-50 text-red-700' : isLongStay ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                <p className="font-bold">{t.totalWord}: {nights} {t.nightsUnit}</p>
                {isPeak && <p className="mt-1">{t.peakMsg}</p>}
                {isLongStay && <p className="mt-1">{t.longStayMsg}</p>}
                {!isPeak && !isLongStay && <p className="mt-1">{t.noDPMsg}</p>}
                <p className="mt-1 text-[#8a6f5a]">{t.checkHours}</p>
              </div>
            )}

            <div className="bg-[#FAF3EC] p-4 rounded-2xl space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={butuhTransport} onChange={(e) => setButuhTransport(e.target.checked)} className="w-4 h-4 accent-[#5C3A21]" />
                <span className="text-sm font-semibold text-[#5C3A21]">{t.transportToggle}</span>
              </label>
              {butuhTransport && (
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>{t.transportModa}</label>
                    {/* value tetap Bahasa Indonesia karena ini yang dikirim ke Odoo selection field */}
                    <select value={transportModa} onChange={(e) => setTransportModa(e.target.value)} className={selectCls}>
                      <option value="">{t.pilihPH}</option>
                      <option value="Mobil">{t.mobil}</option>
                      <option value="Motor">{t.motor}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t.transportArah}</label>
                    <select value={transportArah} onChange={(e) => setTransportArah(e.target.value)} className={selectCls}>
                      <option value="">{t.pilihPH}</option>
                      <option value="Pick-up Only">{t.pickupOnly}</option>
                      <option value="Drop-off Only">{t.dropoffOnly}</option>
                      <option value="Pick-up & Drop-off">{t.bothWays}</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>{t.transportAlamat}</label><textarea value={alamatTransport} onChange={(e) => setAlamatTransport(e.target.value)} className={inputCls} rows={2} placeholder={t.transportAlamatPH} /></div>
                </div>
              )}
            </div>

            <div><label className={labelCls}>{t.catatanLabel}</label><textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputCls} rows={3} placeholder={t.catatanPH} /></div>

            <div className="flex gap-3">
              {btnSecondary(t.back, () => setStep(1))}
              {btnPrimary(t.next, () => {
                if (!tanggalCheckin || !tanggalCheckout) { setError(t.errDates); return; }
                if (butuhTransport && (!transportModa || !transportArah)) { setError(t.errTransport); return; }
                setError(''); setStep(3);
              })}
            </div>
          </div>
        )}

        {/* ===== STEP 3: PETS ===== */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {sectionTitle(t.petTitle)}
              <button type="button" onClick={() => setPets((p) => [...p, emptyPet()])} className="text-xs bg-[#5C3A21] text-white px-3 py-2 rounded-xl">{t.addPet}</button>
            </div>
            {masterLoading && <p className="text-xs text-[#8a6f5a] text-center">{t.loading}</p>}

            {pets.map((pet, idx) => (
              <div key={idx} className="bg-[#FAF3EC] border-2 border-[#EEDCD0] rounded-2xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold text-[#5C3A21]" style={{ fontFamily: 'var(--font-fredoka)' }}>{t.petNum} #{idx + 1}</p>
                  {pets.length > 1 && <button type="button" onClick={() => setPets((p) => p.filter((_, i) => i !== idx))} className="text-xs text-red-600 underline">{t.remove}</button>}
                </div>

                {customerMode === 'lama' && ownerPets.length > 0 ? (
                  <div>
                    <label className={labelCls}>{t.selectPet}</label>
                    <select value={pet.petId ?? ''} className={selectCls}
                      onChange={(e) => { const id = parseInt(e.target.value); const found = ownerPets.find((p) => p.id === id); updatePet(idx, { petId: id, petLabel: found?.name ?? '' }); }}>
                      <option value="">{t.selectPetPH}</option>
                      {ownerPets.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.jenis}, {p.kategoriBerat}, {p.berat}kg)</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={labelCls}>{t.namaPetLabel}</label><input type="text" value={pet.namaPetBaru} onChange={(e) => updatePet(idx, { namaPetBaru: e.target.value })} className={inputCls} placeholder={t.namaPetPH} /></div>
                    <div>
                      <label className={labelCls}>{t.jenisLabel}</label>
                      <select value={pet.jenisPetBaru} onChange={(e) => updatePet(idx, { jenisPetBaru: e.target.value as 'Anjing' | 'Kucing' })} className={selectCls}>
                        <option value="">{t.selectPH}</option>
                        <option value="Anjing">{t.anjing}</option>
                        <option value="Kucing">{t.kucing}</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>{t.rasLabel}</label><input type="text" value={pet.rasBaru} onChange={(e) => updatePet(idx, { rasBaru: e.target.value })} className={inputCls} placeholder={t.rasPH} /></div>
                    <div><label className={labelCls}>{t.beratLabel}</label><input type="number" step="0.1" min="0" value={pet.beratBaru} onChange={(e) => updatePet(idx, { beratBaru: e.target.value })} className={inputCls} placeholder="0.0" /></div>
                  </div>
                )}

                <div>
                  <label className={labelCls}>{t.kamarLabel}</label>
                  <div className="flex gap-3">
                    {(['Regular', 'Large'] as const).map((roomType) => (
                      <button key={roomType} type="button" onClick={() => updatePet(idx, { tipeKamarReq: pet.tipeKamarReq === roomType ? '' : roomType })}
                        className={`flex-1 py-2 rounded-xl text-sm border-2 font-semibold ${pet.tipeKamarReq === roomType ? 'bg-[#5C3A21] text-white border-[#5C3A21]' : 'bg-white text-[#5C3A21] border-[#EEDCD0]'}`}>
                        {roomType}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#8a6f5a] mt-1">{t.kamarInfo}</p>
                </div>

                <div>
                  <label className={labelCls}>{t.groomingLabel}</label>
                  <select value={pet.groomingReq} onChange={(e) => updatePet(idx, { groomingReq: e.target.value })} className={selectCls}>
                    {GROOMING_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                {alacarteOptions.length > 0 && (
                  <div>
                    <label className={labelCls}>{t.alacarteLabel}</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {alacarteOptions.map((a) => (
                        <button key={a.id} type="button" onClick={() => toggleMulti(idx, 'alacarteIds', a.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs border-2 font-semibold ${pet.alacarteIds.includes(a.id) ? 'bg-[#5C3A21] text-white border-[#5C3A21]' : 'bg-white text-[#5C3A21] border-[#EEDCD0]'}`}>
                          {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {aktivitasOptions.length > 0 && (
                  <div>
                    <label className={labelCls}>{t.aktivitasLabel}</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {aktivitasOptions.map((a) => (
                        <button key={a.id} type="button" onClick={() => toggleMulti(idx, 'aktivitasIds', a.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs border-2 font-semibold ${pet.aktivitasIds.includes(a.id) ? 'bg-[#5C3A21] text-white border-[#5C3A21]' : 'bg-white text-[#5C3A21] border-[#EEDCD0]'}`}>
                          {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-dashed border-[#EEDCD0] pt-3 space-y-3">
                  <p className="text-xs font-bold text-[#5C3A21]">{t.healthTitle}</p>

                  <div>
                    <label className={labelCls}>{t.antiparasitLabel}</label>
                    <select value={pet.antiparasitMerk} onChange={(e) => updatePet(idx, { antiparasitMerk: e.target.value })} className={selectCls}>
                      <option value="">{t.selectPH}</option>
                      {ANTIPARASIT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {pet.antiparasitMerk === 'Lainnya' && <input type="text" value={pet.antiparasitLainnya} onChange={(e) => updatePet(idx, { antiparasitLainnya: e.target.value })} className={`${inputCls} mt-2`} placeholder={t.antiparasitLainPH} />}
                  </div>

                  <div><label className={labelCls}>{t.makananLabel}</label><textarea value={pet.makanan} onChange={(e) => updatePet(idx, { makanan: e.target.value })} className={inputCls} rows={2} placeholder={t.makananPH} /></div>

                  <div>
                    <label className={labelCls}>{t.alergiLabel}</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {alergiLabels.map((label, i) => {
                        const val = ALERGI_VALUES[i];
                        const selected = pet.alergiMakanan.includes(val);
                        return (
                          <button key={val} type="button"
                            onClick={() => { const arr = pet.alergiMakanan ? pet.alergiMakanan.split(', ').filter(Boolean) : []; const next = selected ? arr.filter((x) => x !== val) : [...arr, val]; updatePet(idx, { alergiMakanan: next.join(', ') }); }}
                            className={`px-3 py-1.5 rounded-xl text-xs border-2 font-semibold ${selected ? 'bg-[#5C3A21] text-white border-[#5C3A21]' : 'bg-white text-[#5C3A21] border-[#EEDCD0]'}`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div><label className={labelCls}>{t.instruksiLabel}</label><textarea value={pet.instruksiMakan} onChange={(e) => updatePet(idx, { instruksiMakan: e.target.value })} className={inputCls} rows={2} placeholder={t.instruksiPH} /></div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-[#333]">
                      <input type="checkbox" checked={pet.sedangPengobatan} onChange={(e) => updatePet(idx, { sedangPengobatan: e.target.checked })} className="w-4 h-4 accent-[#5C3A21]" />
                      {t.obatToggle}
                    </label>
                    {pet.sedangPengobatan && <textarea value={pet.instruksiObat} onChange={(e) => updatePet(idx, { instruksiObat: e.target.value })} className={`${inputCls} mt-2`} rows={2} placeholder={t.obatPH} />}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>{t.sifatManusia}</label>
                      <select value={pet.sifatManusia} onChange={(e) => updatePet(idx, { sifatManusia: e.target.value })} className={selectCls}>
                        <option value="">{t.selectPH}</option>
                        {sifatLabels.map((label, i) => <option key={SIFAT_VALUES[i]} value={SIFAT_VALUES[i]}>{label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{t.sifatAnabul}</label>
                      <select value={pet.sifatAnabul} onChange={(e) => updatePet(idx, { sifatAnabul: e.target.value })} className={selectCls}>
                        <option value="">{t.selectPH}</option>
                        {sifatLabels.map((label, i) => <option key={SIFAT_VALUES[i]} value={SIFAT_VALUES[i]}>{label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div><label className={labelCls}>{t.vaksinLabel}</label><input type="file" accept="image/*,application/pdf" className="w-full text-xs" onChange={(e) => handlePhotoChange(idx, e.target.files?.[0] ?? null)} /></div>
                  <div><label className={labelCls}>{t.catatanPetLabel}</label><textarea value={pet.catatanPet} onChange={(e) => updatePet(idx, { catatanPet: e.target.value })} className={inputCls} rows={2} placeholder={t.catatanPetPH} /></div>
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              {btnSecondary(t.back, () => setStep(2))}
              {btnPrimary(t.next, () => {
                for (let i = 0; i < pets.length; i++) {
                  const p = pets[i];
                  const isExisting = customerMode === 'lama' && ownerPets.length > 0;
                  if (isExisting && !p.petId) { setError(`${t.errPetSelect} #${i + 1}.`); return; }
                  if (!isExisting && !p.namaPetBaru) { setError(`${t.errPetName} #${i + 1} ${t.errWajib}`); return; }
                  if (!p.antiparasitMerk) { setError(`${t.errAntiparasit} #${i + 1} ${t.errPilih}`); return; }
                  if (!p.makanan) { setError(`${t.errMakanan} #${i + 1} ${t.errWajib}`); return; }
                  if (!p.instruksiMakan) { setError(`${t.errInstruksi} #${i + 1} ${t.errWajib}`); return; }
                }
                setError(''); setStep(4);
              })}
            </div>
          </div>
        )}

        {/* ===== STEP 4: KONFIRMASI ===== */}
        {step === 4 && (
          <div className="space-y-4">
            {sectionTitle(t.summaryTitle)}

            <div className="bg-[#FAF3EC] rounded-2xl p-4 space-y-1 text-sm">
              <p className="font-bold text-[#5C3A21] mb-2">{t.ownerSection}</p>
              {selectedOwner ? <p>{selectedOwner.name} ({selectedOwner.phone})</p> : <><p><strong>{t.namaWord}</strong>: {namaBaru}</p><p><strong>{t.telLabel.replace(' *','')}</strong>: {teleponBaru}</p>{emailBaru && <p><strong>{t.emailWord}</strong>: {emailBaru}</p>}</>}
              <p><strong>{t.emergencyWord}</strong>: {kontakEmergency} — {teleponEmergency}</p>
            </div>

            <div className="bg-[#FAF3EC] rounded-2xl p-4 space-y-1 text-sm">
              <p className="font-bold text-[#5C3A21] mb-2">{t.dateSection}</p>
              <p><strong>{t.checkinLbl}</strong>: {tanggalCheckin}</p>
              <p><strong>{t.checkoutLbl}</strong>: {tanggalCheckout}</p>
              <p><strong>{t.totalLbl}</strong>: {nights} {t.nightsUnit}</p>
              {isPeak && <p className="text-red-600 font-semibold">{t.peakMsg}</p>}
              {isLongStay && <p className="text-yellow-700 font-semibold">{t.longStayMsg}</p>}
              {butuhTransport && <p><strong>{t.transportLbl}</strong>: {transportModa} — {transportArah}</p>}
            </div>

            {pets.map((pet, idx) => (
              <div key={idx} className="bg-[#FAF3EC] rounded-2xl p-4 space-y-1 text-sm">
                <p className="font-bold text-[#5C3A21] mb-2">{t.petSection} #{idx + 1}</p>
                {pet.petId ? <p><strong>{t.hewanWord}</strong>: {ownerPets.find((p) => p.id === pet.petId)?.name}</p> : <p><strong>{t.namaWord}</strong>: {pet.namaPetBaru} ({pet.jenisPetBaru})</p>}
                {pet.tipeKamarReq && <p><strong>{t.kamarLbl}</strong>: {pet.tipeKamarReq}</p>}
                {pet.groomingReq && pet.groomingReq !== 'Tidak' && <p><strong>{t.groomingLbl}</strong>: {pet.groomingReq}</p>}
                {pet.alacarteIds.length > 0 && <p><strong>À La Carte</strong>: {pet.alacarteIds.map((id) => alacarteOptions.find((a) => a.id === id)?.name).filter(Boolean).join(', ')}</p>}
                {pet.aktivitasIds.length > 0 && <p><strong>{t.aktivitasLabel.split(' (')[0]}</strong>: {pet.aktivitasIds.map((id) => aktivitasOptions.find((a) => a.id === id)?.name).filter(Boolean).join(', ')}</p>}
              </div>
            ))}

            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700"><p>{t.infoDP}</p></div>

            <div className="flex gap-3">
              {btnSecondary(t.back, () => setStep(3))}
              {btnPrimary(loading ? t.submitting : t.submitBtn, handleSubmit, loading)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}