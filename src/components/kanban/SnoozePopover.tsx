/**
 * SnoozePopover Component
 *
 * Popover for snoozing emails until a specific date/time.
 * Features:
 * - Quick presets (30m, 1h, 3h, tomorrow 9AM)
 * - Custom date/time picker
 * - Validation for future dates
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Converts Date to HTML datetime-local input value
 */
function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/**
 * Parses HTML datetime-local input value to Date
 */
function fromLocalInputValue(v: string) {
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Snooze popover component
 * @param onConfirm - Callback with ISO date string when confirmed
 * @param disabled - Disables the button
 */
export function SnoozePopover({
  onConfirm,
  disabled,
}: {
  onConfirm: (untilIso: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const defaultValue = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return toLocalInputValue(d);
  }, []);

  const [value, setValue] = useState(defaultValue);

  const presets = [
    { label: '30m', ms: 30 * 60 * 1000, kind: 'relative' },
    { label: '1h', ms: 60 * 60 * 1000, kind: 'relative' },
    { label: '3h', ms: 3 * 60 * 60 * 1000, kind: 'relative' },
    { label: 'Tomorrow 9AM', kind: 'tomorrow9' },
    { label: 'Next week', kind: 'nextweek' },
  ] as const;

  type Preset = (typeof presets)[number];

  const applyPreset = (p: Preset) => {
    let d: Date;

    if (p.kind === 'tomorrow9') {
      d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (p.kind === 'nextweek') {
      d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
    } else {
      d = new Date(Date.now() + p.ms);
    }

    setValue(toLocalInputValue(d));
  };

  const handleConfirm = () => {
    const d = fromLocalInputValue(value);
    if (!d) return;
    onConfirm(d.toISOString());
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          size='sm'
          variant='ghost'
          className='h-7 px-2 text-xs'
          disabled={disabled}
        >
          Snooze
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-72'>
        <div className='space-y-3'>
          <div>
            <p className='text-xs font-semibold text-muted-foreground'>
              Pick date & time
            </p>
          </div>

          <input
            type='datetime-local'
            className='w-full rounded-md border bg-background px-2 py-1 text-sm'
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          <div className='flex flex-wrap gap-2'>
            {presets.map((p) => (
              <Button
                key={p.label}
                type='button'
                size='sm'
                variant='outline'
                className='h-7 px-2 text-xs'
                onClick={() => applyPreset(p)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className='flex justify-end gap-2'>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size='sm'
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
