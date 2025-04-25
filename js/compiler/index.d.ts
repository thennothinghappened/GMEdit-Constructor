
export declare global {

	namespace GM {

		type ReleaseChannel = 
			'Stable'	|
			'Beta'		|
			'LTS'		;
			
		/**
		 * Information for a specific found user.
		 */
		type User = {
			name: string;
			directoryName: string;
			fullPath: string;
		};

		/**
		 * 
		 */
		interface UserIndexer {
			/**
			 * Get the list of users at the given location.
			 * @param path Path to the directory where the users' directories can be found.
			 */
			async getUsers(path: string): Promise<Result<UserIndexer.GetData, UserIndexer.GetError>>;
		};

		namespace UserIndexer {

			type GetError =
				{ code: 'pathReadError', inner: Error };
			
			type GetData = {
				users: User[];
			};

		};

		namespace YY {

			type File = {
				resourceVersion?: string;
				resourceType: string;
			};

			type Project = File & {
				configs: BuildConfig;
				MetaData: {
					IDEVersion: string;
				};
			};
		
			type BuildConfig = {
				children: BuildConfig[];
				name: string;
			};

		};

	};

};
