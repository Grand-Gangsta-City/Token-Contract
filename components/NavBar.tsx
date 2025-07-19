'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import ConnectWalletButton from './ConnectWalletButton';

const NavBar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 w-full z-50 bg-no-repeat bg-cover bg-center"
      style={{ backgroundImage: "url('/Header-Bar.png')" }}
    >
      {/* main bar */}
      <div className="max-w-7xl mx-auto flex items-center justify-between h-20 px-4 md:px-8">
        {/* logo */}
        <Link href="/" className="flex items-center">
          <img
            src="/GGClogo.png"
            alt="GGC Logo"
            className="h-16 w-auto animate-pulse"
          />
        </Link>

        {/* desktop links */}
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-light hover:text-gold">
            Home
          </Link>
          <Link href="/owner" className="text-light hover:text-gold">
            Owner Panel
          </Link>
          <Link
            href="/change-address"
            className="text-light hover:text-gold"
          >
            Change Address
          </Link>
          <ConnectWalletButton />
        </div>

        {/* mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-light hover:text-gold focus:outline-none"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden absolute top-20 left-0 w-full bg-no-repeat bg-cover bg-center"
          style={{ backgroundImage: "url('/Header-Bar.png')" }}
        >
          <div className="flex flex-col items-center space-y-4 py-4">
            <Link href="/" className="text-light hover:text-gold">
              Home
            </Link>
            <Link href="/owner" className="text-light hover:text-gold">
              Owner Panel
            </Link>
            <Link
              href="/change-address"
              className="text-light hover:text-gold"
            >
              Change Address
            </Link>
            <ConnectWalletButton />
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
