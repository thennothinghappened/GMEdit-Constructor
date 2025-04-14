import { SemVer } from './SemVer.js';
import { plugin_version } from '../GMConstructor.js';
import { Err } from '../utils/Err.js';
import { Error, Ok } from '../utils/Result.js';

/**
 * URL we use to check for updates with.
 */
const update_check_url = 'https://api.github.com/repos/thennothinghappened/GMEdit-Constructor/releases/latest';

/**
 * Url used to check if we have internet access.
 */
const internet_check_url = 'https://example.com/';

/**
 * Check for updates on this plugin from GitHub.
 * 
 * @returns {Promise<Result<UpdateChecker.Result>>}
 */
export async function plugin_update_check() {

	const our_version_res = SemVer.parse(plugin_version);

	if (!our_version_res.ok) {
		return Error(new Err(
			'Our own plugin version failed to parse. This should never happen!!',
			our_version_res.err
		));
	}

	const our_version = our_version_res.data;

	const res = await (fetch(update_check_url)
		.then(async response => Ok(/** @type {UpdateChecker.GithubLatestVersionResponse} */ (await response.json())))
		.catch(err => Error(new Err(err))));
	
	if (!res.ok) {

		try {
			await fetch(internet_check_url);
		} catch (_) {
			// We know we don't have internet access, so stop gracefully.
			return Ok({ update_available: false });
		}

		return Error(new Err(
			'Querying latest version request failed.',
			res.err
		));
	}

	const public_version_res = SemVer.parse(res.data.tag_name);

	if (!public_version_res.ok) {
		return Error(new Err(
			'Failed to parse the version name of the latest public release',
			public_version_res.err
		));
	}

	const public_version = public_version_res.data;
	const our_version_newness = our_version.compare(public_version);

	if (our_version_newness < 0) {
		return Ok({
			update_available: true,
			version: public_version,
			url: res.data.html_url
		});
	}

	return Ok({ update_available: false });

}
