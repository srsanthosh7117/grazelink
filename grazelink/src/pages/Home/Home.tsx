import Navbar from '@/components/Navbar/Navbar';
import Hero from '@/components/Hero/Hero';
import Features from '@/components/Features/Features';
import About from '@/components/About/About';
import WhyGrazeLink from '@/components/WhyGrazeLink/WhyGrazeLink';
import Contact from '@/components/Contact/Contact';
import Footer from '@/components/Footer/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <Hero />
      <Features />
      <About />
      <WhyGrazeLink />
      <Contact />
      <Footer />
    </div>
  );
}
