import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateSpinnerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
}

export function DateSpinner({ value, onChange, className }: DateSpinnerProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const selectedDay = value?.getDate();
  const selectedMonth = value?.getMonth();
  const selectedYear = value?.getFullYear();

  const handleDayChange = (day: string) => {
    const newDate = new Date(
      selectedYear || currentYear - 25,
      selectedMonth ?? 0,
      parseInt(day)
    );
    onChange(newDate);
  };

  const handleMonthChange = (month: string) => {
    const newDate = new Date(
      selectedYear || currentYear - 25,
      parseInt(month),
      selectedDay || 1
    );
    onChange(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(
      parseInt(year),
      selectedMonth ?? 0,
      selectedDay || 1
    );
    onChange(newDate);
  };

  return (
    <div className={`flex gap-2 ${className || ''}`}>
      <Select value={selectedDay?.toString()} onValueChange={handleDayChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          {days.map(day => (
            <SelectItem key={day} value={day.toString()}>
              {day}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedMonth?.toString()} onValueChange={handleMonthChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month, index) => (
            <SelectItem key={month} value={index.toString()}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedYear?.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map(year => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
