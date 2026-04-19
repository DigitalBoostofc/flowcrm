export interface StoredFile {
  url: string;
  key: string;
}

export interface StorageProvider {
  upload(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<StoredFile>;

  delete(key: string): Promise<void>;
}
