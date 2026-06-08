import type {
  DiscoveryCriteria,
  RawDiscoveryCandidate,
} from "@/types/agents/company-discovery.types.js";

export interface DiscoverySource {
  readonly name: string;
  readonly tier: 1 | 2;
  discover(criteria: DiscoveryCriteria): Promise<RawDiscoveryCandidate[]>;
}

export class DiscoverySourceError extends Error {
  constructor(
    readonly source: string,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DiscoverySourceError";
  }
}
