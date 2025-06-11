import mongoose from 'mongoose';

export interface IContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  pronouns: string;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new mongoose.Schema<IContact>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    pronouns: {
      type: String,
      required: true,
      trim: true,
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound indices for common queries
contactSchema.index({ customerId: 1, createdAt: -1 });

export const Contact = mongoose.models.Contact || mongoose.model<IContact>('Contact', contactSchema); 