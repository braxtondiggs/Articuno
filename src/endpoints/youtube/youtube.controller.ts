'use strict';
import { each } from 'async';
import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import { forEach, includes, map, reject, size, slice } from 'lodash';
import * as path from 'path';
import { IVideo, Video } from '../../schemas/video';
const Youtube = require('youtube-api'); // tslint:disable-line no-var-requires
const youtubedl = require('youtube-dl'); // tslint:disable-line no-var-requires
const streamingS3 = require('streaming-s3'); // tslint:disable-line no-var-requires

export class YoutubeController {
  constructor() {
    Youtube.authenticate({
      key: process.env.GOOGLE_API as string,
      type: 'key'
    });
  }

  public getFeed(req: Request, res: Response, next: NextFunction) {
    const youtube = new YoutubeController();
    function finishResponse(videos: IVideo[]) {
      // https://nosnch.in/2bee449f94
      res.json({ added: videos, size: size(videos) });
    }
    Promise.all([youtube.channelsListById(), youtube.getAllVideos()]).then((response) => {
      const videos = slice(reject(response[0], (o: any) =>
        includes(map(response[1] as IVideo[], 'id'), o.snippet.resourceId.videoId)
      ), 0, 1);
      if (size(videos) <= 0) finishResponse(videos);
      youtube.downloadVideos(map(videos, (o: any) =>
        ({
          id: o.snippet.resourceId.videoId,
          url: `http://www.youtube.com/watch?v=${o.snippet.resourceId.videoId}`
        })
      )).then(() => {
        finishResponse(videos);
      });
    }, (err) => {
      res.status(500).json(err);
    });
  }

  private channelsListById(): Promise<object> {
    return new Promise<object>((resolve, rej) => {
      Youtube.channels.list({
        id: 'UCCVoBkpTwqNECizPG9snwGQ',
        order: 'date',
        part: 'contentDetails'
      }, (err: object, channelInfo: any) => {
        if (err) rej(err);
        Youtube.playlistItems.list({
          part: 'snippet',
          playlistId: channelInfo.items[0].contentDetails.relatedPlaylists.uploads
        }, (_err: object, response: any) => {
          if (_err) rej(_err);
          resolve(response.items);
        });
      });
    });
  }

  private getAllVideos(): Promise<object> {
    return new Promise<object>((resolve, rej) => {
      Video.find({}, (err: any, videos: any) => {
        if (err) rej(err);
        resolve(videos);
      });
    });
  }

  private downloadVideos(videos: any): Promise<object> {
    return new Promise<object>((resolve, rej) => {
      each(videos, (video: any, callback: any) => {
        const stream = new streamingS3(
          youtubedl(video.url, ['-x', '--audio-format', 'mp3'], { cwd: __dirname }),
          { accessKeyId: process.env.S3_KEY, secretAccessKey: process.env.S3_SECRET },
          { Bucket: 'example.streaming-s3.com', Key: `{$video.id}.mp3`, ContentType: 'audio/mpeg' },
          (e: any, resp: any, stats: any) => {
            if (e) rej(e);
            console.log('Upload stats: ', stats);
            console.log('Upload successful: ', resp);
            callback();
          });
      }, (err: any) => {
        if (err) rej(err);
        resolve();
      });
    });
  }
}

export default new YoutubeController();
