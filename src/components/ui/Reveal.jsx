import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

export default function Reveal({ children, delay = 0, y = 24 }) {
  const controls = useAnimation();

  useEffect(() => {
    const onScroll = () => {
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const inView = r.top < window.innerHeight * 0.85 && r.bottom > 0;
        if (inView) controls.start("show");
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [controls]);

  return (
    <motion.div
      data-reveal
      initial="hide"
      animate={controls}
      variants={{
        hide: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, delay } },
      }}
    >
      {children}
    </motion.div>
  );
}
