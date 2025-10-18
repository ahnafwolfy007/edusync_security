import React from 'react';

// ThemedShell applies the same general vibe as AuthToggle: light neutral background,
// optional left gradient banner (hidden on small), and a centered content container.
// Use it to wrap page content so the overall theme feels consistent.
export default function ThemedShell({ children, leftBanner = true, title, subtitle, heroImage = '/login.png' }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {leftBanner && (
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-600 p-6 md:p-12 flex-col justify-center text-white">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <img src="/edusync-logo.svg" alt="Edusync" className="w-9 h-9 rounded-lg" />
                <h1 className="text-3xl md:text-4xl font-bold">{title || 'Edusync'}</h1>
              </div>
              <p className="text-lg opacity-90">{subtitle || 'Your complete campus ecosystem for students and businesses'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex items-center justify-center">
              <div className="w-full aspect-square max-w-[384px] bg-white/20 rounded-xl overflow-hidden">
                <img src={heroImage} alt="Section Illustration" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`w-full ${leftBanner ? 'lg:w-1/2' : ''} flex items-start md:items-center justify-center p-4 sm:p-6 md:p-8`}>
        <div className="w-full max-w-6xl">
          {children}
        </div>
      </div>
    </div>
  );
}
