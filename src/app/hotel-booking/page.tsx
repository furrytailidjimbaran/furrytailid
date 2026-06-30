import type { Metadata } from 'next';
import HotelBookingForm from './HotelBookingForm';

export const metadata: Metadata = {
  title: 'Booking Pet Hotel — Furrytail Pet Grooming & Dog Hotel',
  description: 'Booking pet hotel Furrytail Pet Grooming Salon & Dog Hotel, Jimbaran Bali.',
  openGraph: {
    title: 'Booking Pet Hotel — Furrytail',
    description: 'Booking pet hotel Furrytail Pet Grooming Salon & Dog Hotel, Jimbaran Bali.',
    images: ['/logo.png'],
    type: 'website',
  },
};

export default function HotelBookingPage() {
  return <HotelBookingForm />;
}