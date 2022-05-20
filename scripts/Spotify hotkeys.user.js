// ==UserScript==
// @name         Spotify hotkeys
// @version      1.9.0
// @description  Allows hotkeys and media keys to control the Spotify web player from any tab
// @author       CennoxX
// @namespace    https://greasyfork.org/users/21515
// @homepage     https://github.com/CennoxX/userscripts
// @supportURL   https://github.com/CennoxX/userscripts/issues/new?title=[Spotify%20hotkeys]%20
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=spotify.com
// @grant        GM_getValue
// @grant        GM_setValue
// @license      MIT
// ==/UserScript==
/* jshint esversion: 10 */
/* eslint quotes: ["warn", "double", {"avoidEscape": true}] */
/* eslint curly: "off" */

const playpauseButton = "[data-testid=control-button-playpause]";
const previousButton = ".player-controls__buttons button:last-child";
const skipButton = "[data-testid=control-button-skip-forward]";
const loveButton = ".control-button-heart[aria-checked='false']";
const unloveButton = ".control-button-heart[aria-checked='true']";
document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.altKey && e.key == "p" || e.key == "MediaPlayPause")
        GM_setValue("ctrl", playpauseButton);
    if (e.ctrlKey && e.altKey && e.key == "s" || e.key == "MediaStop")
        GM_setValue("ctrl", "stop");
    if (e.ctrlKey && e.altKey && e.key == "," || e.key == "MediaTrackPrevious")
        GM_setValue("ctrl", previousButton);
    if (e.ctrlKey && e.altKey && e.key == "." || e.key == "MediaTrackNext")
        GM_setValue("ctrl", skipButton);
    if (e.ctrlKey && e.altKey && e.key == "l")
        GM_setValue("ctrl", loveButton);
    if (e.ctrlKey && e.altKey && e.key == "u")
        GM_setValue("ctrl", unloveButton);
}, false);
if (document.domain == "open.spotify.com") {
    setInterval(function () {
        let ctrl = GM_getValue("ctrl");
        if (!ctrl)
            return;
        if (ctrl == "stop"){
            if (document.title.includes(" · "))
                document.querySelector(playpauseButton).click();
        } else {
            document.querySelector(ctrl).click();
        }
        GM_setValue("ctrl", "");
    }, 100);
}
