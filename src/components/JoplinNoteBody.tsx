import type { ReactNode } from 'react';

// Render the daily template and common Markdown as React text elements.
// Raw HTML, embedded resources, and links cannot execute or change the note.
function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\x60[^\x60]+\x60)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.charCodeAt(0) === 96 && part.charCodeAt(part.length - 1) === 96) {
      return <code key={index} className="rounded bg-white/10 px-1.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export function JoplinNoteBody({ body }: { body: string }) {
  const blocks: ReactNode[] = [];
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*\x60{3}/.test(line)) {
      const code: string[] = [];
      const key = index;
      while (++index < lines.length && !/^\s*\x60{3}/.test(lines[index])) code.push(lines[index]);
      blocks.push(<pre key={key} className="my-4 overflow-x-auto rounded-xl bg-white/5 p-4 text-[0.8em]"><code>{code.join('\n')}</code></pre>);
      continue;
    }
    if (!line.trim()) {
      blocks.push(<div key={index} className="h-3" />);
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push(<h3 key={index} className="mb-3 mt-5 text-[1.15em] font-black tracking-tight text-white">{inline(heading[2])}</h3>);
      continue;
    }
    const task = /^(\s*)[-*+]\s+\[([ xX])\]\s*(.*)$/.exec(line);
    if (task) {
      const done = task[2].toLowerCase() === 'x';
      blocks.push(
        <div key={index} className="my-3 flex items-start gap-4" style={{ marginLeft: Math.min(task[1].length, 16) * 8 }}>
          <input type="checkbox" checked={done} disabled aria-label={task[3] || 'Empty task'} className="mt-[0.2em] h-[0.85em] w-[0.85em] shrink-0 accent-emerald-400 disabled:opacity-100" />
          <span className={done ? 'text-white/40 line-through' : 'text-white/85'}>{inline(task[3] || '…')}</span>
        </div>
      );
      continue;
    }
    const bullet = /^(\s*)([-*+]|\d+[.)])\s+(.+)$/.exec(line);
    if (bullet) {
      blocks.push(<div key={index} className="my-2 flex gap-4" style={{ marginLeft: Math.min(bullet[1].length, 16) * 8 }}><span aria-hidden="true">{/^\d/.test(bullet[2]) ? bullet[2] : '•'}</span><span>{inline(bullet[3])}</span></div>);
      continue;
    }
    blocks.push(<p key={index} className="whitespace-pre-wrap leading-relaxed">{inline(line)}</p>);
  }
  return <div className="break-words text-white/75">{blocks}</div>;
}
