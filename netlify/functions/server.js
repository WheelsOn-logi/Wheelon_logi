const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const path = require('path');
const { calculate } = require('./calculate');

const app = express();
app.use(bodyParser.json());

app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'"],
            "img-src": ["'self'", "data:"]
        }
    }
}));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../../')));

app.post('/calculate', calculate);
app.listen(3000, () => {
    console.log('Server is running on port 3000');
    console.log('Visit http://localhost:3000');
});
module.exports.handler = serverless(app);
