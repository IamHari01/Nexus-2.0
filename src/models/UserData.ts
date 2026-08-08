import mongoose, { Schema, Document } from 'mongoose';

export interface IUserData extends Document {
  userId: mongoose.Types.ObjectId;
  jobs: unknown[];
  matches: unknown[];
  latestAnalysis: unknown;
  updatedAt: Date;
}

const UserDataSchema = new Schema<IUserData>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    jobs: { type: Schema.Types.Mixed, default: [] },
    matches: { type: Schema.Types.Mixed, default: [] },
    latestAnalysis: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.UserData || mongoose.model<IUserData>('UserData', UserDataSchema);
