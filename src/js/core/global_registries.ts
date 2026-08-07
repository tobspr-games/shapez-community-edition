import type { BaseItem } from "../game/base_item";
import type { Component } from "../game/component";
import type { GameMode } from "../game/game_mode";

import { Factory } from "./factory";

// These factories are here to remove circular dependencies

export const gComponentRegistry = new Factory<Component>("component");

export const gGameModeRegistry = new Factory<GameMode>("gameMode");

export const gItemRegistry = new Factory<BaseItem>("item");
