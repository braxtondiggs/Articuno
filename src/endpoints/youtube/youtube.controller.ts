'use strict';
import { each } from 'async';
import { NextFunction, Request, Response } from 'express';
import { forEach, includes, map, reject, size, slice } from 'lodash';
import * as request from 'request';
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
      request.get('https://nosnch.in/2bee449f94', () => res.json({ added: videos, size: size(videos) }));
    }
    Promise.all([youtube.channelsListById(), youtube.getAllVideos()]).then((response) => {
      const videos = slice(reject(response[0], (o: any) =>
        includes(map(response[1] as IVideo[], 'id'), o.snippet.resourceId.videoId)
      ), 0, 10);
      if (size(videos) <= 0) finishResponse(videos);
      youtube.downloadVideos(map(videos, (o: any) =>
        ({
          description: o.snippet.description,
          id: o.snippet.resourceId.videoId,
          publishedAt: o.snippet.publishedAt,
          title: o.snippet.title,
          youtubeUrl: `http://www.youtube.com/watch?v=${o.snippet.resourceId.videoId}`
        })
      ) as any).then((data: IVideo[]) => {
        Video.create(data, (err: any) => {
          if (err) res.status(500).json(err);
          finishResponse(data);
        });
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

  private downloadVideos(videos: any): Promise<any> {
    return new Promise<any>((resolve, rej) => {
      each(videos, (video: any, callback: any) => {
        const stream = new streamingS3(
          youtubedl(video.youtubeUrl, ['-x', '--audio-format', 'mp3'], { cwd: __dirname }),
          { accessKeyId: process.env.S3_KEY, secretAccessKey: process.env.S3_SECRET },
          { Bucket: 'articuno', Key: `${video.id}.mp3`, ContentType: 'audio/mpeg' },
          (e: any, resp: any) => {
            if (e) rej(e);
            video.url = resp.Location;
            callback();
          });
      }, (err: any) => {
        if (err) rej(err);
        resolve(videos);
      });
    });
  }
}

export default new YoutubeController();
