import fs from "fs";
import gulp from "gulp";
import path from "path/posix";
import { buildFolder } from "./config.js";

import gulpDom from "gulp-dom";
import gulpHtmlBeautify from "gulp-html-beautify";
import gulpHtmlmin from "gulp-htmlmin";
import gulpRename from "gulp-rename";

/**
 * PROVIDES
 *
 * html
 */

async function buildHtml() {
    return gulp
        .src("../src/html/index.html")
        .pipe(
            gulpDom(
                /** @this {Document} **/ function () {
                    const document = this;

                    // Append css
                    const css = document.createElement("link");
                    css.rel = "stylesheet";
                    css.type = "text/css";
                    css.media = "none";
                    css.setAttribute("onload", "this.media='all'");
                    css.href = "main.css";
                    document.head.appendChild(css);

                    let fontCss = `
                        @font-face {
                            font-family: "GameFont";
                            font-style: normal;
                            font-weight: normal;
                            font-display: swap;
                            src: url('res/fonts/GameFont.woff2') format("woff2");
                        }
                        `;
                    let loadingCss =
                        fontCss + fs.readFileSync(path.join("preloader", "preloader.css")).toString();

                    const style = document.createElement("style");
                    style.setAttribute("type", "text/css");
                    style.textContent = loadingCss;
                    document.head.appendChild(style);

                    let bodyContent = fs.readFileSync(path.join("preloader", "preloader.html")).toString();

                    const bundleScript = document.createElement("script");
                    bundleScript.type = "text/javascript";
                    bundleScript.src = "bundle.js";
                    document.head.appendChild(bundleScript);

                    document.body.innerHTML = bodyContent;
                }
            )
        )
        .pipe(
            gulpHtmlmin({
                caseSensitive: true,
                collapseBooleanAttributes: true,
                collapseInlineTagWhitespace: true,
                collapseWhitespace: true,
                preserveLineBreaks: true,
                minifyJS: true,
                minifyCSS: true,
                quoteCharacter: '"',
                useShortDoctype: true,
            })
        )
        .pipe(gulpHtmlBeautify())
        .pipe(gulpRename("index.html"))
        .pipe(gulp.dest(buildFolder));
}

export default buildHtml;
