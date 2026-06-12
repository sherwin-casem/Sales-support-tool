export interface ParijatService {
  name: string;
  description: string;
  valueProps: string[];
  targetIndustries: string[];
}

export const DEFAULT_PARIJAT_SERVICES_CATALOG: ParijatService[] = [
  {
    name: "Custom Software Development",
    description:
      "End-to-end product engineering for web, mobile, and cloud-native applications.",
    valueProps: [
      "Dedicated agile teams with senior engineers",
      "Faster time-to-market with proven delivery frameworks",
      "Scalable architecture aligned to business goals",
    ],
    targetIndustries: ["SaaS", "Fintech", "Healthcare", "E-commerce"],
  },
  {
    name: "AI & Data Solutions",
    description:
      "Machine learning, automation, and analytics to unlock insights and operational efficiency.",
    valueProps: [
      "Production-ready ML pipelines and MLOps",
      "LLM integration and intelligent workflow automation",
      "Data platform modernization",
    ],
    targetIndustries: ["Enterprise", "Logistics", "Manufacturing", "Retail"],
  },
  {
    name: "Cloud & DevOps",
    description:
      "Cloud migration, infrastructure automation, and 24/7 reliability engineering.",
    valueProps: [
      "AWS, Azure, and GCP expertise",
      "CI/CD and infrastructure-as-code",
      "Cost optimization and security hardening",
    ],
    targetIndustries: ["Technology", "Media", "Financial Services"],
  },
];

export const PARIJAT_ORG_SLUG = "parijat";
export const PARIJAT_ORG_NAME = "Parijat";
