export interface Storage {
    getLabel(): string;

    backup(data: BackupData): Promise<BackupResult>;
}

export interface BackupResult {
    readonly success: boolean;
    readonly error?: string;
    readonly label: string;
}

export interface BackupData {
    readonly data?: string;
    readonly sourceFile: string;
    readonly name: string;
}
