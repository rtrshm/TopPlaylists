require('dotenv').config();
const express = require('express');
const qs = require('qs');
const spotifyApi = require('./spotify.js');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const topPlaylists = require('./topPlaylists.js');
const port = process.env.PORT;
const REFRESH_INTERVAL = 60;

const app = express();
app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());
app.set('query parser', (str) => {
    return qs.parse(str);
});
const logWithTimestamp = (msg) =>
    console.log(`[${new Date().toLocaleString()}]: ${msg}`);

app.get('/authSpotify', spotifyApi.authorize);

app.get('/spotifyCallback', spotifyApi.authCallback);

let startTask = () => {
    topPlaylists.getAndUpdateTopTrackPlaylists();
    setInterval(async () => {
        await topPlaylists.getAndUpdateTopTrackPlaylists();
    }, REFRESH_INTERVAL * 60 * 1000);
};

let startServer = async () => {
    logWithTimestamp(`Authorize spotify at /authSpotify...`);
    while (!spotifyApi.authorized()) {
        await new Promise((r) => setTimeout(r, 5000));
    }
    startTask();
};

app.listen(port, () => {
    logWithTimestamp(`Listening on port ${port}.`);
    startServer();
});
