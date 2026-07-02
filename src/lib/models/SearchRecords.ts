import mongoose, { Schema, model, models } from "mongoose";

/**
 * The three MVR search domains. In production these would be served by the
 * existing InfoLog REST APIs; here we back them with real MongoDB collections
 * so the app works end-to-end.
 */

/* ----------------------------- Vehicle ----------------------------- */

export interface IVehicleOwner {
  name: string;
  type: "Company" | "Individual";
  address: string;
  mailingAddress: string;
  acquisitionDate: string; // ISO date
}

export interface IVehicleChecks {
  advertising: string;
  policeStolen: string;
  writtenOff: string;
}

export interface IVehicle {
  registration: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  color: string;
  usage: string; // e.g. "Private Passenger"
  vehicleType: string; // e.g. "Goods Van/Truck/Utility"
  bodyStyle: string;
  fuelType: string;
  reportedStolen: boolean;
  registrationDate: string; // ISO date
  registrationStatus: string; // e.g. "Complete"
  latestOdometer: number;
  registeredOwners: number;
  dateOfReport: string; // ISO date
  owner: IVehicleOwner;
  checks: IVehicleChecks;
  status: "clean" | "flagged" | "stolen";
}

const VehicleSchema = new Schema<IVehicle>({
  registration: { type: String, required: true, uppercase: true, index: true },
  make: String,
  model: String,
  year: Number,
  vin: { type: String, index: true },
  color: String,
  usage: { type: String, default: "Private Passenger" },
  vehicleType: { type: String, default: "Passenger Car/Van" },
  bodyStyle: String,
  fuelType: String,
  reportedStolen: { type: Boolean, default: false },
  registrationDate: String,
  registrationStatus: { type: String, default: "Complete" },
  latestOdometer: Number,
  registeredOwners: { type: Number, default: 1 },
  dateOfReport: String,
  owner: {
    name: String,
    type: { type: String, enum: ["Company", "Individual"], default: "Individual" },
    address: String,
    mailingAddress: String,
    acquisitionDate: String,
  },
  checks: {
    advertising: { type: String, default: "No results found" },
    policeStolen: { type: String, default: "No results found" },
    writtenOff: { type: String, default: "No results found" },
  },
  status: { type: String, enum: ["clean", "flagged", "stolen"], default: "clean" },
});
VehicleSchema.index({ registration: "text", "owner.name": "text", vin: "text" });

/* ----------------------------- Property ----------------------------- */

export interface IProperty {
  erfNumber: string;
  address: string;
  suburb: string;
  city: string;
  ownerName: string;
  ownerType: "Company" | "Individual";
  valuation: number;
  landArea: string;
  registrationStatus: string;
  lastTransferDate: string;
  status: "clean" | "flagged";
}

const PropertySchema = new Schema<IProperty>({
  erfNumber: { type: String, required: true, index: true },
  address: { type: String, index: true },
  suburb: String,
  city: String,
  ownerName: String,
  ownerType: { type: String, enum: ["Company", "Individual"], default: "Individual" },
  valuation: Number,
  landArea: String,
  registrationStatus: { type: String, default: "Complete" },
  lastTransferDate: String,
  status: { type: String, enum: ["clean", "flagged"], default: "clean" },
});
PropertySchema.index({ erfNumber: "text", address: "text", ownerName: "text" });

/* ----------------------------- Company ----------------------------- */

export interface ICompany {
  registrationNumber: string;
  name: string;
  status: "active" | "deregistered" | "in-business-rescue";
  incorporationDate: string;
  directors: string[];
  registeredAddress: string;
  vatNumber: string;
  industry: string;
}

const CompanySchema = new Schema<ICompany>({
  registrationNumber: { type: String, required: true, index: true },
  name: { type: String, index: true },
  status: {
    type: String,
    enum: ["active", "deregistered", "in-business-rescue"],
    default: "active",
  },
  incorporationDate: String,
  directors: { type: [String], default: [] },
  registeredAddress: String,
  vatNumber: String,
  industry: String,
});
CompanySchema.index({ registrationNumber: "text", name: "text", vatNumber: "text" });

export const Vehicle =
  (models.Vehicle as mongoose.Model<IVehicle>) || model<IVehicle>("Vehicle", VehicleSchema);
export const Property =
  (models.Property as mongoose.Model<IProperty>) || model<IProperty>("Property", PropertySchema);
export const Company =
  (models.Company as mongoose.Model<ICompany>) || model<ICompany>("Company", CompanySchema);
