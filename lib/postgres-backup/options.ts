export interface Options {
    dbConfig?: DBConfig;
    s3Options?: S3Options;
    timer?: string;
    immediately: boolean;
}

export interface DBConfig {
    username?: string;
    password?: string;
    host: string;
    port: number;
    dbName?: string;
    format: string;
}

export interface S3Options {
    readonly accessKeyId?: string;
    readonly secretAccessKey?: string;
    readonly endpoint?: string;
    readonly bucket?: string;
    // readonly path?: string;
}
