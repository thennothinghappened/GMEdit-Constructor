
export type MockDiskNode = MockDiskFile | MockDiskDirectory;

export type MockDiskFile = {
	type: 'file';
	data: string;
};

export type MockDiskDirectory = {
	type: 'directory';
	entries: Partial<Record<string, MockDiskNode>>;
}
