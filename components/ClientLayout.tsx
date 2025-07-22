// components/ClientLayout.tsx
'use client';

import React from 'react';
import NavBar from './NavBar';
import { useNetwork } from '@/hooks/useNetwork';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { current, target, switchToSei } = useNetwork();
  const wrongChain = Boolean(current && current.network !== target.network);

  return (
    <>
      {wrongChain && (
        <div className="fixed top-20 left-0 w-full bg-red-600 text-white p-4 flex items-center justify-between z-50">
          <span>
            You’re connected to <strong>{current!.name}</strong>, but this app runs on <strong>{target.name}</strong>.
          </span>
          <button
            onClick={switchToSei}
            className="ml-4 px-3 py-1 bg-white text-red-600 font-semibold rounded"
          >
            Switch to {target.name}
          </button>
        </div>
      )}

      {/* push everything down if the banner is visible */}
      <div className={wrongChain ? 'pt-20' : ''}>
        <NavBar />
        <main className="pt-20 pb-10 px-4 md:px-8">{children}</main>
      </div>
    </>
  );
}
