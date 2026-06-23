import type { Metadata } from 'next';
import PresensiForm from './PresensiForm';

export const metadata: Metadata = {
  title: 'Presensi Staff — Furrytail Pet Grooming & Dog Hotel',
  description: 'Halaman check-in dan check-out staff Furrytail Pet Grooming Salon & Dog Hotel.',
  openGraph: {
    title: 'Presensi Staff — Furrytail',
    description: 'Halaman check-in dan check-out staff Furrytail Pet Grooming Salon & Dog Hotel.',
    images: ['/logo.png'],
    type: 'website',
  },
};

export default function PresensiPage() {
  return <PresensiForm />;
}