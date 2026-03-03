import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";

interface DateFilterProps {
  selected: string;
  onSelect: (range: string) => void;
  customRange?: { from: Date; to: Date };
  onCustomRange?: (range: { from: Date; to: Date }) => void;
}

const presets = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
];

const DateFilter = ({ selected, onSelect, customRange, onCustomRange }: DateFilterProps) => {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    customRange ? { from: customRange.from, to: customRange.to } : undefined
  );

  const isCustom = selected === "custom";

  const label = isCustom && customRange
    ? `${format(customRange.from, "dd/MM/yy")} – ${format(customRange.to, "dd/MM/yy")}`
    : presets.find((o) => o.value === selected)?.label ?? selected;

  const handlePreset = (value: string) => {
    onSelect(value);
    setShowCalendar(false);
    setOpen(false);
  };

  const handleApplyCustom = () => {
    if (dateRange?.from && dateRange?.to && onCustomRange) {
      onCustomRange({ from: dateRange.from, to: dateRange.to });
      onSelect("custom");
      setShowCalendar(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setShowCalendar(false); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 bg-secondary/50 border-border/50 hover:bg-secondary">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm">{label}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-card border-border/50" align="end">
        {!showCalendar ? (
          <div className="py-1 min-w-[180px]">
            {presets.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePreset(opt.value)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 transition-colors",
                  selected === opt.value && "bg-primary/10 text-primary"
                )}
              >
                {opt.label}
              </button>
            ))}
            <div className="h-px bg-border/30 my-1" />
            <button
              onClick={() => setShowCalendar(true)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 transition-colors",
                isCustom && "bg-primary/10 text-primary"
              )}
            >
              Personalizado
            </button>
          </div>
        ) : (
          <div className="p-3">
            <CalendarComponent
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={ptBR}
              disabled={(date) => date > new Date()}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="flex items-center justify-between mt-3 px-3 pb-1">
              <span className="text-xs text-muted-foreground">
                {dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, "dd/MM/yyyy")} – ${format(dateRange.to, "dd/MM/yyyy")}`
                  : "Selecione o intervalo"}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCalendar(false)}
                  className="text-xs"
                >
                  Voltar
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyCustom}
                  disabled={!dateRange?.from || !dateRange?.to}
                  className="text-xs"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DateFilter;
