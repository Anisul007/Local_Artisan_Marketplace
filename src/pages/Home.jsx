import {
  Hero,
  TrustStrip,
  Categories,
  Featured,
  AboutBlurb,
  Makers,
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
      <Makers />
      <JoinUs />
      <Testimonials />
    </>
  );
}

