import { useMemo, useState, useEffect } from "react";
import { Country, State, City } from "country-state-city";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OTHER = "__other__";

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

  const allCountries = useMemo(() => Country.getAllCountries(), []);

  const countryCode = useMemo(
    () => allCountries.find((c) => c.name === country)?.isoCode ?? "",
    [allCountries, country]
  );

  const allStates = useMemo(
    () => (countryCode ? State.getStatesOfCountry(countryCode) : []),
    [countryCode]
  );

  const stateCode = useMemo(
    () => allStates.find((s) => s.name === state)?.isoCode ?? "",
    [allStates, state]
  );

  const allCities = useMemo(
    () => (countryCode && stateCode ? City.getCitiesOfState(countryCode, stateCode) : []),
    [countryCode, stateCode]
  );

  const cityNames = useMemo(() => allCities.map((c) => c.name), [allCities]);

  const isManualEntry = city !== "" && cityNames.length > 0 && !cityNames.includes(city);
  const [showManual, setShowManual] = useState(isManualEntry);

  useEffect(() => {
    if (isManualEntry) setShowManual(true);
  }, [isManualEntry]);

  const handleCountryChange = (name: string) => {
    onCountryChange(name);
    onStateChange("");
    onCityChange("");
    setShowManual(false);
  };

  const handleStateChange = (name: string) => {
    onStateChange(name);
    onCityChange("");
    setShowManual(false);
  };

  const handleCitySelect = (val: string) => {
    if (val === OTHER) {
      setShowManual(true);
      onCityChange("");
    } else {
      setShowManual(false);
      onCityChange(val);
    }
  };

  const citySelectValue = showManual
    ? OTHER
    : cityNames.includes(city)
    ? city
    : city
    ? OTHER
    : "";

  if (variant === "dialog") {
    return (
      <>
        <div>
          <Label className="text-xs">Country{req}</Label>
          <Select value={country} onValueChange={handleCountryChange}>
            <SelectTrigger className="mt-1" data-testid={`${idPrefix}select-country`}>
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {allCountries.map((c) => (
                <SelectItem key={c.isoCode} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">State{req}</Label>
          <Select
            value={state}
            onValueChange={handleStateChange}
            disabled={!countryCode}
          >
            <SelectTrigger className="mt-1" data-testid={`${idPrefix}select-state`}>
              <SelectValue
                placeholder={countryCode ? "Select State" : "Select country first"}
              />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {allStates.map((s) => (
                <SelectItem key={s.isoCode} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">City{req}</Label>
          {allCities.length > 0 ? (
            <>
              <Select value={citySelectValue} onValueChange={handleCitySelect}>
                <SelectTrigger className="mt-1" data-testid={`${idPrefix}select-city`}>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {allCities.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER}>Other (type manually)</SelectItem>
                </SelectContent>
              </Select>
              {showManual && (
                <Input
                  className="mt-1"
                  placeholder="Enter city name"
                  value={city}
                  onChange={(e) => onCityChange(e.target.value)}
                  data-testid={`${idPrefix}input-city-manual`}
                />
              )}
            </>
          ) : (
            <Input
              className="mt-1"
              placeholder="Enter city name"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              data-testid={`${idPrefix}input-city`}
            />
          )}
        </div>
      </>
    );
  }

  const inputCls =
    "w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-xs text-muted-foreground mb-1 block";

  return (
    <>
      <div>
        <label className={labelCls}>Country{req}</label>
        <select
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
          className={`${inputCls} appearance-none`}
          data-testid={`${idPrefix}select-country`}
        >
          <option value="">Select Country</option>
          {allCountries.map((c) => (
            <option key={c.isoCode} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>State{req}</label>
        <select
          value={state}
          onChange={(e) => handleStateChange(e.target.value)}
          className={`${inputCls} appearance-none`}
          disabled={!countryCode}
          data-testid={`${idPrefix}select-state`}
        >
          <option value="">
            {countryCode ? "Select State" : "Select country first"}
          </option>
          {allStates.map((s) => (
            <option key={s.isoCode} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>City{req}</label>
        {allCities.length > 0 ? (
          <>
            <select
              value={citySelectValue}
              onChange={(e) => handleCitySelect(e.target.value)}
              className={`${inputCls} appearance-none`}
              data-testid={`${idPrefix}select-city`}
            >
              <option value="">Select City</option>
              {allCities.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value={OTHER}>Other (type manually)</option>
            </select>
            {showManual && (
              <input
                type="text"
                className={`${inputCls} mt-2`}
                placeholder="Enter city name"
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
                data-testid={`${idPrefix}input-city-manual`}
              />
            )}
          </>
        ) : (
          <input
            type="text"
            className={inputCls}
            placeholder="Enter city name"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            data-testid={`${idPrefix}input-city`}
          />
        )}
      </div>
    </>
  );
}
