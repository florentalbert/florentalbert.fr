// PreviewServer must not mistake a server already listening on its port for its own.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import { PreviewServer } from '../audit/preview-server.ts';

describe('PreviewServer', () => {
	it('refuses to start when the port is already served', async () => {
		const squatter = createServer((_, response) => response.end('stale')).listen(0);
		await new Promise((resolve) => squatter.once('listening', resolve));
		const address = squatter.address();
		assert.ok(address && typeof address === 'object');
		try {
			await assert.rejects(new PreviewServer(tmpdir(), address.port).start(), /already in use/);
		} finally {
			squatter.close();
		}
	});

	it('fails fast when the server process exits early', async () => {
		// No node_modules/.bin/astro in the temp dir: the spawn fails immediately.
		await assert.rejects(new PreviewServer(tmpdir(), 4399).start(), /exited|ENOENT/);
	});
});
