import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

type Props = {
  id: string;
  value: string;
  options: readonly string[];
  isOptionDisabled: (time: string) => boolean;
  isInvalid: boolean;
  onChange: (time: string) => void;
  onBlur: () => void;
};

export const TimeSelect = ({
  id,
  value,
  options,
  isOptionDisabled,
  isInvalid,
  onChange,
  onBlur,
}: Props) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger id={id} aria-invalid={isInvalid} onBlur={onBlur} className="w-full font-mono">
      <SelectValue placeholder="--:--" />
    </SelectTrigger>
    <SelectContent className="max-h-72">
      {options.map((time) => (
        <SelectItem key={time} value={time} disabled={isOptionDisabled(time)} className="font-mono">
          {time}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
