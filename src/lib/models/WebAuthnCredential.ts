import mongoose, { Schema, model, models } from "mongoose";

/** A registered biometric/platform authenticator (WebAuthn passkey). */
export interface IWebAuthnCredential {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** base64url-encoded credential id */
  credentialID: string;
  /** base64url-encoded COSE public key */
  publicKey: string;
  counter: number;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
  createdAt: Date;
}

const WebAuthnCredentialSchema = new Schema<IWebAuthnCredential>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    credentialID: { type: String, required: true, unique: true, index: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, default: 0 },
    transports: { type: [String], default: [] },
    deviceType: { type: String, default: "singleDevice" },
    backedUp: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const WebAuthnCredential =
  (models.WebAuthnCredential as mongoose.Model<IWebAuthnCredential>) ||
  model<IWebAuthnCredential>("WebAuthnCredential", WebAuthnCredentialSchema);
