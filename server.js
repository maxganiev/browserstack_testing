const express = require('express');
const envPath = `${__dirname}/.env`;
require('dotenv').config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3000;

//Commands
const testsPaths = require('./test-paths.js');
const TestsCommand = require('./commands/TestsCommand');

//Autoruns when testPaths content changes
TestsCommand.runTests(testsPaths);

app.listen(PORT);
