
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
			devices: DevicesData;
		};

		type DevicesData = {

			/**
			 * Path to the devices file for building with Igor.
			 */
			path: string;

			forPlatform: {
				[platform in GMS2.SupportedPlatform]?: string[];
			};

		};

		/**
		 * Data describing various external devices to build to.
		 */
		type DevicesJson = {

			android?: {
				/**
				 * User-added devices.
				 */
				User?: Record<string, unknown>;

				/**
				 * Automatically detected devices.
				 */
				Auto?: Record<string, unknown>;
			};

			mac?: Record<string, unknown>;

			linux?: Record<string, unknown>;
			
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
				invalidUsers: InvalidUserInfo[];
			};

			type InvalidUserInfo = {
				path: string;
				error: InvalidUserInfoError;
			};

			type InvalidUserInfoError = 
				{ code: 'nameInvalidFormat', inner: Error }			|
				{ code: 'devicesJsonParseFailed', inner: Error }	;

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
