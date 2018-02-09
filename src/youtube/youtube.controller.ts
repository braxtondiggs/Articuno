'use strict';
import { NextFunction, Request, Response } from 'express';

export class YoutubeController {
  public getFeed(req: Request, res: Response, next: NextFunction) {
    res.json({ status: true });
  }
}

export default new YoutubeController();
