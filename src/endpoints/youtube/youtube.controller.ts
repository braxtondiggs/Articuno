'use strict';
import { NextFunction, Request, Response } from 'express';
import { connect } from 'mongoose';
import { Video } from '../../schemas/video';
const Youtube = require('youtube-api'); // tslint:disable-line no-var-requires
connect(process.env.MONGODB_URI);

export class YoutubeController {
  constructor() {
    Youtube.authenticate({
      key: process.env.GOOGLE_API as string,
      type: 'key'
    });
  }

  public getFeed(req: Request, res: Response, next: NextFunction) {
    const youtube = new YoutubeController();
    Promise.all([youtube.channelsListById(), youtube.getAllVideos()]).then((response) => {
      res.json({ status: response });
    }, (err) => {
      res.status(500).json(err);
    });
  }

  private channelsListById(): Promise<object> {
    return new Promise<object>((resolve, reject) => {
      Youtube.channels.list({
        id: 'UCCVoBkpTwqNECizPG9snwGQ',
        order: 'date',
        part: 'contentDetails'
      }, (err: object, channelInfo: any) => {
        if (err) reject(err);
        Youtube.playlistItems.list({
          part: 'snippet',
          playlistId: channelInfo.items[0].contentDetails.relatedPlaylists.uploads
        }, (_err: object, response: any) => {
          if (_err) reject(_err);
          resolve(response.items);
        });
      });
    });
  }

  private getAllVideos(): Promise<object> {
    return new Promise<object>((resolve, reject) => {
      Video.find({}, (err: any, videos: any) => {
        if (err) reject(err);
        resolve(videos);
      });
    });
  }
}

export default new YoutubeController();
