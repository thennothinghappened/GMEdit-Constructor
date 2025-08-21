
export type MockDiskNode = MockDiskFile | MockDiskDirectory;

export type MockDiskFile = {
	type: 'file'
};

export type MockDiskDirectory = {
	type: 'directory',
	entries: Partial<Record<string, MockDiskNode>>;
}
