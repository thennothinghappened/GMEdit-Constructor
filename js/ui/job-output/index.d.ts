
export declare global {
	namespace UI {
		/**
		 * A user interface that displays the output of a job, and can show the user any errors that
		 * occurred during the job.
		 * 
		 * Displays are reusable and can be detached and re-attached to clients.
		 */
		interface OutputLogDisplay extends Destroyable {
			/**
			 * Get the current client, if any.
			 */
			getClient(): OutputLogDisplay.Client|undefined;

			/**
			 * Connect to the given client. Connecting to a new client will boot the previous client
			 * from the server, and reset the display state.
			 */
			connect(client: OutputLogDisplay.Client);

			/**
			 * Disconnect the current client, if any.
			 */
			disconnect();

			/**
			 * Bring the output log into the foreground.
			 */
			bringToForeground();

			/**
			 * Get whether this display can show a custom title.
			 */
			supportsTitle(): boolean;

			/**
			 * Set the title of the display.
			 */
			setTitle(title: string);

			/**
			 * Add an error to the error display.
			 * @param error An error that occurred during the job's execution.
			 */
			addError(error: JobError);
		};

		namespace OutputLogDisplay {
			/**
			 * A client for an output log display.
			 */
			interface Client {
				getContent(): Node;
				displayResized();
				displayClosed();
			};
		};
	};
}
