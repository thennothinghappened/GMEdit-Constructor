import { GMRuntimeVersion } from './GMVersion';

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
			path: string;
			name: string;
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
