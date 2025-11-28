// adm-zipの型定義

declare module 'adm-zip' {
  interface IZipEntry {
    entryName: string;
    comment: string;
    isDirectory: boolean;
    header: any;
    data: Buffer;
    getData(): Buffer;
    getDataAsync(callback: (data: Buffer, err?: Error) => void): void;
  }

  interface AdmZipOptions {
    method?: number;
    noSort?: boolean;
  }

  class AdmZip {
    constructor(pathToZip?: string | Buffer, options?: AdmZipOptions);
    addFile(entryName: string, data: Buffer | string, comment?: string, attr?: number): void;
    addFileComment(entryName: string, comment: string): void;
    addLocalFile(localPath: string, zipPath?: string): void;
    addLocalFolder(localPath: string, zipPath?: string, filter?: RegExp): void;
    deleteFile(entryName: string): boolean;
    getEntries(): IZipEntry[];
    getEntry(entryName: string): IZipEntry | null;
    getEntryComment(entryName: string): string | null;
    readFile(entryName: string): Buffer | null;
    toBuffer(): Buffer;
    writeZip(targetFileName: string, callback?: (error?: Error) => void): void;
    extractAllTo(targetPath: string, overwrite?: boolean): boolean;
    extractEntryTo(entryName: string, targetPath: string, maintainEntryPath?: boolean, overwrite?: boolean): boolean;
  }

  export = AdmZip;
}

