import {
  Hero,
  TrustStrip,
  Categories,
  Featured,
  AboutBlurb,
  Vendors,
  JoinUs,
  Testimonials,
} from '../components/sections/HomePage';

export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Categories />
      <Featured />
      <AboutBlurb />
      <Vendors />
      <JoinUs />
      <Testimonials />
    </>
  );
}

