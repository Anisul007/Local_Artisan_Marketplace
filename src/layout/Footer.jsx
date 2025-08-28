// frontend/src/layout/Footer.jsx
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-12">
      {/* Top */}
      <div className="container py-10 grid gap-8 md:grid-cols-4">
        {/* Brand */}
        <div>
          <img
            src="/images/footer-logo.png"
            alt="Artisan Avenue"
             className="h-20 w-auto mx-auto" 
          />
          <p className="text-sm leading-6">
            Curated marketplace for Australian makers. Thoughtfully made,
            small-batch goods.
          </p>
        </div>

        {/* Shop */}
        <div>
          <div className="font-semibold text-white mb-3">Shop</div>
          <ul className="space-y-2">
            <li><a href="/#categories" className="hover:text-white">Categories</a></li>
            <li><a href="/services" className="hover:text-white">All Products</a></li>
            <li><a href="/blog" className="hover:text-white">Collections</a></li>
            <li><a href="/login" className="hover:text-white">Track Orders</a></li>
          </ul>
        </div>

        {/* About */}
        <div>
          <div className="font-semibold text-white mb-3">About</div>
          <ul className="space-y-2">
            <li><a href="/about" className="hover:text-white">Our Story</a></li>
            <li><a href="/contact" className="hover:text-white">Contact</a></li>
            <li><a href="/blog" className="hover:text-white">Blog</a></li>
            <li><a href="/register" className="hover:text-white">Become a Maker</a></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <div className="font-semibold text-white mb-3">Get updates</div>
          <form onSubmit={(e)=>e.preventDefault()} className="flex gap-2">
            <input
              className="px-3 py-2 rounded-xl border border-gray-600 bg-gray-800 text-gray-100 w-full"
              placeholder="Your email"
            />
            <button className="px-4 py-2 rounded-xl bg-white text-gray-900 font-semibold">
              Subscribe
            </button>
          </form>
          {/* Social Icons */}
          <div className="flex gap-4 mt-4">
            <a href="https://instagram.com" target="_blank" aria-label="Instagram">
              <img src="/images/instagram.png" alt="Instagram" className="w-6 h-6 hover:opacity-80" />
            </a>
            <a href="https://facebook.com" target="_blank" aria-label="Facebook">
              <img src="/images/facebook.png" alt="Facebook" className="w-6 h-6 hover:opacity-80" />
            </a>
            <a href="https://twitter.com" target="_blank" aria-label="Twitter">
              <img src="/images/twitter.svg" alt="Twitter" className="w-6 h-6 hover:opacity-80" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-800">
        <div className="container py-4 flex flex-col md:flex-row items-center gap-3 justify-between text-sm">
          <div>© {new Date().getFullYear()} Artisan Avenue. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="/contact" className="hover:text-white">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

