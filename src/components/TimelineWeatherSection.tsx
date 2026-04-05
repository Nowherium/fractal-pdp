import type { WeatherCoefficients } from "../types";

import CollapsibleSection from "./ui/CollapsibleSection";

const weatherFields: Array<{
  key: keyof WeatherCoefficients;
  label: string;
}> = [
  { key: "nrt", label: "🍗 Nrt" },
  { key: "eau", label: "💧 Eau" },
  { key: "med", label: "💊 Med" },
  { key: "mat", label: "🧱 Mat" },
];

interface TimelineWeatherSectionProps {
  meteo: WeatherCoefficients;
  open: boolean;
  isPastLune: boolean;
  onToggle: (open: boolean) => void;
  onWeatherChange: (
    field: keyof WeatherCoefficients,
    rawValue: string | number,
  ) => void;
}

function TimelineWeatherSection({
  meteo,
  open,
  isPastLune,
  onToggle,
  onWeatherChange,
}: TimelineWeatherSectionProps) {
  return (
    <CollapsibleSection
      open={open}
      onToggle={onToggle}
      title={
        <>
          <span aria-hidden='true'>🌦️</span>
          <span>Météo de la lune</span>
        </>
      }
      contentClassName='mt-2 grid w-full grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2'
    >
      {weatherFields.map((field) => (
        <label key={field.key} className='flex flex-col gap-1'>
          <span>{field.label} :</span>
          <input
            type='number'
            className='w-20'
            value={meteo?.[field.key] ?? 1}
            min='0'
            max='1'
            step='0.05'
            disabled={isPastLune}
            onChange={(event) => onWeatherChange(field.key, event.target.value)}
          />
        </label>
      ))}
    </CollapsibleSection>
  );
}

export default TimelineWeatherSection;
