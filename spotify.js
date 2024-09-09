require('dotenv').config();
const axios = require('axios');
const { log } = require('console');
const crypto = require('crypto');
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
var access_token, refresh_token;
var defaultHeaders = { 'content-type': 'application/x-www-form-urlencoded' };

const generateRandomString = (length) => {
    return crypto.randomBytes(60).toString('hex').slice(0, length);
};

var stateKey = 'spotify_auth_state';

const logWithTimestamp = (msg) =>
    console.log(`[${new Date().toLocaleString()}]: ${msg}`);

let make_redirect_uri = (hostname) => `http://${hostname}:6968/spotifyCallback`;

module.exports = {
    refreshToken: async () => {
        logWithTimestamp(`Refreshing token...`);
        const refreshTokenOptions = {
            method: 'POST',
            url: 'https://accounts.spotify.com/api/token',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                Authorization:
                    'Basic ' +
                    new Buffer.from(client_id + ':' + client_secret).toString(
                        'base64'
                    ),
            },
            data: {
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
            },
            json: true,
        };

        let { data } = await axios(refreshTokenOptions);

        access_token = data.access_token;
        defaultHeaders['Authorization'] = `Bearer ${access_token}`;
        logWithTimestamp(`Token refreshed.`);
    },
    authorized: () => {
        return access_token !== undefined;
    },
    authorize: async (req, res) => {
        var state = generateRandomString(16);
        res.cookie(stateKey, state);

        var scope =
            'user-read-private \
        playlist-read-private \
        playlist-modify-public \
        playlist-modify-private';

        var redirect_uri = make_redirect_uri(req.hostname);

        const authQueryParams = new URLSearchParams({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state,
        });

        res.redirect(
            'https://accounts.spotify.com/authorize?' +
                authQueryParams.toString()
        );
    },

    authCallback: async (req, res) => {
        var code = req.query.code || null;
        var state = req.query.state || null;
        var storedState = req.cookies ? req.cookies[stateKey] : null;

        var redirect_uri = make_redirect_uri(req.hostname);
        if (state === null || state !== storedState) {
            logWithTimestamp(`spotifyCallback: State mismatch.`);
            res.status(400);
            res.send();
        } else {
            res.clearCookie(stateKey);
            var authOptions = {
                method: 'POST',
                url: 'https://accounts.spotify.com/api/token',
                data: {
                    code: code,
                    redirect_uri: redirect_uri,
                    grant_type: 'authorization_code',
                },
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    Authorization:
                        'Basic ' +
                        new Buffer.from(
                            client_id + ':' + client_secret
                        ).toString('base64'),
                },
                json: true,
            };

            try {
                let { data } = await axios(authOptions);

                access_token = data.access_token;
                refresh_token = data.refresh_token;

                defaultHeaders = {
                    'content-type': 'application/x-www-form-urlencoded',
                    Authorization: `Bearer ${access_token}`,
                };

                res.status(200);
                res.send();
            } catch (error) {
                logWithTimestamp(error);
                logWithTimestamp(`spotifyCallback: Invalid token.`);
                res.status(400);
                res.send();
            }
        }
    },

    updatePlaylist: async (playlistId, songUris) => {
        let config = {
            method: 'PUT',
            url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
            params: {
                uris: songUris.join(),
                range_start: 0,
                range_length: songUris.length,
            },
            data: {
                range_start: 0,
                range_length: songUris.length,
            },
        };

        try {
            await axios(config);
        } catch (e) {
            if (e.response) {
                if (e.response.status === 429) {
                    logWithTimestamp(
                        `Rate limited, waiting ${e.response.headers['Retry-After']} sec...`
                    );
                    await new Promise((r) =>
                        setTimeout(r, e.response.headers['Retry-After'] * 1000)
                    );
                    await axios(config);
                } else {
                    logWithTimestamp(`updatePlaylist failed`);
                    throw e;
                }
            }
        }
    },

    updatePlaylistDescription: async (
        playlistId,
        playcount,
        tracks_not_found
    ) => {
        let config = {
            method: 'PUT',
            url: `https://api.spotify.com/v1/playlists/${playlistId}`,
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
            data: {
                description:
                    tracks_not_found > 0
                        ? `${tracks_not_found} ${
                              tracks_not_found !== 1 ? 'tracks' : 'track'
                          } not found`
                        : 'no tracks missing :D',
            },
        };

        try {
            await axios(config);
        } catch (e) {
            console.log(`Playlist details change boned; ${e.response.status}`);
        }
    },

    findSong: async (songName, artist) => {
        let quotes = /['",]/g;
        let querySongName = songName
            .replace(quotes, '')
            .replace('-', ' ')
            .toLowerCase();
        let queryArtistName = artist
            .replace(quotes, '')
            .replace('-', ' ')
            .toLowerCase();

        let queryString = `${queryArtistName} ${querySongName.toLowerCase()} `;

        let config = {
            method: 'GET',
            url: 'https://api.spotify.com/v1/search',
            params: {
                q: queryString,
                type: 'track',
                limit: 50,
            },
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        };

        var data;

        try {
            ({ data } = await axios(config));
        } catch (e) {
            if (e.response && e.response.status === 429) {
                logWithTimestamp(
                    `Rate limited, trying again in ${e.response.headers['Retry-After']} seconds...`
                );
                await new Promise((r) =>
                    setTimeout(r, e.response.headers['Retry-After'] * 1000)
                );
                ({ data } = await axios(config));
            } else {
                logWithTimestamp(
                    `Finding ${queryString} failed with ${
                        e.response
                            ? `response ${e.response.status}`
                            : 'no response'
                    }`
                );
                return undefined;
            }
        }

        if (data) {
            if (data.tracks.items.length === 0) {
                logWithTimestamp(
                    `Spotify failed to return any results for ${songName} by ${artist}.`
                );
            }

            for (track of data.tracks.items) {
                if (
                    track.name.toLowerCase() == songName.toLowerCase() &&
                    track.artists[0].name.toLowerCase() == artist.toLowerCase()
                ) {
                    return track.uri;
                }
            }
            logWithTimestamp(
                `Failed to find ${songName} by ${artist}. Query: ${queryString}`
            );
        } else {
            logWithTimestamp(`No data ??? ${queryString}`);
        }
        return undefined;
    },
};
