export class DomainRateLimiterService {
  private readonly domainLastRequest = new Map<string, number>();
  private readonly domainQueues = new Map<string, Promise<void>>();
  private activeGlobal = 0;
  private globalWaiters: Array<() => void> = [];

  constructor(
    private readonly domainDelayMs: number,
    private readonly globalConcurrency: number,
  ) {}

  async runExclusive<T>(domain: string, operation: () => Promise<T>): Promise<T> {
    await this.acquireGlobal();

    try {
      const previous = this.domainQueues.get(domain) ?? Promise.resolve();
      let release!: () => void;
      const current = new Promise<void>((resolve) => {
        release = resolve;
      });

      this.domainQueues.set(
        domain,
        previous.then(() => current),
      );

      await previous;
      await this.waitForDomainSlot(domain);

      try {
        return await operation();
      } finally {
        release();
        this.domainLastRequest.set(domain, Date.now());
      }
    } finally {
      this.releaseGlobal();
    }
  }

  private async waitForDomainSlot(domain: string): Promise<void> {
    const lastRequest = this.domainLastRequest.get(domain);

    if (lastRequest === undefined) {
      return;
    }

    const elapsed = Date.now() - lastRequest;
    const remaining = this.domainDelayMs - elapsed;

    if (remaining > 0) {
      await sleep(remaining);
    }
  }

  private async acquireGlobal(): Promise<void> {
    if (this.activeGlobal < this.globalConcurrency) {
      this.activeGlobal += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      this.globalWaiters.push(resolve);
    });

    this.activeGlobal += 1;
  }

  private releaseGlobal(): void {
    this.activeGlobal -= 1;
    const next = this.globalWaiters.shift();

    if (next) {
      next();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
