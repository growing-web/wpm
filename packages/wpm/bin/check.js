import semver from 'semver';

if (!semver.gte(process.version, '14.0.0')) {
  console.log('\nUh oh! Looks like you dont have Node v14 installed!\n');
  console.log(`You can do this by going to https://nodejs.org/

Or if you use nvm:
$ nvm install node # "node" is an alias for the latest version
$ nvm use node
`);
  process.exit(1);
}