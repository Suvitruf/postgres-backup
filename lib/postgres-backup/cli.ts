import * as dotenv from 'dotenv';
import * as cron from 'node-cron'

dotenv.config();

import {program} from 'commander';
import * as pkg from './../../package.json';
import {Options} from './options';
import {PgBackup} from '../index';
import {CONFIG_MESSAGES} from './config-messages';

const options: Options = {
    dbConfig:    {
        host:   '127.0.0.1',
        port:   5432,
        format: 't'
    },
    immediately: false
};

if (process.env.PG_DB_NAME)
    options.dbConfig.dbName = process.env.PG_DB_NAME;
if (process.env.PG_USER)
    options.dbConfig.username = process.env.PG_USER;
if (process.env.PG_PASSWORD)
    options.dbConfig.password = process.env.PG_PASSWORD;
if (process.env.PG_HOST)
    options.dbConfig.host = process.env.PG_HOST;
if (process.env.PG_PORT)
    options.dbConfig.port = parseInt(process.env.PG_PORT, 10);
if (process.env.PG_FORMAT)
    options.dbConfig.format = process.env.PG_FORMAT;
if (process.env.TIMER)
    options.timer = process.env.TIMER;
if (process.env.IMMEDIATELY)
    options.immediately = true;

if (process.env.S3_ACCESS_KEY_ID)
    options.s3Options = {
        bucket:          process.env.S3_BUCKET,
        accessKeyId:     process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        endpoint:        process.env.S3_ENDPOINT,
        // path:            process.env.S3_PATH ? process.env.S3_PATH : '/'
    };

program.version(pkg.version)
       .option('-a --access-key-id <value>', CONFIG_MESSAGES.ConfigS3AccessKeyId)
       .option('-s --secret-access-key <value>', CONFIG_MESSAGES.ConfigS3SecretAccessKey)
       .option('-e --endpoint <value>', CONFIG_MESSAGES.ConfigS3Endpoint)
       .option('-n --dbname <value>', CONFIG_MESSAGES.ConfigDatabaseName)
       .option('-h --host <value>', CONFIG_MESSAGES.ConfigPostgresHost)
       .option('-p --port <value>', CONFIG_MESSAGES.ConfigPostgresPort)
       .option('-U --username <value>', CONFIG_MESSAGES.ConfigPostgresUser)
       .option('-W --password <value>', CONFIG_MESSAGES.ConfigPostgresPassword)
       .option('-F --format <value>', CONFIG_MESSAGES.ConfigPostgresFormat)
       .option('-i --immediately', CONFIG_MESSAGES.ConfigImmediately)
       .option('-t --timer <value>', CONFIG_MESSAGES.ConfigTimer)
       .parse(process.argv);

const opts = program.opts();

if (opts.accessKeyId) {
    options.s3Options = Object.assign({}, options.s3Options ? options.s3Options : {}, {
        ...(opts.accessKeyId ? {accessKeyId: opts.accessKeyId} : {}),
        ...(opts.bucket ? {bucket: opts.bucket} : {}),
        ...(opts.secretAccessKey ? {secretAccessKey: opts.secretAccessKey} : {}),
        ...(opts.endpoint ? {endpoint: opts.endpoint} : {}),
        ...(opts.path ? {path: opts.path} : {})
    });
}

if (opts.dbname)
    options.dbConfig.dbName = opts.dbname;
if (opts.host)
    options.dbConfig.host = opts.host;
if (opts.port)
    options.dbConfig.port = parseInt(opts.port, 10);
if (opts.password)
    options.dbConfig.password = opts.password;
if (opts.username)
    options.dbConfig.username = opts.username;
if (opts.format)
    options.dbConfig.format = opts.format;

if (!options.dbConfig.dbName)
    throw new Error('no_db_name');

if (options.s3Options) {
    if (!options.s3Options.secretAccessKey)
        throw new Error('no_s3_secret_key');
    if (!options.s3Options.accessKeyId)
        throw new Error('no_s3_access_key_id');
}

if (!options.immediately && !options.timer)
    throw new Error('not_set_execution_type');

const pgBackup = new PgBackup(options);

if (options.immediately)
    pgBackup.backup()
            .then(res => {
                console.log(res);
            })
            .catch(e => {
                console.error(e);
            });

if (options.timer) {
    cron.schedule(options.timer, () => {
        pgBackup.backup()
                .then(res => {
                    console.log(res);
                })
                .catch(e => {
                    console.error(e);
                });
    }, {
        timezone: 'Etc/GMT+0'
    }).start();
}
