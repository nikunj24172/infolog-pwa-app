import { Badge } from "@/components/ui";

export type SearchType = "vehicle" | "property" | "company";

export const SEARCH_TABS: {
  type: SearchType;
  label: string;
  icon: string;
  placeholder: string;
}[] = [
  { type: "vehicle", label: "Vehicle", icon: "🚗", placeholder: "Reg, owner or VIN" },
  { type: "property", label: "Property", icon: "🏠", placeholder: "Title, address or owner" },
  { type: "company", label: "Company", icon: "🏢", placeholder: "NZBN, name or GST" },
];

type Tone = "muted" | "ok" | "warn" | "danger" | "accent";
type Chip = { label: string; tone: Tone };

export type Rendered = {
  title: string;
  subtitle: string;
  plate?: string; // registration, shown as a number-plate in the report hero
  statusChip: Chip;
  chips: Chip[];
  sections: { heading: string; rows: [string, string][] }[];
};

export function Chips({ chips }: { chips: Chip[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <Badge key={i} tone={c.tone}>
          {c.label}
        </Badge>
      ))}
    </div>
  );
}

/* ---------- formatting helpers ---------- */
function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
const nzd = (n: unknown) =>
  typeof n === "number" ? `$${n.toLocaleString("en-NZ")}` : String(n ?? "—");
const s = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));

/** The primary address to plot on the map, per record type. */
export function mapAddress(type: SearchType, row: Record<string, unknown>): string | null {
  if (type === "vehicle") return ((row.owner as Record<string, unknown>)?.address as string) || null;
  if (type === "property")
    return [row.address, row.suburb, row.city].filter(Boolean).join(", ") || null;
  return (row.registeredAddress as string) || null;
}

/** Owner/entity name to label the map pin. */
export function mapLabel(type: SearchType, row: Record<string, unknown>): string {
  if (type === "vehicle") return ((row.owner as Record<string, unknown>)?.name as string) || "";
  if (type === "property") return (row.ownerName as string) || "";
  return (row.name as string) || "";
}

/* ---------- per-type renderers ---------- */
export function renderResult(type: SearchType, row: Record<string, unknown>): Rendered {
  if (type === "vehicle") return renderVehicle(row);
  if (type === "property") return renderProperty(row);
  return renderCompany(row);
}

function renderVehicle(v: Record<string, unknown>): Rendered {
  const owner = (v.owner ?? {}) as Record<string, unknown>;
  const checks = (v.checks ?? {}) as Record<string, unknown>;
  const stolen = v.reportedStolen === true;
  return {
    title: `${s(v.year)} ${s(v.make)} ${s(v.model)}`,
    subtitle: `VIN ${s(v.vin)} · Reported ${fmtDate(v.dateOfReport as string)}`,
    plate: s(v.registration),
    statusChip: stolen
      ? { label: "Reported stolen", tone: "danger" }
      : { label: "Not stolen", tone: "ok" },
    chips: [
      { label: "📱 Mobile query", tone: "accent" },
      stolen
        ? { label: "Reported stolen", tone: "danger" }
        : { label: "Not stolen", tone: "ok" },
    ],
    sections: [
      {
        heading: "MVR vehicle details",
        rows: [
          ["Usage", s(v.usage)],
          ["Vehicle type", s(v.vehicleType)],
          ["Body / fuel", `${s(v.bodyStyle)} · ${s(v.fuelType)}`],
          ["Colour", s(v.color)],
          ["Reported stolen", stolen ? "Yes" : "No"],
          ["Registration date", fmtDate(v.registrationDate as string)],
          ["Registration status", s(v.registrationStatus)],
          ["Latest odometer", `${s(v.latestOdometer)} km`],
          ["Date of report", fmtDate(v.dateOfReport as string)],
        ],
      },
      {
        heading: `Current owner · ${s(v.registeredOwners)} registered owner${
          v.registeredOwners === 1 ? "" : "s"
        }`,
        rows: [
          ["Name", s(owner.name)],
          ["Type", s(owner.type)],
          ["Address", s(owner.address)],
          ["Mailing address", s(owner.mailingAddress)],
          ["Acquisition date", fmtDate(owner.acquisitionDate as string)],
        ],
      },
      {
        heading: "Checks",
        rows: [
          ["Vehicle advertising", s(checks.advertising)],
          ["Police stolen history", s(checks.policeStolen)],
          ["Written-off check", s(checks.writtenOff)],
        ],
      },
    ],
  };
}

function renderProperty(p: Record<string, unknown>): Rendered {
  const flagged = p.status === "flagged";
  return {
    title: s(p.address),
    subtitle: `${s(p.suburb)}, ${s(p.city)} · ${s(p.erfNumber)}`,
    statusChip: flagged ? { label: "flagged", tone: "warn" } : { label: "clean", tone: "ok" },
    chips: [{ label: "📱 Mobile query", tone: "accent" }, flagged ? { label: "Flagged", tone: "warn" } : { label: "Clean", tone: "ok" }],
    sections: [
      {
        heading: "Property details",
        rows: [
          ["Title reference", s(p.erfNumber)],
          ["Address", s(p.address)],
          ["Suburb / city", `${s(p.suburb)}, ${s(p.city)}`],
          ["Land area", s(p.landArea)],
          ["Capital valuation", nzd(p.valuation)],
          ["Registration status", s(p.registrationStatus)],
          ["Last transfer", fmtDate(p.lastTransferDate as string)],
        ],
      },
      {
        heading: "Owner",
        rows: [
          ["Owner", s(p.ownerName)],
          ["Owner type", s(p.ownerType)],
        ],
      },
    ],
  };
}

function renderCompany(c: Record<string, unknown>): Rendered {
  const status = String(c.status ?? "");
  const tone: Tone = status === "active" ? "ok" : status === "deregistered" ? "danger" : "warn";
  return {
    title: s(c.name),
    subtitle: `${s(c.registrationNumber)} · ${status}`,
    statusChip: { label: status || "—", tone },
    chips: [{ label: "📱 Mobile query", tone: "accent" }, { label: status || "—", tone }],
    sections: [
      {
        heading: "Company details",
        rows: [
          ["Registration no.", s(c.registrationNumber)],
          ["Status", status],
          ["Incorporated", fmtDate(c.incorporationDate as string)],
          ["Industry", s(c.industry)],
          ["Registered address", s(c.registeredAddress)],
          ["GST number", s(c.vatNumber)],
        ],
      },
      {
        heading: "Directors",
        rows: [["Directors", (c.directors as string[] | undefined)?.join(", ") || "—"]],
      },
    ],
  };
}
