
export declare global {

	/**
	 * Assortment of IO functionality for accessing the disk.
	 */
	interface DiskIO {
		existsSync(path: string): boolean;
		isDirectorySync(path: string): boolean;
		readDir(path: string): Promise<Result<string[]>>;
		readFile(path: string): Promise<Result<Buffer>>;
		readFileSync(path: string): Result<Buffer>;
		createDir(path: string, recursive: boolean): Promise<Result<void>>;
		writeFile(path: string, data: string): Promise<Result<void>>;
		writeFileSync(path: string, data: string): Result<void>;
		joinPath(...paths: string[]): string;
	};

}
