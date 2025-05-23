const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create deploy directory if it doesn't exist
const deployDir = path.join(__dirname, '../deploy');
if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir);
}

// Create a file to stream archive data to
const output = fs.createWriteStream(path.join(deployDir, 'backend-deploy.zip'));
const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
});

// Listen for all archive data to be written
output.on('close', function() {
    console.log(`Archive created successfully! Size: ${archive.pointer()} bytes`);
    console.log('The zip file is ready in the deploy folder');
});

archive.on('error', function(err) {
    throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add files and directories to include
const filesToInclude = [
    'server.js',
    'package.json',
    'package-lock.json',
    'Procfile',
    'config',
    'controllers',
    'models',
    'routes',
    'middleware',
    'scripts'
];

// Add each file/directory
filesToInclude.forEach(file => {
    const fullPath = path.join(__dirname, '..');
    if (fs.existsSync(path.join(fullPath, file))) {
        if (fs.lstatSync(path.join(fullPath, file)).isDirectory()) {
            archive.directory(path.join(fullPath, file), file);
        } else {
            archive.file(path.join(fullPath, file), { name: file });
        }
    }
});

// Finalize the archive
archive.finalize(); 