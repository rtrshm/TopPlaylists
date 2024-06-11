require('dotenv').config();
const crypto = require('node:crypto');
const axios = require('axios');

const api_key = process.env.LASTFM_API_KEY;
const lastfmApiURL = 'http://ws.audioscrobbler.com/2.0';
const username = process.env.LASTFM_USER;

module.exports = {
    getTopTracks: async (period) => {
        let config = {
            method: 'GET',
            url: lastfmApiURL,
            params: {
                api_key,
                period,
                user: username,
                method: 'user.getTopTracks',
                format: 'json',
                limit: 100,
            },
        };

        try {
            let { data } = await axios(config);
            return data.toptracks.track;
        } catch (e) {
            console.log(e.response || e);
        }
    },
};
