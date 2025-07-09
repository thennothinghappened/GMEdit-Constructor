
export declare global {
	namespace GMS2.JobErrors {
		type ScriptType =
			'Object'			|
			'Script'			|
			'GlobalScript'		;
	};

	namespace GMS2.ErrorUtils {
		type ScriptInfo =
			ScriptInfo.Object		|
			ScriptInfo.Function		|
			ScriptInfo.ScriptAsset	;

		namespace ScriptInfo {
			type Object = {
				type: 'Object';
				formattedEventName: string;
				internalEventName: string;
				objectName: string;
			};

			type Function = {
				type: 'Script';
				name: string;
				definedIn: ScriptInfo;
			};

			type ScriptAsset = {
				type: 'GlobalScript';
				name: string;
			};
		};
	};
};
