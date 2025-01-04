
export declare global {
	namespace ControlPanel {
		
		type MessageContainer = { severity: MessageSeverity; title: string; err: IErr; };

		type MessageSeverity =
			'error'		|
			'warning'	|
			'debug'		;

	};
};
