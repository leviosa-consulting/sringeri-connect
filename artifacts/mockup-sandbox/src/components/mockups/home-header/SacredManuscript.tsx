import React, { useState } from 'react';
import { Info, X, ChevronRight } from 'lucide-react';
import './_group.css';

export function SacredManuscript() {
  const [showDetails, setShowDetails] = useState(false);

  // Mock Data
  const data = {
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
    <div className="min-h-screen bg-[#FFF9F0] text-[#4A3B32] font-sans max-w-[390px] mx-auto relative overflow-hidden flex flex-col shadow-xl">
      {/* Subtle manuscript texture/gradient background */}
      <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply" 
           style={{
             backgroundImage: 'radial-gradient(circle at 50% 30%, #FFE8D6 0%, transparent 70%), radial-gradient(circle at 80% 80%, #F4E4D4 0%, transparent 50%)',
             filter: 'url(#noise)'
           }}>
      </div>
      
      {/* SVG filter for subtle noise texture */}
      <svg className="hidden">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 0.05 0" />
        </filter>
      </svg>

      {/* Header - Minimal Greeting */}
      <div className="flex items-center justify-between px-6 pt-12 pb-6 relative z-10">
        <div className="flex items-center gap-3 opacity-80">
          <div className="w-8 h-8 rounded-full bg-[#E8601C] text-white flex items-center justify-center text-xs font-medium shadow-sm">
            {data.userInitials}
          </div>
          <span className="text-sm font-serif text-[#5C4A3D]">Namaste, {data.userName}</span>
        </div>
      </div>

      {/* Main Content - Sacred Text Focus */}
      <div className="flex-1 flex flex-col justify-center px-8 relative z-10 -mt-10">
        <div className="text-center mb-16 space-y-8">
          
          {/* Main Kannada Panchanga - Treated as Art */}
          <div className="relative">
            <div className="absolute -left-4 top-0 text-[#E8601C]/10 text-6xl font-serif leading-none select-none">"</div>
            <h1 className="font-['Noto_Serif_Kannada'] text-3xl md:text-4xl text-[#3A2A1F] leading-[1.6] tracking-wide relative z-10 py-2">
              {data.todayWebsiteKannada}
            </h1>
            <div className="absolute -right-4 bottom-0 text-[#E8601C]/10 text-6xl font-serif leading-none select-none rotate-180">"</div>
          </div>

          {/* English Gloss */}
          <p className="font-serif text-[#7A6A5C] text-sm tracking-wide leading-relaxed italic max-w-[85%] mx-auto border-t border-[#8A7A6C]/20 pt-6">
            {data.todayWebsiteEnglish}
          </p>
        </div>

        {/* Occasion */}
        <div className="text-center mb-12 relative">
          <div className="flex items-center justify-center gap-4 mb-5 opacity-40">
            <div className="h-px bg-[#8A7A6C] w-12"></div>
            <span className="text-[#E8601C] text-lg">ॐ</span>
            <div className="h-px bg-[#8A7A6C] w-12"></div>
          </div>
          
          <h2 className="font-['Noto_Serif_Kannada'] text-[#5C4A3D] text-lg leading-snug mb-3">
            {data.occasionK}
          </h2>
          <p className="font-sans text-xs text-[#8A7A6C] uppercase tracking-wider leading-relaxed">
            {data.occasion}
          </p>
        </div>

        {/* Details Toggle */}
        <div className="flex justify-center mb-10">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-xs font-serif text-[#E8601C] hover:text-[#C54A0D] transition-colors uppercase tracking-widest pb-1 border-b border-[#E8601C]/30 hover:border-[#E8601C]"
          >
            <span>Sacred Details</span>
            {showDetails ? <X className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expanded Details Panel */}
        {showDetails && (
          <div className="bg-[#FAF2E8]/80 backdrop-blur-sm border border-[#E8DCC8] rounded-xl p-6 mb-12 shadow-[0_4px_20px_-5px_rgba(92,74,61,0.08)] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 gap-5">
              {[
                { label: 'Samvatsara', k: data.samvatsaraK, e: data.samvatsara },
                { label: 'Masa', k: data.chandraMasaK, e: data.chandraMasa },
                { label: 'Tithi', k: data.tithiK, e: data.tithi },
                { label: 'Nakshatra', k: data.nakshatraK, e: data.nakshatra }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-[#E8DCC8]/50 pb-3 last:border-0 last:pb-0">
                  <span className="text-xs uppercase tracking-wider text-[#8A7A6C] font-sans w-24">
                    {item.label}
                  </span>
                  <div className="text-right">
                    <div className="font-['Noto_Serif_Kannada'] text-[#5C4A3D] text-[15px]">{item.k}</div>
                    <div className="font-serif text-[#8A7A6C] text-[10px] mt-0.5">{item.e}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-6 py-3 flex items-center justify-center gap-2 bg-white/50 hover:bg-white rounded-lg text-sm font-serif text-[#E8601C] transition-colors border border-[#E8DCC8]/50">
              Sandhya Kala Details <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Colophon Date */}
      <div className="pb-10 pt-4 text-center relative z-10 mt-auto">
        <div className="inline-block relative">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-[#8A7A6C]/20 -z-10 w-[150%] -translate-x-1/6"></div>
          <span className="font-serif text-[10px] uppercase tracking-[0.3em] text-[#8A7A6C] bg-[#FFF9F0] px-4 py-1">
            {data.dateDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}
