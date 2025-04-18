export interface StorageInterface<T> {
    read(file: string): Promise<T>;
    write(file: string, contents: T): Promise<void>;
    delete(file: string): Promise<void>;
}
