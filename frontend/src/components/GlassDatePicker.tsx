import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface GlassDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export function GlassDatePicker({ value, onChange }: GlassDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Parse value or use current date
  // Handle empty value gracefully
  const initialDate = value ? new Date(value) : new Date();
  // Ensure invalid dates don't break the calendar (fallback to today)
  const safeDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [currentMonth, setCurrentMonth] = useState(safeDate.getMonth());
  const [currentYear, setCurrentYear] = useState(safeDate.getFullYear());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    // Format to YYYY-MM-DD local time, avoiding UTC timezone shifts
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Generate calendar grid
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const isSelected = value && value === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, i).toDateString();
    
    days.push(
      <button
        key={i}
        type="button"
        onClick={() => handleDateSelect(i)}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all
          ${isSelected ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 
            isToday ? 'bg-white/20 text-white font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'}
        `}
      >
        {i}
      </button>
    );
  }

  const formattedDisplayDate = value 
    ? new Date(value + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Select Date';

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full bg-[#1A1A24] border border-white/10 rounded-xl px-4 py-3 text-white text-base flex justify-between items-center focus:outline-none focus:border-white/30 transition-all"
      >
        <span>{formattedDisplayDate}</span>
        <CalendarIcon className={`w-5 h-5 text-white/50 transition-colors ${isOpen ? 'text-white' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-5 w-[290px] bg-[#1A1A24]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 animate-in fade-in slide-in-from-top-2 origin-top">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={handlePrevMonth} className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-white font-semibold tracking-wide">
              {monthNames[currentMonth]} {currentYear}
            </div>
            <button type="button" onClick={handleNextMonth} className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="w-8 h-8 flex items-center justify-center text-xs font-medium text-white/30 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          
          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>
          
          {/* Footer controls (optional, clear button) */}
          <div className="mt-4 pt-3 border-t border-white/5 flex justify-between">
            <button 
              type="button" 
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="text-xs font-medium text-white/40 hover:text-white transition-colors"
            >
              Clear
            </button>
            <button 
              type="button" 
              onClick={() => {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                onChange(`${yyyy}-${mm}-${dd}`);
                setCurrentMonth(today.getMonth());
                setCurrentYear(today.getFullYear());
              }}
              className="text-xs font-medium text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
