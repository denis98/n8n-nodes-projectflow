const path = require('path');
const { src, dest } = require('gulp');

function buildIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');
	src(nodeSource).pipe(dest(nodeDestination));

	const credSource = path.resolve('credentials', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');
	return src(credSource, { allowEmpty: true }).pipe(dest(credDestination));
}

exports['build:icons'] = buildIcons;
