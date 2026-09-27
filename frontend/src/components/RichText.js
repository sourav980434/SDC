'use client';

import React, { useEffect, useRef } from 'react';
import { Bold, Italic, Underline, List, AlignCenter } from 'lucide-react';
import styles from './RichText.module.css';

const TOOLS = [
  { cmd: 'bold', Icon: Bold, title: 'Bold (Ctrl+B)' },
  { cmd: 'italic', Icon: Italic, title: 'Italic (Ctrl+I)' },
  { cmd: 'underline', Icon: Underline, title: 'Underline (Ctrl+U)' },
  { cmd: 'insertUnorderedList', Icon: List, title: 'Bullet list' },
  { cmd: 'justifyCenter', Icon: AlignCenter, title: 'Centre' },
];

const paragraphMode = () => {
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* older browsers */ }
};

/**
 * Small Word-like editor for notes and narrative report text.
 * Uncontrolled: the HTML is (re)loaded only when `resetKey` changes, typing reports back through onChange.
 */
export default function RichText({ html, onChange, resetKey, tall, placeholder, readOnly }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html || '';
    // only when a different test / version / report is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const run = (command, value) => {
    if (readOnly) return;
    ref.current?.focus();
    paragraphMode();
    document.execCommand(command, false, value);
    onChange(ref.current?.innerHTML || '');
  };

  return (
    <div className={styles.rich}>
      {!readOnly && (
        <div className={styles.richBar}>
          {TOOLS.map(({ cmd, Icon, title }) => (
            <button key={cmd} type="button" className={styles.toolBtn} title={title} onMouseDown={e => e.preventDefault()} onClick={() => run(cmd)}>
              <Icon size={14} />
            </button>
          ))}
        </div>
      )}
      <div
        ref={ref}
        className={`${styles.richArea} ${tall ? styles.richAreaTall : ''} ${readOnly ? styles.readOnly : ''}`}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onFocus={paragraphMode}
        onInput={e => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
}
