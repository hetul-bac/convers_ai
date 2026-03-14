export type LookupLineType = "mobile" | "landline" | "voip";

export type PhoneCountry = {
  country: string;
  isoCode: string;
  dialCode: string;
  flag: string;
  localLength: number;
  carriers: string[];
  lineTypes: LookupLineType[];
  localPrefixes: string[];
};

export type PhoneLookupResult = {
  phone: string;
  country: string;
  country_code: string;
  carrier: string;
  is_valid: boolean;
  line_type: LookupLineType;
  flag: string;
};

export const phoneCountries: PhoneCountry[] = [
  {
    country: "United States",
    isoCode: "US",
    dialCode: "+1",
    flag: "🇺🇸",
    localLength: 10,
    carriers: ["Verizon", "AT&T", "T-Mobile"],
    lineTypes: ["mobile", "mobile", "voip"],
    localPrefixes: ["415", "646", "917"],
  },
  {
    country: "India",
    isoCode: "IN",
    dialCode: "+91",
    flag: "🇮🇳",
    localLength: 10,
    carriers: ["Jio", "Airtel", "Vi"],
    lineTypes: ["mobile", "mobile", "voip"],
    localPrefixes: ["987", "888", "912"],
  },
  {
    country: "United Kingdom",
    isoCode: "GB",
    dialCode: "+44",
    flag: "🇬🇧",
    localLength: 10,
    carriers: ["EE", "Vodafone UK", "O2"],
    lineTypes: ["mobile", "mobile", "voip"],
    localPrefixes: ["7700", "7711", "7722"],
  },
  {
    country: "Brazil",
    isoCode: "BR",
    dialCode: "+55",
    flag: "🇧🇷",
    localLength: 11,
    carriers: ["Vivo", "Claro", "TIM"],
    lineTypes: ["mobile", "mobile", "landline"],
    localPrefixes: ["119", "219", "319"],
  },
  {
    country: "Singapore",
    isoCode: "SG",
    dialCode: "+65",
    flag: "🇸🇬",
    localLength: 8,
    carriers: ["Singtel", "StarHub", "M1"],
    lineTypes: ["mobile", "voip", "landline"],
    localPrefixes: ["8", "9", "6"],
  },
];

const countriesByDialCode = [...phoneCountries].sort(
  (left, right) => right.dialCode.length - left.dialCode.length,
);

function stableIndex(input: string, length: number) {
  if (length <= 1) {
    return 0;
  }

  let hash = 0;

  for (const character of input) {
    hash = (hash * 31 + character.charCodeAt(0)) % 2147483647;
  }

  return hash % length;
}

function randomDigits(length: number) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

export function normalizePhoneNumber(input: string) {
  const trimmed = input.trim();
  const prefixed = trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
  return `+${prefixed.replace(/[^\d]/g, "")}`;
}

export function findCountryByCode(countryCode: string) {
  const normalized = countryCode.trim().toUpperCase();

  return (
    phoneCountries.find((country) => country.isoCode === normalized) ??
    phoneCountries.find((country) => country.dialCode === countryCode.trim()) ??
    null
  );
}

function findCountryByPhone(phone: string) {
  return (
    countriesByDialCode.find((country) => phone.startsWith(country.dialCode)) ??
    null
  );
}

export function lookupPhoneNumber(input: string): PhoneLookupResult {
  const phone = normalizePhoneNumber(input);
  const country = findCountryByPhone(phone);

  if (!country) {
    return {
      phone,
      country: "Unknown",
      country_code: "--",
      carrier: "Unknown",
      is_valid: false,
      line_type: "voip",
      flag: "🌐",
    };
  }

  const localNumber = phone.slice(country.dialCode.length);
  const digitsOnly = /^[0-9]+$/.test(localNumber);
  const isValid = digitsOnly && localNumber.length === country.localLength;
  const carrier =
    country.carriers[stableIndex(localNumber, country.carriers.length)] ??
    country.carriers[0];
  const lineType =
    country.lineTypes[stableIndex(phone, country.lineTypes.length)] ?? "mobile";

  return {
    phone,
    country: country.country,
    country_code: country.isoCode,
    carrier,
    is_valid: isValid,
    line_type: lineType,
    flag: country.flag,
  };
}

export function provisionPhoneNumber(countryCode: string) {
  const country = findCountryByCode(countryCode);

  if (!country) {
    return null;
  }

  const prefix =
    country.localPrefixes[
      stableIndex(`${country.isoCode}-${Date.now()}`, country.localPrefixes.length)
    ] ?? country.localPrefixes[0] ?? "";
  const remainingLength = Math.max(0, country.localLength - prefix.length);
  const localNumber = `${prefix}${randomDigits(remainingLength)}`;
  const lookup = lookupPhoneNumber(`${country.dialCode}${localNumber}`);

  return {
    country,
    number: lookup.phone,
    carrier: lookup.carrier,
  };
}
