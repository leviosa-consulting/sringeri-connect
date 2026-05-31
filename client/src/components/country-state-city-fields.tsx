import { useMemo, useState } from "react";
import { Country, State } from "country-state-city";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CscFieldsProps {
  country: string;
  state: string;
  city: string;
  onCountryChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onCityChange: (v: string) => void;
  variant?: "dialog" | "form";
  idPrefix?: string;
  showRequired?: boolean;
}

function SearchableCombobox({
  value,
  options,
  placeholder,
  disabled = false,
  onSelect,
  testId,
  variant,
}: {
  value: string;
  options: { label: string }[];
  placeholder: string;
  disabled?: boolean;
  onSelect: (v: string) => void;
  testId?: string;
  variant: "dialog" | "form";
}) {
  const [open, setOpen] = useState(false);

  const buttonCls =
    variant === "form"
      ? "w-full justify-between border border-border rounded-md px-3 h-[42px] text-sm bg-white font-normal hover:bg-white"
      : "w-full justify-between mt-1 font-normal";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={buttonCls}
          data-testid={testId}
          type="button"
        >
          <span className={cn("truncate text-left flex-1", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder="Search…" className="h-9" />
          <CommandList className="max-h-56">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.label}
                  value={o.label}
                  onSelect={() => {
                    onSelect(o.label);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4 shrink-0", value === o.label ? "opacity-100" : "opacity-0")}
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function CountryStateCityFields({
  country,
  state,
  city,
  onCountryChange,
  onStateChange,
  onCityChange,
  variant = "form",
  idPrefix = "",
  showRequired = false,
}: CscFieldsProps) {
  const req = showRequired ? " *" : "";

  const countryOptions = useMemo(
    () => Country.getAllCountries().map((c) => ({ label: c.name, isoCode: c.isoCode })),
    []
  );

  const countryCode = useMemo(
    () => countryOptions.find((c) => c.label === country)?.isoCode ?? "",
    [countryOptions, country]
  );

  const stateOptions = useMemo(
    () => (countryCode ? State.getStatesOfCountry(countryCode).map((s) => ({ label: s.name })) : []),
    [countryCode]
  );

  const handleCountryChange = (name: string) => {
    onCountryChange(name);
    onStateChange("");
  };

  const inputCls =
    "w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary";

  if (variant === "dialog") {
    return (
      <>
        <div>
          <Label className="text-xs">Country{req}</Label>
          <SearchableCombobox
            value={country}
            options={countryOptions}
            placeholder="Select Country"
            onSelect={handleCountryChange}
            testId={`${idPrefix}select-country`}
            variant="dialog"
          />
        </div>
        <div>
          <Label className="text-xs">State{req}</Label>
          <SearchableCombobox
            value={state}
            options={stateOptions}
            placeholder={countryCode ? "Select State" : "Select country first"}
            disabled={!countryCode}
            onSelect={onStateChange}
            testId={`${idPrefix}select-state`}
            variant="dialog"
          />
        </div>
        <div>
          <Label className="text-xs">City{req}</Label>
          <Input
            className="mt-1"
            placeholder="Enter city"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            data-testid={`${idPrefix}input-city`}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Country{req}</label>
        <SearchableCombobox
          value={country}
          options={countryOptions}
          placeholder="Select Country"
          onSelect={handleCountryChange}
          testId={`${idPrefix}select-country`}
          variant="form"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">State{req}</label>
        <SearchableCombobox
          value={state}
          options={stateOptions}
          placeholder={countryCode ? "Select State" : "Select country first"}
          disabled={!countryCode}
          onSelect={onStateChange}
          testId={`${idPrefix}select-state`}
          variant="form"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">City{req}</label>
        <input
          type="text"
          className={inputCls}
          placeholder="Enter city"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          data-testid={`${idPrefix}input-city`}
        />
      </div>
    </>
  );
}
