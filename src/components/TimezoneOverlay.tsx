import { useEffect, useMemo, useState } from 'react';
import { Clock3, Globe2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimezoneOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ZoneConfig {
  id: string;
  label: string;
  timeZone: string;
  appliesTo: string;
  isCanada?: boolean;
}

const ZONES: ZoneConfig[] = [
  {
    id: 'canada-vancouver',
    label: 'Canada West (Vancouver)',
    timeZone: 'America/Vancouver',
    appliesTo: 'Canada (BC), US Pacific states',
    isCanada: true,
  },
  {
    id: 'canada-edmonton',
    label: 'Canada Mountain (Edmonton)',
    timeZone: 'America/Edmonton',
    appliesTo: 'Canada (AB), US Mountain states',
    isCanada: true,
  },
  {
    id: 'canada-winnipeg',
    label: 'Canada Central (Winnipeg)',
    timeZone: 'America/Winnipeg',
    appliesTo: 'Canada (MB, SK), US Central states',
    isCanada: true,
  },
  {
    id: 'canada-toronto',
    label: 'Canada East (Toronto)',
    timeZone: 'America/Toronto',
    appliesTo: 'Canada (ON, QC), US Eastern states',
    isCanada: true,
  },
  {
    id: 'canada-halifax',
    label: 'Canada Atlantic (Halifax)',
    timeZone: 'America/Halifax',
    appliesTo: 'Canada Atlantic provinces',
    isCanada: true,
  },
  {
    id: 'canada-stjohns',
    label: "Canada Newfoundland (St John's)",
    timeZone: 'America/St_Johns',
    appliesTo: 'Canada (Newfoundland and Labrador)',
    isCanada: true,
  },
  {
    id: 'uk-london',
    label: 'London',
    timeZone: 'Europe/London',
    appliesTo: 'United Kingdom, Ireland (seasonal)',
  },
  {
    id: 'de-berlin',
    label: 'Berlin',
    timeZone: 'Europe/Berlin',
    appliesTo: 'Germany, Central Europe',
  },
  {
    id: 'in-kolkata',
    label: 'India (Kolkata)',
    timeZone: 'Asia/Kolkata',
    appliesTo: 'India (IST)',
  },
  {
    id: 'jp-tokyo',
    label: 'Tokyo',
    timeZone: 'Asia/Tokyo',
    appliesTo: 'Japan (JST)',
  },
  {
    id: 'au-sydney',
    label: 'Sydney',
    timeZone: 'Australia/Sydney',
    appliesTo: 'Australia East (AEST/AEDT)',
  },
];

function getOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const utcGuess = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );

  return Math.round((utcGuess - date.getTime()) / 60000);
}

function formatDifference(minutes: number): string {
  if (minutes === 0) {
    return 'same as local';
  }

  const sign = minutes > 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;

  if (mins === 0) {
    return `${sign}${hours}h vs local`;
  }

  return `${sign}${hours}h ${mins}m vs local`;
}

function formatClock(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(date);
  const tzAbbrev = parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  const label = formatter
    .format(date)
    .replace(',', '')
    .replace(tzAbbrev, '')
    .trim();

  return { label, tzAbbrev };
}

export default function TimezoneOverlay({ isOpen, onClose }: TimezoneOverlayProps) {
  const [now, setNow] = useState(() => new Date());
  const [localTimeZone, setLocalTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const tick = () => {
      setNow(new Date());
      setLocalTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    };

    tick();
    const interval = window.setInterval(tick, 30000);
    return () => window.clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const rows = useMemo(() => {
    const localOffset = getOffsetMinutes(now, localTimeZone);

    const localClock = formatClock(now, localTimeZone);
    const localRow = {
      id: 'local',
      label: 'Your Local Time',
      appliesTo: localTimeZone,
      clockLabel: localClock.label,
      tzAbbrev: localClock.tzAbbrev,
      difference: 'local',
      isCanada: false,
    };

    const zoneRows = ZONES.map((zone) => {
      const zoneClock = formatClock(now, zone.timeZone);
      const zoneOffset = getOffsetMinutes(now, zone.timeZone);

      return {
        id: zone.id,
        label: zone.label,
        appliesTo: zone.appliesTo,
        clockLabel: zoneClock.label,
        tzAbbrev: zoneClock.tzAbbrev,
        difference: formatDifference(zoneOffset - localOffset),
        isCanada: Boolean(zone.isCanada),
      };
    });

    return [localRow, ...zoneRows];
  }, [now, localTimeZone]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6" onClick={onClose}>
      <div className="w-full max-w-6xl max-h-[92vh] rounded-xl border border-border/70 bg-card/92 backdrop-blur-lg shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
              <Globe2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm md:text-base font-semibold tracking-tight truncate">Conference Timezones</p>
              <p className="text-[11px] md:text-xs text-muted-foreground truncate">Auto-updating local and Canada-centric event times</p>
            </div>
          </div>

          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close timezone panel">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-4 py-3 border-b border-border/60 bg-muted/25 text-[11px] md:text-xs text-muted-foreground">
          AtmosphereConf 2026 is in Canada. Use these rows to convert from your local timezone to conference time quickly.
        </div>

        <div className="p-3 md:p-4 overflow-y-auto max-h-[calc(92vh-108px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 md:gap-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className={`rounded-lg border p-3 ${
                  row.id === 'local'
                    ? 'border-primary/45 bg-primary/10'
                    : row.isCanada
                      ? 'border-border bg-muted/30'
                      : 'border-border/70 bg-card/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold truncate">{row.label}</p>
                  <div className="text-[10px] px-2 py-0.5 rounded-full border border-border/70 bg-background/60 text-muted-foreground whitespace-nowrap">
                    {row.tzAbbrev || 'TZ'}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <Clock3 className="h-3.5 w-3.5 text-primary" />
                  <span>{row.clockLabel}</span>
                </div>

                <p className="mt-1 text-[11px] text-muted-foreground">{row.appliesTo}</p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">{row.difference}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
