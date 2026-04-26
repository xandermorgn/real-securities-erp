'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { ChevronDown, Plus, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ESOption {
  id: string;
  label: string;
  canDelete?: boolean;
}

export interface ESAddField {
  key: string;
  label: string;
  type?: 'text' | 'time';
  placeholder?: string;
}

interface EditableSelectProps {
  label?: string;
  value: string;
  options: ESOption[];
  placeholder?: string;
  required?: boolean;
  addFields: ESAddField[];
  addLabel?: string;
  error?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (values: Record<string, string>) => void | Promise<void>;
}

const EMPTY_VALUES = (fields: ESAddField[]) =>
  fields.reduce<Record<string, string>>((acc, f) => ({ ...acc, [f.key]: '' }), {});

export default function EditableSelect({
  label,
  value,
  options,
  placeholder = 'Select…',
  required,
  addFields,
  addLabel = 'Add',
  error,
  onSelect,
  onDelete,
  onAdd,
}: EditableSelectProps) {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addValues, setAddValues] = useState<Record<string, string>>(() =>
    EMPTY_VALUES(addFields)
  );
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowAdd(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
    setShowAdd(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  const handleAdd = useCallback(async () => {
    const firstKey = addFields[0]?.key;
    if (!firstKey || !addValues[firstKey]?.trim()) return;
    setAdding(true);
    try {
      await onAdd(addValues);
      setAddValues(EMPTY_VALUES(addFields));
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  }, [addFields, addValues, onAdd]);

  const handleAddKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleAdd();
    }
  };

  return (
    <div className="w-full" ref={ref}>
      {label && (
        <label className="mb-1 block text-[13px] font-medium text-slate-600">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className={cn(
          'glass-input flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-shadow',
          error && 'border-red-400',
          open && 'ring-2 ring-sky-400/30'
        )}
      >
        <span className={cn(selected ? 'text-slate-900' : 'text-slate-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1.5 max-h-72 w-full min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {/* Options list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {options.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400">No options yet.</p>
            )}
            {options.map((opt) => {
              const active = opt.id === value;
              return (
                <div
                  key={opt.id}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 px-3 py-2 text-sm select-none',
                    active
                      ? 'bg-sky-50 text-sky-900'
                      : 'text-slate-800 hover:bg-slate-50'
                  )}
                  onClick={() => handleSelect(opt.id)}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-sky-600" />}
                  {opt.canDelete ? (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, opt.id)}
                      className="ml-auto shrink-0 rounded p-0.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      title="Delete"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="ml-auto h-3.5 w-3.5 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Add section */}
          <div className="border-t border-slate-100">
            {!showAdd ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                {addLabel}
              </button>
            ) : (
              <div className="space-y-2 p-3">
                {addFields.map((field, i) => (
                  <div key={field.key}>
                    <label className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {field.label}
                    </label>
                    <input
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      value={addValues[field.key] ?? ''}
                      autoFocus={i === 0}
                      onChange={(e) =>
                        setAddValues((v) => ({ ...v, [field.key]: e.target.value }))
                      }
                      onKeyDown={handleAddKeyDown}
                      className="glass-input w-full px-2.5 py-1.5 text-sm"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={adding || !addValues[addFields[0]?.key]?.trim()}
                    onClick={() => void handleAdd()}
                    className="flex-1 rounded-lg bg-[#1E3A5F] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-[#16304f]"
                  >
                    {adding ? 'Adding…' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdd(false);
                      setAddValues(EMPTY_VALUES(addFields));
                    }}
                    className="rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
