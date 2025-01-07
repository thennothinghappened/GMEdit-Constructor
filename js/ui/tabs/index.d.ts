
export declare global {
	namespace ControlPanel {
		
		type ProblemContainer = { severity: ProblemSeverity; title: string; err: IErr; };

		type ProblemSeverity =
			'error'		|
			'warning'	|
			'debug'		;

	};
};
