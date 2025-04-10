# shapez Community Edition <img src="./electron/favicon.png" alt="shapez Logo" align="right" height="40">

**shapez Community Edition** (abbreviated as **CE**) is a community-maintained version of [shapez](https://store.steampowered.com/app/1318690/shapez/)!

CE was created as the tobspr Games team moved away from shapez to work full-time on the upcoming [Shapez 2](https://store.steampowered.com/app/2162800/shapez_2/).
CE aims to:

-   Continue the development of shapez as guided by the community.
-   Allow contributors to continue submitting new features and improvements to the game.
-   Provide an experimental and forgiving environment for faster development.

> [!IMPORTANT]
> CE is different from the official game published on Steam and other platforms.
> CE was forked off of the official shapez, which has [its own repository](https://github.com/tobspr-games/shapez.io).
> No plans exist to merge the two versions of shapez.

As of now, CE must be built from source and supports only a standalone build,
with no plans for re-supporting a web version.
In the future, builds of CE may provided for owners of the full version of shapez.

## Contributing

We communicate on the [official shapez Discord server](https://discord.com/invite/HN7EVzV).
For historical reasons, we have communicated in a private channel,
but we are moving to the public `#contributing` channel.
If you would like to contribute to CE, feel free to share your ideas, plans, etc. there.

In our current workflow, we (the "collaborators" of the repository) create internal branches and corresponding pull requests to work on a feature, refactor, etc.
We discuss changes in the Discord, and when 2 collaborators (including the PR creator) approve of a change, it can be merged.
See our existing [pull requests](https://github.com/tobspr-games/shapez-community-edition/pulls?q=) for examples.

If you are not a collaborator and want to submit a change,
you can fork our repo and make a pull request.
Note that because of plans to overhaul many parts of the game,
unless you are improving translations, you should probably communicate with us on Discord!

> [!TIP]
> Be aware that [pull requests to the official shapez repository](https://github.com/tobspr-games/shapez.io/pulls) are unlikely to get merged in the near future. Instead, submit them to CE!
> In fact, because the game is licensed under the [GNU GPL v3.0](https://www.gnu.org/licenses/gpl-3.0.html),
> existing pull requests can be resubmitted to CE even if you aren't the author! **This is not legal advice.**

### Code

The game uses a custom engine originally based on the YORG.io 3 game engine.
The code within the engine is relatively clean with some code for the actual game on top being hacky.

We are in the process of migrating to TypeScript and JSX/TSX.
New changes should be implemented in TypeScript if possible,
but because we are planning on overhauling many parts of the game,
there is no need to convert existing code to TypeScript.

This project is fine with using cutting-edge and bleeding-edge features
and does not intend to provide compatibility for older clients.

## Building

### Prerequisites

-   [ffmpeg](https://www.ffmpeg.org/download.html)
-   [Node.js](https://nodejs.org)
-   [Java](https://www.oracle.com/java/technologies/downloads/) (or [OpenJDK](https://openjdk.org/)) to run the texture packer
-   [cURL](https://curl.se/download.html)[^1] to download the texture packer

[^1]: cURL is already installed on most Windows, Linux and macOS systems.

### Development

-   Run `npm i` in the root folder and in `electron/`.
-   Run `npm run gulp` in the root folder to build and serve files.
    If a new browser tab opens, ignore it.
-   Open a new terminal and run `npm run start` in `electron/` to open an Electron window.
    -   Use `npm run start -- --dev` to run in development mode.
    -   Tip: If you open the Electron window too early, you can reload it when focused on DevTools.

### Release

-   Run `npm i` in the root folder and in `electron/`.
-   In the root folder, run `npm run package-$PLATFORM-$ARCH` where:
    -   `$PLATFORM` is `win32`, `linux` or `darwin` depending on your system.
    -   `$ARCH` is the target system architecture (`x64` or `arm64`)
-   The build will be found under `build_output/standalone` as `shapez-...`.

## Credits

Thanks to [tobspr](https://tobspr.io) for creating this project!

[<img src="https://i.imgur.com/uA2wcUy.png" alt="tobspr Games">](https://tobspr.io)
