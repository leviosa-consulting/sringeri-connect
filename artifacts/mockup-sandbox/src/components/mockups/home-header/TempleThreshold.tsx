import React from 'react';
import { User, ChevronRight, Bell } from 'lucide-react';
import './_group.css';

export function TempleThreshold() {
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
    <div className="min-h-screen max-w-[390px] mx-auto bg-gradient-to-b from-[#FFFDF9] to-[#F3EBE1] text-[#4A3B32] shadow-xl relative overflow-hidden font-sans">
      
      {/* Top Bar - Secondary */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#E8DFD1] bg-[#FFFDF9]/80 backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#FF6600]/10 flex items-center justify-center text-[#FF6600] font-medium border border-[#FF6600]/20">
            {data.userInitials}
          </div>
          <div>
            <p className="text-xs text-[#8A7B72] uppercase tracking-wider font-semibold">Namaste,</p>
            <p className="text-sm font-semibold">{data.userName}</p>
          </div>
        </div>
        <button className="p-2 text-[#8A7B72] hover:text-[#FF6600] transition-colors rounded-full hover:bg-[#FF6600]/5">
          <Bell className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 relative z-10">
        
        {/* Date Indicator */}
        <div className="text-center mb-6">
          <p className="inline-block px-3 py-1 bg-[#4A3B32] text-[#F3EBE1] text-xs font-bold tracking-[0.2em] rounded-sm uppercase">
            {data.dateDisplay}
          </p>
        </div>

        {/* The Notice Board Frame */}
        <div className="bg-[#FFFDF9] rounded-sm relative shadow-md overflow-hidden p-[2px]">
          {/* Decorative Outer Border */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FFB300] via-[#E8DFD1] to-[#FF6600] opacity-30" />
          
          <div className="relative bg-[#FFFDF9] h-full w-full p-1">
            {/* Inner Border */}
            <div className="border border-[#E8DFD1] h-full w-full p-5 flex flex-col items-center text-center">
              
              {/* Header Icon / Motif Placeholder */}
              <div className="w-8 h-8 rounded-full bg-[#FF6600]/10 flex items-center justify-center mb-4">
                <div className="w-4 h-4 rounded-full bg-[#FF6600]" />
              </div>

              {/* Primary Reading - Kannada */}
              <h1 className="font-['Noto_Serif_Kannada'] text-2xl font-bold leading-snug mb-3 text-[#B04A00]">
                ಶ್ರೀ ಪರಾಭವ ಸಂವತ್ಸರ,<br/>ಚೈತ್ರ, ಶುಕ್ಲ ದ್ವಿತಿಯ, ರೇವತಿ
              </h1>
              
              {/* Secondary Reading - English */}
              <h2 className="font-serif text-[13px] text-[#6E5E53] leading-relaxed mb-6 italic">
                {data.todayWebsiteEnglish}
              </h2>

              {/* Decorative Divider */}
              <div className="flex items-center justify-center w-full mb-6 gap-2">
                <div className="h-px bg-gradient-to-r from-transparent via-[#FFB300] to-transparent flex-1" />
                <div className="w-2 h-2 rotate-45 bg-[#FF6600]" />
                <div className="h-px bg-gradient-to-r from-[#FFB300] via-[#FFB300] to-transparent flex-1" />
              </div>

              {/* Structured Grid (Table-like) */}
              <div className="w-full grid grid-cols-2 gap-y-4 gap-x-2 text-left mb-6">
                
                {/* Samvatsara */}
                <div className="border-l-2 border-[#FFB300] pl-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#8A7B72] mb-1">Samvatsara</p>
                  <p className="font-['Noto_Serif_Kannada'] text-[15px] font-semibold text-[#4A3B32]">{data.samvatsaraK}</p>
                  <p className="text-xs text-[#6E5E53] mt-0.5 font-serif">{data.samvatsara}</p>
                </div>

                {/* Masa */}
                <div className="border-l-2 border-[#FFB300] pl-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#8A7B72] mb-1">Masa</p>
                  <p className="font-['Noto_Serif_Kannada'] text-[15px] font-semibold text-[#4A3B32]">{data.chandraMasaK}</p>
                  <p className="text-xs text-[#6E5E53] mt-0.5 font-serif">{data.chandraMasa}</p>
                </div>

                {/* Tithi */}
                <div className="border-l-2 border-[#FFB300] pl-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#8A7B72] mb-1">Tithi</p>
                  <p className="font-['Noto_Serif_Kannada'] text-[15px] font-semibold text-[#4A3B32]">{data.tithiK}</p>
                  <p className="text-xs text-[#6E5E53] mt-0.5 font-serif">{data.tithi}</p>
                </div>

                {/* Nakshatra */}
                <div className="border-l-2 border-[#FFB300] pl-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#8A7B72] mb-1">Nakshatra</p>
                  <p className="font-['Noto_Serif_Kannada'] text-[15px] font-semibold text-[#4A3B32]">{data.nakshatraK}</p>
                  <p className="text-xs text-[#6E5E53] mt-0.5 font-serif">{data.nakshatra}</p>
                </div>

              </div>

              {/* Occasion / Special Day */}
              <div className="w-full bg-[#FFB300]/10 border border-[#FFB300]/30 rounded p-4 text-center mt-2">
                <p className="text-[10px] text-[#FF6600] uppercase tracking-widest font-bold mb-2 flex items-center justify-center gap-1">
                  <span>✦</span> Special Occasion <span>✦</span>
                </p>
                <p className="font-['Noto_Serif_Kannada'] text-sm font-semibold text-[#4A3B32] mb-1.5 leading-snug">
                  {data.occasionK}
                </p>
                <p className="text-[11px] font-serif text-[#6E5E53] leading-snug">
                  {data.occasion}
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* CTA Link */}
        <div className="mt-8 text-center">
          <button className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF6600] uppercase tracking-wide group hover:text-[#D35400] transition-colors">
            Sandhya Kala Details
            <span className="bg-[#FF6600]/10 p-1 rounded-full group-hover:bg-[#FF6600]/20 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        </div>

      </main>
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6600] opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FFB300] opacity-[0.04] rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 pointer-events-none" />
    </div>
  );
}
