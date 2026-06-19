import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from './Button';

interface CodeBlockProps {
  code: string;
}

const highlightCustom = (code: string) => {
  // We use dangerouslySetInnerHTML for custom highlighting
  // 1. Strings (values enclosed in quotes)
  // 2. JSON Keys (strings followed by colon)
  // 3. Placeholders: {TOKEN}, {AGENDA_ID}, {BASE_URL}, UUID_DO_LEAD, UUID_DO_CLIENTE, ID_DO_AGENDAMENTO, "2025-03-15", "14:00"

  let html = code
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Placeholders
  const placeholders = [
    'UUID_DO_LEAD',
    'UUID_DO_CLIENTE',
    'ID_DO_AGENDAMENTO',
    '"2025-03-15"',
    '"14:00"',
    '"2025-03-20"',
    '"10:00"'
  ];

  placeholders.forEach((ph) => {
    // We only replace exact matches or specific formats
    const phSafe = ph.replace(/"/g, '&quot;');
    const regex = new RegExp(phSafe, 'g');
    html = html.replace(regex, `<span class="text-amber-500 border-b border-dashed border-amber-500 cursor-help" title="Substitua pelo valor real">${phSafe}</span>`);
  });

  // Highlight specific JSON keys (simple approach: `"key":` -> white)
  // And Strings (simple approach: `"value"` -> pinkish `--primary-light`)
  // Let's do a basic regex for string values in JSON that aren't already highlighted
  // Since we already highlighted placeholders, we have to be careful.

  // Keys
  html = html.replace(/(&quot;\w+&quot;)(:)/g, '<span class="text-white">$1</span>$2');

  // String values (not already containing a span)
  html = html.replace(/(&quot;)([^<&]+)(&quot;)(?!>)/g, '<span class="text-[#FAF0EE]">$1$2$3</span>');

  return { __html: html };
};

export function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-md overflow-hidden bg-[#0D0A0B] dark:bg-[#0D0A0B] border border-border-card my-4 font-mono text-sm">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
        title="Copiar"
      >
        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
      </button>
      <pre className="p-4 overflow-x-auto text-gray-300 w-full" style={{ fontFamily: "'Fira Code', 'Cascadia Code', monospace" }}>
        <code dangerouslySetInnerHTML={highlightCustom(code)} />
      </pre>
    </div>
  );
}
