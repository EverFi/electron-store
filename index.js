'use strict';
const path = require('path');
const electron = require('electron');
const Conf = require('conf');
const os = require('os');

class ElectronStore extends Conf {
	constructor(options, defaultPath=os.tmpdir()) {
		const defaultCwd = defaultPath;

		options = {
			name: 'config',
			...options
		};

		if (!options.projectVersion) {
			options.projectVersion = process.versions.electron
		}

		if (options.cwd) {
			options.cwd = path.isAbsolute(options.cwd) ? options.cwd : path.join(defaultCwd, options.cwd);
		} else {
			options.cwd = defaultCwd;
		}

		options.configName = options.name;
		delete options.name;
		super(options);
	}

	openInEditor() {
		// TODO: Remove `electron.shell.openItem` when targeting Electron 9.`
		const open = electron.shell.openItem || electron.shell.openPath;
		open(this.path);
	}
}

module.exports = ElectronStore;
