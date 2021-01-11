import React, { useEffect, useState } from "react";
import PubSub from "pubsub-js";
import createGame from "./PhaserConfig";
import GUI from "./gui/GUI";
import { ApplicationState } from "../../shared/state/States";
import { LOAD_ACCEPTED } from "../../shared/EventTypes";
import "./GamePage.scss";
import { addGameEventResponses, removeGameEventResponses } from "../../network/websocket_events/WebSocketEvents";

function GamePage() {
    const [loadFinished, setLoadFinished] = useState({});

    // Initial setup.
    useEffect(() => {
        // Show the loading screen, then start loading the game.
        ApplicationState.setLoading(true);

        const subs = [
            PubSub.subscribe(LOAD_ACCEPTED, (msd, data) => {
                // Wait for the user to accept the finished load,
                // in case they want to finish reading a hint.
                setLoadFinished(data.new);
            }),
        ];

        // By this point the game canvas container should be set
        // up ok, ready for the Phaser game to be injected into it.
        const gameInstance = createGame();

        gameInstance.scene.start("Boot");

        // Add the websocket event responses after the game state is started.
        addGameEventResponses();

        // Cleanup.
        return () => {
            subs.forEach((sub) => {
                PubSub.unsubscribe(sub);
            });

            // Remove the gameplay event listeners, or they will
            // throw errors without the game instance to use.
            removeGameEventResponses();

            // Destroy the Phaser game instance.
            gameInstance.destroy(true);
        };
    }, []);

    return (
        <div>
            <div id="game-cont" className={`normal-cursor ${loadFinished ? "fade-in" : ""}`}>
                <div id="game-canvas" />
                <GUI />
            </div>
        </div>
    );
}

export default GamePage;
