import type { LocationContext } from "@/types/agents/company-discovery.types.js";

interface CountryDefinition {
  countryCode: string;
  countryQid: string;
  primaryTld: string;
  aliases: string[];
}

interface CityDefinition {
  city: string;
  countryCode: string;
  regionHint?: string;
  aliases: string[];
}

const COUNTRY_DEFINITIONS: CountryDefinition[] = [
  {
    countryCode: "FI",
    countryQid: "Q33",
    primaryTld: ".fi",
    aliases: ["finland", "suomi"],
  },
  {
    countryCode: "DE",
    countryQid: "Q183",
    primaryTld: ".de",
    aliases: ["germany", "deutschland"],
  },
  {
    countryCode: "US",
    countryQid: "Q30",
    primaryTld: ".com",
    aliases: [
      "united states",
      "united states of america",
      "usa",
      "u.s.",
      "u.s.a.",
      "us",
      "america",
    ],
  },
  {
    countryCode: "GB",
    countryQid: "Q145",
    primaryTld: ".co.uk",
    aliases: ["united kingdom", "uk", "great britain", "england", "britain"],
  },
  {
    countryCode: "SE",
    countryQid: "Q34",
    primaryTld: ".se",
    aliases: ["sweden", "sverige"],
  },
];

const CITY_DEFINITIONS: CityDefinition[] = [
  {
    city: "Houston",
    countryCode: "US",
    regionHint: "Texas",
    aliases: ["houston", "huston"],
  },
  {
    city: "New York",
    countryCode: "US",
    regionHint: "New York",
    aliases: ["new york", "new york city", "nyc"],
  },
  {
    city: "San Francisco",
    countryCode: "US",
    regionHint: "California",
    aliases: ["san francisco", "sf"],
  },
  {
    city: "Los Angeles",
    countryCode: "US",
    regionHint: "California",
    aliases: ["los angeles", "la"],
  },
  {
    city: "Chicago",
    countryCode: "US",
    regionHint: "Illinois",
    aliases: ["chicago"],
  },
  {
    city: "Austin",
    countryCode: "US",
    regionHint: "Texas",
    aliases: ["austin"],
  },
  {
    city: "Dallas",
    countryCode: "US",
    regionHint: "Texas",
    aliases: ["dallas"],
  },
  {
    city: "Seattle",
    countryCode: "US",
    regionHint: "Washington",
    aliases: ["seattle"],
  },
  {
    city: "Boston",
    countryCode: "US",
    regionHint: "Massachusetts",
    aliases: ["boston"],
  },
  {
    city: "Berlin",
    countryCode: "DE",
    aliases: ["berlin"],
  },
  {
    city: "Helsinki",
    countryCode: "FI",
    aliases: ["helsinki"],
  },
  {
    city: "Stockholm",
    countryCode: "SE",
    aliases: ["stockholm"],
  },
  {
    city: "London",
    countryCode: "GB",
    aliases: ["london"],
  },
];

const countryByCode = new Map(
  COUNTRY_DEFINITIONS.map((definition) => [definition.countryCode, definition]),
);

function matchesAlias(normalized: string, alias: string): boolean {
  if (normalized === alias) {
    return true;
  }

  if (alias.length >= 4 && normalized.includes(alias)) {
    return true;
  }

  return false;
}

export class LocationResolverService {
  resolve(location: string): LocationContext {
    const normalized = location.trim().toLowerCase();

    for (const definition of COUNTRY_DEFINITIONS) {
      if (definition.aliases.some((alias) => matchesAlias(normalized, alias))) {
        return toCountryContext(location, definition);
      }
    }

    for (const cityDefinition of CITY_DEFINITIONS) {
      if (cityDefinition.aliases.some((alias) => matchesAlias(normalized, alias))) {
        const country = countryByCode.get(cityDefinition.countryCode);

        if (!country) {
          continue;
        }

        return {
          location,
          city: cityDefinition.city,
          regionHint: cityDefinition.regionHint,
          countryCode: country.countryCode,
          countryQid: country.countryQid,
          primaryTld: country.primaryTld,
        };
      }
    }

    return { location };
  }
}

function toCountryContext(
  location: string,
  definition: CountryDefinition,
): LocationContext {
  return {
    location,
    countryCode: definition.countryCode,
    countryQid: definition.countryQid,
    primaryTld: definition.primaryTld,
  };
}

export const locationResolverService = new LocationResolverService();

export function buildDiscoveryLocationPhrase(context: LocationContext): string {
  if (context.city) {
    return context.regionHint
      ? `${context.city} ${context.regionHint}`
      : context.city;
  }

  return context.location;
}
