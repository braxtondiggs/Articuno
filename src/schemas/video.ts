'use strict';
import { Document, Model, model, Schema } from 'mongoose';

export interface IVideo extends Document {
  publishedAt: string;
  title: string;
  description: string;
  id: string;
  url: string;
}

export const VideoSchema: Schema = new Schema({
  description: {
    required: false,
    type: String
  },
  id: {
    required: true,
    type: String
  },
  publishedAt: {
    required: true,
    type: String
  },
  title: {
    required: true,
    type: String
  },
  url: {
    required: true,
    type: String
  },
  youtubeUrl: {
    required: true,
    type: String
  }
}, {
    timestamps: true
  });

export const Video: Model<IVideo> = model<IVideo>('Video', VideoSchema);
