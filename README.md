
# TopPlaylists

Required to run:
* `.env` file with the following fields:
```
SPOTIFY_CLIENT_ID      # from spotify dev dash
SPOTIFY_CLIENT_SECRET  # ^^^^^^^^^^^^^^^^^^^^^
PORT				   # choice of port
LASTFM_USER            # lastfm username
WEEKLY_PLAYLIST_ID     # last bit of url of the playlist you create
MONTHLY_PLAYLIST_ID    # ^^^
OVERALL_PLAYLIST_ID    # ^^^
```
* node.js
* Spotify/Last.fm API keys - go to the dev portal for keys
* In the Spotify developer dash, set the callback url to match your chosen port (https://localhost:PORT/spotifyCallback" if running locally) 

To run:
1. `npm install`
2. `node app.js`
3. Go to http://localhost:PORT/authSpotify and log in through Spotify 
4. At this point if everything went right the app should start running and the playlists you created will be populated and refreshed every 24 hrs
