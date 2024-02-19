const spotifyApi = require('./spotify.js');
const lastfmApi = require('./lastfm.js');
const playlists = {
    '7day': process.env.WEEKLY_PLAYLIST_ID,
    '1month': process.env.MONTHLY_PLAYLIST_ID,
    overall: process.env.OVERALL_PLAYLIST_ID,
};

const logWithTimestamp = (msg) =>
    console.log(`[${new Date().toLocaleString()}]: ${msg}`);

const numTracks = {
    '7day': 20,
    '1month': 25,
    overall: 50,
};

module.exports = {
    getAndUpdateTopTrackPlaylists: async () => {
        await spotifyApi.refreshToken();

        for (period in playlists) {
            logWithTimestamp(`Updating ${period} playlist...`);
            let topTracks = await lastfmApi.getTopTracks(period);
            let track_uris = [];
            for (track of topTracks) {
                let track_uri = await spotifyApi.findSong(
                    track.name,
                    track.artist.name
                );
                if (track_uri) {
                    track_uris.push(track_uri);
                }
            }

            await spotifyApi.updatePlaylist(
                playlists[period],
                track_uris.slice(0, numTracks[period])
            );
        }

        logWithTimestamp('Success!');
    },
};
