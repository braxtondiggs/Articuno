'use strict';
import { each, whilst } from 'async';
import { forEach, includes, isNull, isUndefined, map, reject, size, slice, union } from 'lodash';
import { connect } from 'mongoose';
import * as request from 'request';
import { IVideo, Video } from './schemas/video';
const Youtube = require('youtube-api'); // tslint:disable-line no-var-requires
const ytdl = require('ytdl-core'); // tslint:disable-line no-var-requires
const streamingS3 = require('streaming-s3'); // tslint:disable-line no-var-requires
const ffmpeg = require('fluent-ffmpeg'); // tslint:disable-line no-var-requires

class App {
  constructor() {
    this.config();
    this.getFeed();
  }

  public getFeed() {
    function finishResponse(videos: IVideo[]) {
      request.get('https://nosnch.in/2bee449f94', () => {
        console.log('app:finalOuput', { added: videos, size: size(videos) });
      });
    }
    Promise.all([this.channelsListById(), this.getAllVideos()]).then((response) => {
      const videos = slice(reject(response[0], (o: any) =>
        includes(map(response[1] as IVideo[], 'id'), o.snippet.resourceId.videoId)
      ), 0, 1);
      if (size(videos) <= 0) {
        finishResponse(videos);
      } else {
        this.downloadVideos(map(videos, (o: any) =>
          ({
            description: o.snippet.description,
            id: o.snippet.resourceId.videoId,
            publishedAt: o.snippet.publishedAt,
            title: o.snippet.title,
            youtubeUrl: `http://www.youtube.com/watch?v=${o.snippet.resourceId.videoId}`
          })
        ) as any).then((data: IVideo[]) => {
          Video.create(data, (err: any) => {
            if (err) console.error('app:err', err);
            finishResponse(data);
          });
        });
      }
    }, (err) => console.error('app:err', err));
  }

  private channelsListById(): Promise<object> {
    return new Promise<object>((resolve, rej) => {
      let pageToken: string;
      let items: object[] = [];
      whilst(
        () => !isNull(pageToken),
        (callback: any) => {
          this.paginateChannel(pageToken).then((response: any) => {
            pageToken = !isUndefined(response.nextPageToken) ? response.nextPageToken : null;
            items = union(items, response.items);
            callback();
          });
        },
        (err: any) => {
          if (err) return rej(err);
          return resolve(items);
        });
    });
  }

  private paginateChannel(token: string): Promise<object> {
    return new Promise<object>((resolve, rej) => {
      Youtube.channels.list({
        id: 'UCCVoBkpTwqNECizPG9snwGQ',
        order: 'date',
        part: 'contentDetails'
      }, (err: object, channelInfo: any) => {
        if (err) rej(err);
        Youtube.playlistItems.list({
          maxResults: 50,
          pageToken: token,
          part: 'snippet',
          playlistId: channelInfo.items[0].contentDetails.relatedPlaylists.uploads
        }, (_err: object, response: any) => {
          if (_err) rej(_err);
          resolve(response);
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
          new ffmpeg({ source: ytdl(video.youtubeUrl) }).toFormat('mp3').audioBitrate(64).pipe(),
          { accessKeyId: process.env.S3_KEY, secretAccessKey: process.env.S3_SECRET },
          { Bucket: 'articuno', Key: `${video.id}.mp3`, ContentType: 'audio/mpeg' },
          (e: any, resp: any) => {
            if (e) rej(e);
            video.url = resp.Location;
            callback();
          });
        stream.on('finished', (resp: any, stats: any) => console.log('s3:upload', resp));
        stream.on('error', (e: any) => console.error('s3:upload error: ', e));
      }, (err: any) => {
        if (err) rej(err);
        resolve(videos);
      });
    });
  }

  private config() {
    connect(process.env.MONGODB_URI as string);
    Youtube.authenticate({
      key: process.env.GOOGLE_API as string,
      type: 'key'
    });
  }
}

export default new App();
