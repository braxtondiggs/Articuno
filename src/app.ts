'use strict';
import * as express from 'express';
import { connect } from 'mongoose';
import YoutubeRouter from './endpoints/youtube';

class App {
  public express: express.Application;
  constructor() {
    this.express = express();
    this.middleware();
    this.routes();
    this.config();
  }

  private middleware(): void {
    // TODO: add middleware
  }

  private routes(): void {
    this.express.use('/api/youtube', YoutubeRouter);
  }

  private config(): void {
    connect(process.env.MONGODB_URI);
  }
}
export default new App().express;
