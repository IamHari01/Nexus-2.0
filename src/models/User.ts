import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  mobile?: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, sparse: true, trim: true },
    mobile: { type: String, unique: true, sparse: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
