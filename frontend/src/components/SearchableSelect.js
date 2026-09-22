'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import styles from './SearchableSelect.module.css';

/**
 * Drop-in replacement for <select> with type-to-search.
 *
 *   <SearchableSelect className={styles.formSelect} value={deptCode} onChange={e => setDeptCode(e.target.value)}>
 *     <option value="">-- Select --</option>
 *     {departments.map(d => <option key={d.Code} value={d.Code}>{d.Descr}</option>)}
 *   </SearchableSelect>
 *
 * - Same props as <select>: value, onChange (receives { target: { value } }), disabled, required,
 *   className, style, onKeyDown, ref (.focus() / .select()), and <option> children.
 * - Type to filter, ArrowUp/Down to move, Enter to pick, Esc to close.
 * - Enter picks the highlighted option and is then passed to onKeyDown, so "Enter moves to the
 *   next field" forms keep working; when the list is closed Enter goes straight to onKeyDown.
 * - The list is portalled to <body>, so it is never clipped by scrolling cards or modals.
 */

// Plain text of an <option>'s children ("{d.name} ({d.code})" -> "Dr. X (D0000390)")
function textOf(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement(node)) return textOf(node.props.children);
  return '';
}

function collectOptions(children) {
  const list = [];
  React.Children.forEach(children, child => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) {
      list.push(...collectOptions(child.props.children));
    } else if (child.type === 'option') {
      const label = textOf(child.props.children);
      list.push({
        value: child.props.value !== undefined ? String(child.props.value) : label,
        label,
        disabled: !!child.props.disabled,
      });
    }
  });
  return list;
}

const SearchableSelect = forwardRef(function SearchableSelect(
  { value, onChange, children, disabled, required, className, style, onKeyDown, placeholder, id, name, title },
  ref
) {
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState(null);

  useImperativeHandle(ref, () => inputRef.current, []);

  const options = useMemo(() => collectOptions(children), [children]);
  const current = options.find(o => o.value === String(value ?? ''));
  const shownLabel = current ? current.label : (value ? String(value) : '');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    const words = q.split(/\s+/);
    return options.filter(o => {
      const hay = `${o.label} ${o.value}`.toLowerCase();
      return words.every(w => hay.includes(w));
    });
  }, [options, query]);

  const measure = useCallback(() => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
  }, []);

  const openList = (startQuery = '') => {
    if (disabled) return;
    measure();
    setQuery(startQuery);
    const idx = startQuery ? 0 : Math.max(0, options.findIndex(o => o.value === String(value ?? '')));
    setActive(idx);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const pick = (opt) => {
    if (!opt || opt.disabled) return;
    if (opt.value !== String(value ?? '')) {
      onChange?.({ target: { value: opt.value, name }, currentTarget: { value: opt.value, name } });
    }
    close();
  };

  // Keep the list attached to the field while the page scrolls or resizes
  useEffect(() => {
    if (!open) return;
    const onMove = () => measure();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, measure]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (inputRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the highlighted row visible
  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (!open) {
        openList();
        return;
      }
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive(i => (filtered.length ? (i + step + filtered.length) % filtered.length : 0));
      return;
    }

    if (e.key === 'Enter') {
      if (open) {
        e.preventDefault();
        pick(filtered[active]);
      }
      onKeyDown?.(e);
      return;
    }

    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
      return;
    }

    if (e.key === 'Tab') {
      if (open) close();
      onKeyDown?.(e);
      return;
    }

    onKeyDown?.(e);
  };

  const list = open && rect && typeof document !== 'undefined' ? createPortal(
    <div
      ref={listRef}
      className={styles.list}
      role="listbox"
      style={{
        left: rect.left,
        width: Math.max(rect.width, 220),
        ...(window.innerHeight - rect.bottom < 280 && rect.top > 280
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      }}
    >
      {filtered.length === 0 ? (
        <div className={styles.empty}>No match for &quot;{query}&quot;</div>
      ) : (
        filtered.map((opt, i) => (
          <div
            key={`${opt.value}-${i}`}
            data-index={i}
            role="option"
            aria-selected={opt.value === String(value ?? '')}
            className={[
              styles.option,
              i === active ? styles.optionActive : '',
              opt.value === String(value ?? '') ? styles.optionSelected : '',
              opt.disabled ? styles.optionDisabled : '',
            ].join(' ')}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
          >
            {opt.label || ' '}
          </div>
        ))
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className={styles.wrap} style={style?.width ? { width: style.width } : undefined}>
      <input
        ref={inputRef}
        id={id}
        title={title}
        className={`${className || ''} ${styles.input}`}
        style={style}
        value={open ? query : shownLabel}
        placeholder={open ? (shownLabel || 'Type to search...') : (placeholder || '')}
        onChange={(e) => {
          if (!open) openList(e.target.value);
          else {
            setQuery(e.target.value);
            setActive(0);
          }
        }}
        onMouseDown={() => { if (!open) openList(); }}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          if (listRef.current && listRef.current.contains(e.relatedTarget)) return;
          close();
        }}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={open}
      />
      <ChevronDown size={16} className={styles.chevron} />
      {/* Hidden field so required validation still works inside forms */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className={styles.requiredProxy}
          value={value ?? ''}
          onChange={() => {}}
          required
          name={name}
        />
      )}
      {list}
    </div>
  );
});

export default SearchableSelect;
