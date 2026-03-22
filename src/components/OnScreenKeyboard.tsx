import React from 'react';
import { Delete, Check, X, Eraser } from 'lucide-react';

interface OnScreenKeyboardProps {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function OnScreenKeyboard({ value, onChange, onClose, onSubmit }: OnScreenKeyboardProps) {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'backspace'],
    ['CLEAR', 'SPACE', 'submit']
  ];

  const handleKey = (key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
    } else if (key === 'CLEAR') {
      onChange('');
    } else if (key === 'SPACE') {
      onChange(value + ' ');
    } else if (key === 'submit') {
      onSubmit();
    } else {
      onChange(value + key);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[300] bg-black flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in duration-200">
      <div className="w-full max-w-5xl space-y-10">
        {/* Input Bar */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-8 text-5xl font-bold min-h-[1.8em] flex items-center shadow-inner">
            {value}<span className="animate-pulse ml-1 text-blue-500">|</span>
          </div>
          <button 
            onPointerDown={onClose} 
            className="p-8 rounded-full bg-white/5 border border-white/10 active:scale-90 transition-all text-white/40"
          >
            <X size={56} />
          </button>
        </div>

        {/* Keyboard Grid */}
        <div className="space-y-5">
          {rows.map((row, i) => (
            <div key={i} className="flex justify-center gap-4">
              {row.map((key) => {
                const isBackspace = key === 'backspace';
                const isSubmit = key === 'submit';
                const isClear = key === 'CLEAR';
                const isSpace = key === 'SPACE';

                return (
                  <button
                    key={key}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleKey(key);
                    }}
                    className={`
                      ${isSpace ? 'w-[400px]' : isSubmit ? 'bg-blue-600 px-12' : isClear ? 'bg-red-500/20 text-red-400 px-8' : isBackspace ? 'w-24 bg-white/20' : 'w-20 bg-white/10'}
                      h-28 rounded-2xl flex items-center justify-center text-3xl font-black active:scale-90 transition-all border border-white/5 shadow-xl
                    `}
                  >
                    {isBackspace ? <Delete size={36} /> : 
                     isSubmit ? <Check size={40} strokeWidth={3} /> : 
                     isClear ? <div className="flex items-center gap-2"><Eraser size={28} /> CLEAR</div> : 
                     isSpace ? 'SPACE' : key}
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
