const {createClient} = require("@supabase/supabase-js");
const {getTopGames, getGameDescription} = require("./twitch");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SERVICE_KEY);

async function createPortfolioCheckpoint() {
    await supabase.rpc("update_portfolio_history");
}

async function createValueCheckpoint() {
    await supabase.rpc("update_price_history");
}

async function cleanHistories() {
    await supabase.rpc("clean_histories");
}

async function updateGameValues(usersToUpdate, updateCallback) {
    const updateTime = new Date();
    const nextUpdate = new Date();
    nextUpdate.setMinutes(nextUpdate.getMinutes() + 1);
    const topGames = await getTopGames();

    const {data: gameData} = await supabase
        .from("games")
        .upsert(topGames.filter(game => game.viewer_count >= 100).map(game => {
            return {
                game_id: game.id,
                game_name: game.name,
                cover_url: game.box_art,
                value: game.viewer_count,
                last_updated: (new Date()).toISOString()
            };
        }))
        .select();

    const {data: updateData} = await supabase
        .from("games")
        .update({value: 50})
        .lte("last_updated", updateTime.toISOString())
        .neq("value", 50)
        .select();

    await createValueCheckpoint();
    await createPortfolioCheckpoint();
    await cleanHistories();

    for (const userToUpdate of usersToUpdate) {
        const {data: shareData} = await supabase
            .from("shares")
            .select()
            .eq("user_id", userToUpdate);
        if (shareData) {
            for (let i = 0; i < shareData.length; i++) {
                const games = topGames.filter(game => +game.id === shareData[i].game_id);
                if (games.length === 1) {
                    updateCallback(userToUpdate, games[0]);
                }
            }
        }
    }

    await supabase
        .from("stats")
        .insert({
            updated_at: updateTime.toISOString(),
            next_update: nextUpdate.toISOString(),
            games_updated: gameData.length,
            games_dropped_out: updateData.length,
            update_type: "values update"
        });
}

async function getGames() {
    const {data} = await supabase
        .from("games")
        .select()
        .order("value", {ascending: false})
        .limit(10);
    return data;
}

async function updateGameInfo() {
    const {data: game} = await supabase
        .from("games")
        .select("game_id, game_name, description, value, igdb_id")
        .gt("igdb_id", 0)
        .is("description", null)
        .order("value", {ascending: false})
        .limit(1)
        .maybeSingle();
    if (game === undefined || game === null) {
        return;
    }
    const info = await getGameDescription(game.igdb_id);

    const {} = await supabase
        .from("games")
        .update({
            description: info[0].summary ?? "N/A"
        })
        .eq("game_id", +game.game_id);
}


async function startNewRound() {
    await supabase.rpc("start_new_round");
}

module.exports = {updateGameValues, getGames, updateGameInfo, startNewRound};
