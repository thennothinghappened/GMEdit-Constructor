import { SemVer } from './SemVer.js';
import { plugin_version } from '../GMConstructor.js';
import { Err } from '../utils/Err.js';

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
 * @returns {Promise<Result<UpdateCheck.Result>>}
 */
export async function plugin_update_check() {

	const our_version_res = SemVer.parse(plugin_version);

	if (!our_version_res.ok) {
		return {
			ok: false,
			err: new Err(
				'Our own plugin version failed to parse. This should never happen!!',
				our_version_res.err
			)
		};
	}

	const our_version = our_version_res.data;

	/** @type {Result<UpdateCheck.GithubLatestVersionResponse>} */
	// @ts-ignore
	// Note: TS unfortunately doesn't know how to resolve overloads like this.
	const res = await (fetch(update_check_url)
		.then(async response => ({ ok: true, data: await response.json() }))
		.catch(err => ({ ok: false, err: new Err(err) })));
	
	if (!res.ok) {

		try {
			await fetch(internet_check_url);
		} catch (err) {
			// We know we don't have internet access, so stop gracefully.
			return {
				ok: true,
				data: {
					update_available: false
				}
			};
		}

		return {
			ok: false,
			err: new Err('Querying latest version request failed.', res.err)
		};
	}

	const public_version_res = SemVer.parse(res.data.tag_name);

	if (!public_version_res.ok) {
		return {
			ok: false,
			err: new Err(
				'Failed to parse the version name of the latest public release',
				public_version_res.err
			)
		};
	}

	const public_version = public_version_res.data;
	const our_version_newness = our_version.compare(public_version);

	if (our_version_newness < 0) {
		return {
			ok: true,
			data: {
				update_available: true,
				version: public_version,
				url: res.data.html_url
			}
		};
	}

	return {
		ok: true,
		data: { update_available: false }
	};

}
