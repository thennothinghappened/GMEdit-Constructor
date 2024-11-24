
export declare global {

	module UpdateChecker {
	
		type Result =
			{ update_available: false; }								|
			{ update_available: true; version: SemVer; url: ?string; }	;
	
		interface GithubLatestVersionResponse {
			tag_name: string;
			html_url: ?string;
		}
	
	};

};
