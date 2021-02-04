import React, { useEffect, useState } from "react";
import PubSub from "pubsub-js";
import Meters from "./meters/Meters";
import "./GUI.scss";
import GloryCounter from "./glory_counter/GloryCounter";
import DefenceCounter from "./defence_counter/DefenceCounter";
import PanelButton from "./panel_button/PanelButton";
import StatsPanel from "./panels/stats_panel/StatsPanel";
import TasksPanel from "./panels/tasks_panel/TasksPanel";
import CreateAccountPanel from "./panels/create_account_panel/CreateAccountPanel";
import TaskTracker from "./task_tracker/TaskTracker";
import Utils from "../../../shared/Utils";
import AccountPanel from "./panels/account_panel/AccountPanel";
import { ApplicationState } from "../../../shared/state/States";
import statsIcon from "../../../assets/images/gui/hud/stats-icon.png";
import tasksIcon from "../../../assets/images/gui/hud/tasks-icon.png";
import exitIcon from "../../../assets/images/gui/hud/exit-icon.png";
import { LOGGED_IN } from "../../../shared/EventTypes";
import ChatInput from "./chat_input/ChatInput";

const Panels = {
    NONE: Symbol("NONE"),
    CreateAccount: Symbol("CreateAccount"),
    Account: Symbol("Account"),
    Stats: Symbol("Stats"),
    Tasks: Symbol("Tasks"),
};

function GUI() {
    const [shownPanel, setShownPanel] = useState(null);
    const [trackedTask, setTrackedTask] = useState(null);
    const [loggedIn, setLoggedIn] = useState(ApplicationState.loggedIn);

    useEffect(() => {
        const subs = [
            PubSub.subscribe(LOGGED_IN, (msg, data) => {
                setLoggedIn(data.new);
            }),
        ];

        return () => {
            subs.forEach((sub) => {
                PubSub.unsubscribe(sub);
            });
        };
    }, []);

    useEffect(() => {
        // If there were looking at the create account
        // panel, switch to the account panel.
        if (shownPanel === Panels.CreateAccount) {
            setShownPanel(Panels.Account);
        }
    }, [loggedIn]);

    return (
        <div className="gui">
            <Meters />

            {trackedTask && <TaskTracker />}

            <div className="top-left-corner-cont gui-zoomable">
                <GloryCounter />
                <DefenceCounter />
                <PanelButton
                  icon={statsIcon}
                  onClick={() => {
                      setShownPanel(Panels.Stats);
                  }}
                  tooltip={Utils.getTextDef("Avatar tooltip")}
                />
                <PanelButton
                  icon={tasksIcon}
                  onClick={() => {
                      setShownPanel(Panels.Tasks);
                  }}
                  tooltip={Utils.getTextDef("Tasks tooltip")}
                />
            </div>

            <div className="top-right-corner-cont gui-zoomable">
                <PanelButton
                  icon={exitIcon}
                  onClick={() => {
                      if (loggedIn) {
                          setShownPanel(Panels.Account);
                      }
                      else {
                          setShownPanel(Panels.CreateAccount);
                      }
                  }}
                  tooltip={Utils.getTextDef("Exit tooltip")}
                />
            </div>

            <div className="panel-cont">
                {shownPanel === Panels.CreateAccount && (
                <CreateAccountPanel
                  onCloseCallback={() => {
                      setShownPanel(Panels.NONE);
                  }}
                />
                )}
                {shownPanel === Panels.Account && (
                <AccountPanel
                  onCloseCallback={() => {
                      setShownPanel(Panels.NONE);
                  }}
                />
                )}
                {shownPanel === Panels.Stats && (
                <StatsPanel
                  onCloseCallback={() => {
                      setShownPanel(Panels.NONE);
                  }}
                />
                )}
                {shownPanel === Panels.Tasks && (
                <TasksPanel
                  onCloseCallback={() => {
                      setShownPanel(Panels.NONE);
                  }}
                />
                )}
            </div>

            <ChatInput />
        </div>
    );
}

export default GUI;
