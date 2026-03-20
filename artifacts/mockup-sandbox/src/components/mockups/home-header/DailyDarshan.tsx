import React from 'react';
import { Calendar, Info, MapPin, Bell, User, ChevronRight, Sun, Moon } from 'lucide-react';
import './_group.css';

export function DailyDarshan() {
  const mockData = {
    todayWebsiteKannada: "ಶ್ರೀ ಪರಾಭವ ಸಂವತ್ಸರ, ಚೈತ್ರ, ಶುಕ್ಲ ದ್ವಿತಿಯ, ರೇವತಿ",
    todayWebsiteEnglish: "Sri Parābhava Samvatsara, Chaitra, Shukla Dwitiya, Revati",
    samvatsara: "Sri Parābhava",
    samvatsaraK: "ಶ್ರೀ ಪರಾಭವನಾಮ ಸಂವತ್ಸರ",
    chandraMasa: "Chaitra",
    chandraMasaK: "ಚೈತ್ರ",
    tithi: "Shukla Dwitiya",
    tithiK: "ಶುಕ್ಲ ದ್ವಿತಿಯ",
    nakshatra: "Revati",
    nakshatraK: "ರೇವತಿ",
    occasion: "Sringeri Sri Sri Jagadguru Sri Sacchidananda Shivabhinava Narasimha Bharati Mahaswamiji Aradhana",
    occasionK: "ಶೃಂಗೇರಿ ಶ್ರೀ ಶ್ರೀ ಜಗದ್ಗುರು ಶ್ರೀ ಸಚ್ಚಿದಾನಂದ ಶಿವಾಭಿನವ ನೃಸಿಂಹ ಭಾರತೀ ಮಹಾಸ್ವಾಮಿಗಳವರ ಆರಾಧನೆ.",
    dateDisplay: "THU, 20 MARCH 2026",
    userName: "Aditya",
    userInitials: "A"
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] max-w-[390px] mx-auto relative font-sans shadow-xl overflow-hidden flex flex-col">
      
      {/* Top Bar / Greeting */}
      <header className="px-5 pt-12 pb-4 bg-white/60 backdrop-blur-md sticky top-0 z-10 border-b border-[hsl(var(--border))]/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {mockData.userInitials}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
              {mockData.dateDisplay}
            </span>
            <h1 className="text-sm font-medium text-[hsl(var(--foreground))]">
              Namaste, <span className="font-bold">{mockData.userName}</span>
            </h1>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-white shadow-sm border border-[hsl(var(--border))]/50 flex items-center justify-center text-[hsl(var(--foreground))]">
          <Bell className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        
        {/* Occasion Hero */}
        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-[hsl(var(--primary))]/20">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-90" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
          
          <div className="relative p-6 text-white text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 border border-white/30 shadow-inner">
              <Sun className="w-6 h-6 text-yellow-100" />
            </div>
            <p className="font-serif text-[13px] font-medium leading-relaxed opacity-90 mb-2 drop-shadow-sm">
              Today's Special Occasion
            </p>
            <h2 className="font-serif text-lg font-bold leading-tight mb-3 text-white drop-shadow-md" style={{ fontFamily: 'Noto Serif Kannada, serif' }}>
              {mockData.occasionK}
            </h2>
            <div className="w-12 h-px bg-white/40 mx-auto mb-3" />
            <p className="text-sm font-medium leading-snug text-white/90">
              {mockData.occasion}
            </p>
          </div>
        </div>

        {/* Decorative Combined Line */}
        <div className="pl-4 py-1 border-l-4 border-[hsl(var(--primary))]">
          <p className="text-base font-serif font-medium leading-relaxed text-[hsl(var(--foreground))] mb-1" style={{ fontFamily: 'Noto Serif Kannada, serif' }}>
            {mockData.todayWebsiteKannada}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {mockData.todayWebsiteEnglish}
          </p>
        </div>

        {/* 2x2 Grid for Panchanga Details */}
        <div className="grid grid-cols-2 gap-3">
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[hsl(var(--border))]/40 hover:shadow-md transition-shadow">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[hsl(var(--muted-foreground))] mb-1 block">Samvatsara</span>
            <p className="font-bold text-sm text-[hsl(var(--foreground))] mb-0.5">{mockData.samvatsara}</p>
            <p className="text-xs text-[hsl(var(--primary))] font-serif" style={{ fontFamily: 'Noto Serif Kannada, serif' }}>{mockData.samvatsaraK}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-[hsl(var(--border))]/40 hover:shadow-md transition-shadow">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[hsl(var(--muted-foreground))] mb-1 block">Masa</span>
            <p className="font-bold text-sm text-[hsl(var(--foreground))] mb-0.5">{mockData.chandraMasa}</p>
            <p className="text-xs text-[hsl(var(--primary))] font-serif" style={{ fontFamily: 'Noto Serif Kannada, serif' }}>{mockData.chandraMasaK}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-[hsl(var(--border))]/40 hover:shadow-md transition-shadow">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[hsl(var(--muted-foreground))] mb-1 block">Tithi</span>
            <p className="font-bold text-sm text-[hsl(var(--foreground))] mb-0.5">{mockData.tithi}</p>
            <p className="text-xs text-[hsl(var(--primary))] font-serif" style={{ fontFamily: 'Noto Serif Kannada, serif' }}>{mockData.tithiK}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-[hsl(var(--border))]/40 hover:shadow-md transition-shadow">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[hsl(var(--muted-foreground))] mb-1 block">Nakshatra</span>
            <p className="font-bold text-sm text-[hsl(var(--foreground))] mb-0.5">{mockData.nakshatra}</p>
            <p className="text-xs text-[hsl(var(--primary))] font-serif" style={{ fontFamily: 'Noto Serif Kannada, serif' }}>{mockData.nakshatraK}</p>
          </div>

        </div>

        {/* Sandhya Kala Link */}
        <div className="pt-2">
          <button className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-[hsl(var(--border))]/40 shadow-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--secondary))]/10 flex items-center justify-center">
                <Moon className="w-4 h-4 text-[hsl(var(--secondary))]" />
              </div>
              <span className="font-medium text-sm">Sandhya Kala Details</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>

      </div>
    </div>
  );
}
