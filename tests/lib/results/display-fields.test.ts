import { describe, expect, it } from "vitest";
import {
  displayValue,
  formatLocation,
  formatWebsiteLabel,
  getCompanyDisplayName,
  hasDisplayValue,
} from "@/lib/results/display-fields";

describe("display-fields", () => {
  const profile = {
    companyName: "Acme Logistics Oy",
    description: "Freight provider.",
    industry: "logistics",
    products: [],
    services: ["Freight"],
    targetCustomers: [],
    estimatedCompanySize: "100-200",
    city: "helsinki",
    country: "finland",
    decisionMaker: "Jane Doe, CEO",
    decisionMakerEmail: "jane@acme.fi",
    decisionMakerPhone: "+358 9 123 4567",
    decisionMakerLinkedInUrl: "https://linkedin.com/in/janedoe",
    linkedInUrl: "https://linkedin.com/company/acme",
    xUrl: null,
    email: "info@acme.fi",
    phone: "+358 9 765 4321",
    revenue: "10M-50M EUR",
  };

  it("formats empty values as em dash", () => {
    expect(displayValue(null)).toBe("—");
    expect(displayValue("unknown")).toBe("—");
    expect(hasDisplayValue(null)).toBe(false);
    expect(hasDisplayValue("info@acme.fi")).toBe(true);
  });

  it("formats location from profile city and country", () => {
    expect(formatLocation(profile, null)).toBe("Helsinki, Finland");
  });

  it("falls back to search criteria location", () => {
    expect(
      formatLocation(
        { ...profile, city: "unknown", country: "unknown" },
        { industry: "logistics", location: "Finland", employeeRange: "50-200" },
      ),
    ).toBe("Finland");
  });

  it("formats website labels from URLs", () => {
    expect(formatWebsiteLabel("https://www.acme.fi/about")).toBe("acme.fi");
  });

  it("prefers extracted company name for display", () => {
    expect(getCompanyDisplayName(profile, "Stored Name", "acme.fi")).toBe("Acme Logistics Oy");
  });
});
