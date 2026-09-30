"use client";

import React, { useState, useRef } from 'react';
import { Loader2, Keyboard, AlertCircle } from 'lucide-react';
import { OnScreenKeyboard } from './OnScreenKeyboard';

interface IframeWindow extends Window {
  HTMLTextAreaElement: typeof HTMLTextAreaElement;
  HTMLInputElement: typeof HTMLInputElement;
  Event: typeof Event;
  KeyboardEvent: typeof KeyboardEvent;
}

export function TodoView() {
  const [loading, setLoading] = React.useState(true);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [kbValue, setKbValue] = useState('');
  const [configError, setConfigError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Track the active input ourselves so it's not lost when clicking the dashboard button
  const lastActiveRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const handleIframeLoad = () => {
    setLoading(false);
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;

      // Next.js returns a 404 page if the proxy rewrite isn't active (missing ENV var)
      if (doc.title.includes('404') || doc.body.innerHTML.includes('could not be found')) {
        setConfigError(true);
        return;
      }

      // Attach a persistent listener to the iframe's document to remember the last focused input.
      // This solves the issue with password fields losing focus when the parent button is clicked!
      doc.addEventListener('focusin', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          lastActiveRef.current = target as HTMLInputElement | HTMLTextAreaElement;
          console.log("🎯 Tracked iframe input focus:", (target as HTMLInputElement).type || target.tagName);
        }
      });
    } catch (e) {
      console.error("❌ Could not access iframe DOM:", e);
    }
  };

  const handleKeyboardSubmit = () => {
    try {
      const win = iframeRef.current?.contentWindow as IframeWindow | null | undefined;

      // Prefer our internally tracked active element, fallback to the document's active element
      const activeEl = lastActiveRef.current || (iframeRef.current?.contentDocument?.activeElement as HTMLInputElement | HTMLTextAreaElement);

      if (!win) {
        console.error("❌ No DOM access to iframe. Proxy failed or cross-origin blocked.");
        return;
      }

      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        console.log("🚀 DIRECT DOM INJECTION:", kbValue);

        // Grab the native setter from the iframe's window context to bypass React's proxy
        const setter = Object.getOwnPropertyDescriptor(
          activeEl.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype,
          'value'
        )?.set;

        if (setter) {
          setter.call(activeEl, kbValue);
        } else {
          activeEl.value = kbValue;
        }

        // Trigger React's synthetic events inside the iframe
        activeEl.dispatchEvent(new win.Event('input', { bubbles: true }));
        activeEl.dispatchEvent(new win.Event('change', { bubbles: true }));

        // Simulate pressing the Enter key (for inputs that listen to keydown)
        activeEl.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        activeEl.dispatchEvent(new win.KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

        // If the input is inside a form (like Search or Login), natively submit the form!
        const form = activeEl.closest('form');
        if (form) {
          console.log("🚀 Submitting parent form");
          form.requestSubmit();
        }

        // Bring focus back
        activeEl.focus();
      } else {
        console.warn("⚠️ No text box selected in the TODO app. Please tap an input box first!");
      }
    } catch (e) {
      console.error("❌ Critical DOM Injection Error:", e);
    }

    setShowKeyboard(false);
    setKbValue('');
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 rounded-3xl overflow-hidden border border-sky-200/15 relative">
      {loading && !configError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={64} />
          <p className="text-xl font-bold text-white/75 uppercase tracking-widest">Loading Tracker...</p>
        </div>
      )}

      {/* Configuration Error UI */}
      {configError && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-12 text-center gap-6 rounded-3xl">
          <AlertCircle size={80} className="text-red-500" />
          <h2 className="text-4xl font-bold text-white">TODO App Not Configured</h2>
          <p className="text-xl text-white/60 max-w-2xl leading-relaxed">
            The proxy failed to load. Please ensure you have added your <span className="font-mono text-blue-400 bg-white/10 px-2 py-1 rounded">TODO_APP_URL</span> to the <span className="font-mono text-blue-400 bg-white/10 px-2 py-1 rounded">.env.local</span> file and restarted the server.
          </p>
        </div>
      )}

      {!loading && !configError && <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-sky-950/40 px-4 py-3"><h2 className="text-lg font-black">Your tracker</h2><button type="button" onClick={() => setShowKeyboard(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200/20 bg-sky-200/10 px-4 text-sm font-bold text-sky-100"><Keyboard size={20} /> Keyboard</button></header>}
      {!configError && (
        <iframe
          ref={iframeRef}
          src="/todo-proxy"
          title="TODO tracker"
          className="w-full min-h-0 flex-1 border-none"
          onLoad={handleIframeLoad}
          allow="geolocation"
        />
      )}

      {showKeyboard && (
        <OnScreenKeyboard
          value={kbValue}
          onChange={setKbValue}
          onClose={() => setShowKeyboard(false)}
          onSubmit={handleKeyboardSubmit}
        />
      )}
    </div>
  );
}
