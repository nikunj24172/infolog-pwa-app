import type { Model } from "mongoose";
import { Vehicle, Property, Company } from "@/lib/models/SearchRecords";
import type { Permission } from "@/lib/models/User";

export type SearchType = "vehicle" | "property" | "company";

export const SEARCH_PERMISSION: Record<SearchType, Permission> = {
  vehicle: "search:vehicle",
  property: "search:property",
  company: "search:company",
};

export function isSearchType(v: string): v is SearchType {
  return v === "vehicle" || v === "property" || v === "company";
}

/** Map a form field key → the MongoDB path it queries. */
const FIELD_PATHS: Record<SearchType, Record<string, string>> = {
  vehicle: { registration: "registration", vin: "vin", ownerName: "owner.name" },
  property: {
    address: "address",
    erfNumber: "erfNumber",
    ownerName: "ownerName",
    city: "city",
  },
  company: {
    name: "name",
    registrationNumber: "registrationNumber",
    registeredAddress: "registeredAddress",
    director: "directors",
  },
};

const models = { vehicle: Vehicle, property: Property, company: Company } as unknown as Record<
  SearchType,
  Model<Record<string, unknown>>
>;

/**
 * Build an AND query from the provided form fields (each a partial, case-
 * insensitive match) and run it. Fields shorter than 2 chars are ignored.
 * Returns null if no usable field was supplied.
 */
export async function runSearch(
  type: SearchType,
  fields: Record<string, unknown>
): Promise<Record<string, unknown>[] | null> {
  const paths = FIELD_PATHS[type];
  const conditions: Record<string, unknown>[] = [];

  for (const [key, raw] of Object.entries(fields)) {
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value.length < 2 || !paths[key]) continue;
    conditions.push({ [paths[key]]: new RegExp(escapeRegex(value), "i") });
  }

  if (conditions.length === 0) return null;

  const query = conditions.length === 1 ? conditions[0] : { $and: conditions };
  return models[type].find(query).limit(25).lean() as Promise<Record<string, unknown>[]>;
}

/** Human-readable summary of the supplied fields, for the audit trail. */
export function summariseFields(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .filter(([, v]) => typeof v === "string" && v.trim().length >= 2)
    .map(([k, v]) => `${k}=${String(v).trim()}`)
    .join(", ");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
