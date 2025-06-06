'use client';
import React from 'react';
import Link from 'next/link';
import ConnectWalletButton from './ConnectWalletButton';

const NavBar: React.FC = () => {
  return (
    <nav className="w-full px-8 py-4 bg-gray-900 backdrop-blur-md bg-opacity-30 fixed top-0 z-50 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <div className="text-gold font-extrabold text-2xl animate-pulse">
          GGC
        </div>
        <div className="text-light font-semibold text-lg">Global Gold Chain</div>
      </div>
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-light hover:text-gold transition">
          Home
        </Link>
        <Link href="/owner" className="text-light hover:text-gold transition">
          Owner Panel
        </Link>
        <ConnectWalletButton />
      </div>
    </nav>
  );
};

export default NavBar;