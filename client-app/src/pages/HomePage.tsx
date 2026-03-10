import { Hero } from '../features/marketing/Hero';
import { Highlights } from '../features/marketing/Highlights';
import { ReservationFlow } from '../features/marketing/ReservationFlow';
import { Testimonials } from '../features/marketing/Testimonials';
import { CTASection } from '../features/marketing/CTASection';

export function HomePage() {
  return (
    <>
      <Hero />
      <Highlights />
      <ReservationFlow />
      <Testimonials />
      <CTASection />
    </>
  );
}
