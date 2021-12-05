import * as AWS from 'aws-sdk';

import {BackupData, BackupResult, Storage} from './storage';
import {createReadStream} from 'fs';
import {S3Options} from '../options';

export default class S3Storage implements Storage {
    options: S3Options;
    s3: AWS.S3;

    constructor(opts: S3Options) {
        this.options = opts;
        this.s3      = new AWS.S3({
            ...(opts.endpoint ? {endpoint: opts.endpoint} : {}),
            accessKeyId:     opts.accessKeyId,
            secretAccessKey: opts.secretAccessKey
        });
    }

    async backup(data: BackupData): Promise<BackupResult> {
        try {
            await this.uploadBinary(data);

            return {
                success: true,
                label:   this.getLabel()
            }
        } catch (e) {
            return {
                success: false,
                error:   e.message,
                label:   this.getLabel()
            }
        }
    }

    private async uploadBinary(data: BackupData) {
        const params = {
            Body:   data.data ? data.data : createReadStream(data.sourceFile),
            Bucket: this.options.bucket,
            Key:    data.name,
            ACL:    'private'
        };

        return new Promise((resolve, reject) => {
            this.s3.putObject(params, (err, response) => {
                if (err)
                    return reject(err);

                resolve(response);
            });
        });
    }

    getLabel(): string {
        return 'S3';
    }
}
