import { describe, expect, it } from "vitest";
import {
  buildDiscoveryLocationPhrase,
  LocationResolverService,
} from "@/services/domain/discovery/location-resolver.service.js";

describe("LocationResolverService", () => {
  it("resolves Finland to country metadata", () => {
    const service = new LocationResolverService();
    const result = service.resolve("Finland");

    expect(result.countryCode).toBe("FI");
    expect(result.countryQid).toBe("Q33");
    expect(result.primaryTld).toBe(".fi");
  });

  it("resolves Houston and common typo Huston to US metadata", () => {
    const service = new LocationResolverService();

    for (const location of ["Houston", "Huston", "companies near Houston"]) {
      const result = service.resolve(location);

      expect(result.countryCode).toBe("US");
      expect(result.countryQid).toBe("Q30");
      expect(result.city).toBe("Houston");
      expect(result.regionHint).toBe("Texas");
    }
  });

  it("resolves United States and US shorthand", () => {
    const service = new LocationResolverService();

    expect(service.resolve("United States").countryQid).toBe("Q30");
    expect(service.resolve("US").countryQid).toBe("Q30");
  });

  it("returns location only for unknown places", () => {
    const service = new LocationResolverService();
    const result = service.resolve("Narnia");

    expect(result).toEqual({ location: "Narnia" });
  });
});

describe("buildDiscoveryLocationPhrase", () => {
  it("includes city and region hints for web search", () => {
    const phrase = buildDiscoveryLocationPhrase({
      location: "Houston",
      city: "Houston",
      regionHint: "Texas",
      countryCode: "US",
      countryQid: "Q30",
      primaryTld: ".com",
    });

    expect(phrase).toBe("Houston Texas");
  });
});
