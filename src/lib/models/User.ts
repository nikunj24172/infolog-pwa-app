import mongoose, { Schema, model, models } from "mongoose";

export type Role = "officer" | "supervisor" | "admin";

/** Permissions gate what a role can search / do. Sourced from backend (RBAC). */
export type Permission =
  | "search:vehicle"
  | "search:property"
  | "search:company"
  | "session:create"
  | "audit:view";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  permissions: Permission[];
  /** base32 secret for TOTP authenticator apps */
  totpSecret?: string;
  totpEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["officer", "supervisor", "admin"],
      default: "officer",
    },
    permissions: { type: [String], default: [] },
    totpSecret: { type: String, select: false },
    totpEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = (models.User as mongoose.Model<IUser>) || model<IUser>("User", UserSchema);
