const {createClient} = require("@supabase/supabase-js");
const {getTopGames} = require("./twitch");
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

async function updateGameValues() {
    const updateTime = new Date();
    const nextUpdate = new Date();
    nextUpdate.setMinutes(nextUpdate.getMinutes() + 1);
    const topGames = await getTopGames();

    const {data: gameData, error: upsertError} = await supabase
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

    const {data: updateData, error: updateError} = await supabase
        .from("games")
        .update({value: 50})
        .lte("last_updated", updateTime.toISOString())
        .neq("value", 50)
        .select();

    await createValueCheckpoint();
    await createPortfolioCheckpoint();
    await cleanHistories();

    const {error: insertError} = await supabase
        .from("stats")
        .insert({
            updated_at: updateTime.toISOString(),
            next_update: nextUpdate.toISOString(),
            games_updated: gameData.length,
            games_dropped_out: updateData.length,
            update_type: "values update"
        });
}

async function startNewRound() {
    await supabase.rpc("start_new_round");
}

module.exports = {updateGameValues};
