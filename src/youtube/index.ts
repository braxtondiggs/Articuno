'use strict';
import { Router } from 'express';
import YoutubeController from './youtube.controller';

export class YoutubeRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.getFeed();
  }
  private getFeed() {
    this.router.get('/', YoutubeController.getFeed);
  }
}

export default new YoutubeRouter().router;
