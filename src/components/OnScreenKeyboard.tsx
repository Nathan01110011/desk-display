import React, { useState } from 'react';
import { Delete, Check, X, Eraser, ArrowUpCircle } from 'lucide-react';

interface OnScreenKeyboardProps {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

type KeyboardLayout = 'default' | 'shift' | 'symbols';

export function OnScreenKeyboard({ value, onChange, onClose, onSubmit }: OnScreenKeyboardProps) {
  const [layoutName, setLayoutName] = useState<KeyboardLayout>('default');

  const layouts = {
    default: [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
      ['?123', 'CLEAR', 'SPACE', 'submit']
    ],
    shift: [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['SHIFT_ACTIVE', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'backspace'],
      ['?123', 'CLEAR', 'SPACE', 'submit']
    ],
    symbols: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['@', '#', '$', '%', '&', '*', '-', '+', '(', ')'],
      ['_', '=', '<', '>', '!', '"', '\'', '?', 'backspace'],
      ['ABC', 'CLEAR', 'SPACE', 'submit']
    ]
  };

  const rows = layouts[layoutName];

  const handleKey = (key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
    } else if (key === 'CLEAR') {
      onChange('');
    } else if (key === 'SPACE') {
      onChange(value + ' ');
    } else if (key === 'submit') {
      onSubmit();
    } else if (key === 'SHIFT') {
      setLayoutName('shift');
    } else if (key === 'SHIFT_ACTIVE') {
      setLayoutName('default');
    } else if (key === '?123') {
      setLayoutName('symbols');
    } else if (key === 'ABC') {
      setLayoutName('default');
    } else {
      onChange(value + key);
      // Auto-revert shift to lowercase after a letter is typed
      if (layoutName === 'shift') {
        setLayoutName('default');
      }
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[300] bg-black flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in duration-200">
      <div className="w-full max-w-5xl space-y-10">
        {/* Input Bar */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-8 text-5xl font-bold min-h-[1.8em] flex items-center shadow-inner overflow-hidden whitespace-nowrap">
            {value}<span className="animate-pulse ml-1 text-blue-500">|</span>
          </div>
          <button 
            onPointerDown={onClose} 
            className="p-8 rounded-full bg-white/5 border border-white/10 active:scale-90 transition-all text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X size={56} />
          </button>
        </div>

        {/* Keyboard Grid */}
        <div className="space-y-4">
          {rows.map((row, i) => (
            <div key={i} className="flex justify-center gap-3">
              {row.map((key) => {
                const isBackspace = key === 'backspace';
                const isSubmit = key === 'submit';
                const isClear = key === 'CLEAR';
                const isSpace = key === 'SPACE';
                const isShift = key === 'SHIFT' || key === 'SHIFT_ACTIVE';
                const isModeToggle = key === '?123' || key === 'ABC';

                let widthClass = 'w-20'; // Default key width
                if (isSpace) widthClass = 'w-[400px]';
                else if (isSubmit) widthClass = 'px-12';
                else if (isClear) widthClass = 'px-8';
                else if (isBackspace) widthClass = 'w-28';
                else if (isShift || isModeToggle) widthClass = 'w-28';

                let bgClass = 'bg-white/10 text-white';
                if (isSubmit) bgClass = 'bg-blue-600 text-white';
                else if (isClear) bgClass = 'bg-red-500/20 text-red-400';
                else if (isBackspace || isModeToggle) bgClass = 'bg-white/20 text-white';
                else if (key === 'SHIFT_ACTIVE') bgClass = 'bg-white text-black'; // Highlighted state
                else if (key === 'SHIFT') bgClass = 'bg-white/20 text-white/70';

                return (
                  <button
                    key={key}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleKey(key);
                    }}
                    className={`
                      ${widthClass} ${bgClass}
                      h-24 rounded-2xl flex items-center justify-center text-3xl font-black active:scale-95 transition-all border border-white/5 shadow-lg
                    `}
                  >
                    {isBackspace ? <Delete size={32} /> : 
                     isSubmit ? <Check size={40} strokeWidth={3} /> : 
                     isClear ? <div className="flex items-center gap-2 text-xl"><Eraser size={24} /> CLEAR</div> : 
                     isSpace ? 'SPACE' : 
                     isShift ? <ArrowUpCircle size={32} strokeWidth={key === 'SHIFT_ACTIVE' ? 3 : 2} /> :
                     key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
