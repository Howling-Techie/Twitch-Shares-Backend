require("dotenv").config();
const axios = require("axios");


function getToken() {
    const twitchClientId = process.env.TWITCH_CLIENT_ID;
    const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET;

    const url = "https://id.twitch.tv/oauth2/token";
    const data = new URLSearchParams();
    data.append("client_id", twitchClientId);
    data.append("client_secret", twitchClientSecret);
    data.append("grant_type", "client_credentials");

    return axios.post(url, data, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })
        .then(response => response.data)
        .catch(error => {
            throw new Error(`Error fetching token: ${error}`);
        });
}

function getStreams(token, after) {
    const twitchClientId = process.env.TWITCH_CLIENT_ID;

    const url = "https://api.twitch.tv/helix/streams";
    const params = {
        first: 100,
    };
    if (after) {
        params.after = after;
    }

    const headers = {
        "Client-ID": twitchClientId,
        "Authorization": `Bearer ${token.access_token}`,
    };

    return axios.get(url, {params, headers})
        .then(response => response.data)
        .catch(error => {
            throw new Error(`Error fetching streams: ${error}`);
        });
}

function getGames(token, after) {
    const twitchClientId = process.env.TWITCH_CLIENT_ID;

    const url = "https://api.twitch.tv/helix/games/top";
    const params = {
        first: 100,
    };
    if (after) {
        params.after = after;
    }

    const headers = {
        "Client-ID": twitchClientId,
        "Authorization": `Bearer ${token.access_token}`,
    };

    return axios.get(url, {params, headers})
        .then(response => response.data)
        .catch(error => {
            throw new Error(`Error fetching games: ${error}`);
        });
}

async function getTopGames() {
    const token = await getToken();
    console.log("Getting streams");
    const streamResponse = await getStreams(token);
    const streams = streamResponse.data;
    let pageCount = 0;
    let after = streamResponse.pagination.cursor;
    while (pageCount < 20) {
        const newStreamResponse = await getStreams(token, after);
        after = newStreamResponse.pagination.cursor;
        streams.push(...newStreamResponse.data);
        pageCount++;
    }
    const gamesToFind = [];
    for (const stream of streams) {
        if (!(stream.game_id in gamesToFind)) {
            gamesToFind.push(stream.game_id);
        }
    }

    const gameResponse = await getGames(token);
    const games = gameResponse.data;
    after = gameResponse.pagination.cursor;

    pageCount = 0;
    while (pageCount < 10) {
        const newGameResponse = await getGames(token, after);
        after = newGameResponse.pagination.cursor;
        games.push(...newGameResponse.data);
        pageCount++;
    }

    const topGameIDs = [];
    for (const stream of streams) {
        if (!topGameIDs.includes(stream.game_id)) {
            topGameIDs.push(stream.game_id);
        }
    }

    const topGames = [];
    for (const gameID of topGameIDs) {
        const viewerCount = streams.filter(stream => stream.game_id === gameID).reduce((total, current) => total + current.viewer_count, 0);
        const game = games.find(game => game.id === gameID);
        if (game === undefined) {
            console.log(gameID);
        } else {
            topGames.push({id: game.id, name: game.name, box_art: game.box_art_url, viewer_count: viewerCount});
        }
    }
    return topGames.sort((a, b) => b.viewer_count - a.viewer_count);
}

module.exports = {
    getTopGames
};
