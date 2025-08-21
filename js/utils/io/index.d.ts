
export declare global {

	/**
	 * Assortment of IO functionality for accessing the disk.
	 */
	interface DiskIO {
		isDirectorySync(path: string): boolean;
		existsSync(path: string): boolean;
		readDir(path: string): Promise<Result<string[]>>;
		joinPath(...paths: string[]): string;
	};

}
