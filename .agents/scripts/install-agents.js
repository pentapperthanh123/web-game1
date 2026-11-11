/**
 * AG Kit - Rules + Cursor Commands Sync Wrapper
 *
 * Redirects execution to install-agents.cjs to guarantee CommonJS loading
 * even if the project's package.json defines "type": "module".
 */

import('./install-agents.cjs');
