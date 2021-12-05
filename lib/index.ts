import {stat, mkdir, rm} from 'fs/promises';
import {spawn} from 'child_process';
import {join} from 'path';
import {format} from 'util';
import {format as dateFormat} from 'date-fns';

import {Options} from './postgres-backup/options';
import {BackupResult, Storage} from './postgres-backup/storages/storage';
import S3Storage from './postgres-backup/storages/s3';

const TMP_DIR  = './tmp';
const TMP_FILE = join(TMP_DIR, 'tmp');

export class PgBackup {
    options: Options;
    storages: Storage[];

    constructor(opts: Options) {
        this.options  = opts;
        this.storages = [];
        if (opts.s3Options)
            this.storages.push(new S3Storage(opts.s3Options));
    }

    async backup(): Promise<BackupResult[]> {
        await this.dumpDB();

        const results: BackupResult[] = await Promise.all(this.storages.map(async storage => storage.backup({
            sourceFile: TMP_FILE,
            name:       PgBackup.getArchiveName(this.options.dbConfig.dbName)
        })));

        await PgBackup.removeTmpFile();

        return results;
    }

    private async dumpDB(): Promise<void> {
        const dbConfig = this.options.dbConfig;
        await PgBackup.checkTmpDirectory();

        const dumpOptions = [
            '-F',
            dbConfig.format,
            '-f',
            TMP_FILE,
            `postgresql://${dbConfig.username && dbConfig.password ? (dbConfig.username + ':' + dbConfig.password) : ''}@${dbConfig.host}:${dbConfig.port}/${dbConfig.dbName}`
        ];

        const dump = spawn('pg_dump', dumpOptions);

        return new Promise<void>((resolve, reject) => {
            let err = null;

            // probable need to handle it another way
            dump.stderr.on('data', (data) => {
                err = data.toString();
            });

            // and maybe should use "exit" instead
            dump.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`dump exited with code ${code}${err ? ': ' + err : ''}`));
                }
            });
        });
    }

    private static getArchiveName(databaseName) {
        return format('%s_%s_dump.tar.gz', databaseName, dateFormat(Date.now(), 'dd-mm-yyyy_hh:mm:ss'))
    }

    private static async removeTmpFile() {
        return rm(TMP_FILE);
    }

    private static async checkTmpDirectory() {
        try {
            await stat(TMP_DIR);
        } catch (e) {
            if (e.code === 'ENOENT') {
                await mkdir(TMP_DIR);
            }
        }
    }
}
