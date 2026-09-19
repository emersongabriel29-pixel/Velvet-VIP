import { transcode } from './transcode.mjs';
const [source,destination]=process.argv.slice(2);
if(!source||!destination) { console.error('Usage: node workers/media/cli.mjs <local-video> <output-directory>');process.exitCode=1; }
else { try {console.log(JSON.stringify(await transcode(source,destination)));} catch(error){console.error(error.message);process.exitCode=1;} }
