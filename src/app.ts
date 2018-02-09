'use strict';
import * as express from 'express';
import YoutubeRouter from './endpoints/youtube';

class App {
  public express: express.Application;
  constructor() {
    this.express = express();
    this.middleware();
    this.routes();
  }

  private middleware(): void {
    // TODO: add middleware
  }

  private routes(): void {
    this.express.use('/api/youtube', YoutubeRouter);
  }
}
export default new App().express;
