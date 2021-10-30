// ==UserScript==
// @name        Spotify hotkeys
// @version     1.8
// @description Allows hotkeys and media keys to control the Spotify web player from any tab
// @author      CennoxX
// @contact     cesar.bernard@gmx.de
// @homepage    https://twitter.com/CennoxX
// @namespace   https://greasyfork.org/users/21515
// @include     *
// @icon        https://www.google.com/s2/favicons?sz=64&domain=spotify.com
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==
/* jshint esversion: 6 */
/* eslint curly: "off"*/
const playpauseButton = "[data-testid=control-button-playpause]";
const previousButton = ".player-controls__buttons button:last-child";
const skipButton = "[data-testid=control-button-skip-forward]";
document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.altKey && e.key == "p" || e.key == "MediaPlayPause")
        GM_setValue("ctrl", playpauseButton);
    if (e.ctrlKey && e.altKey && e.key == "s" || e.key == "MediaStop")
        GM_setValue("ctrl", "stop");
    if (e.ctrlKey && e.altKey && e.key == "," || e.key == "MediaTrackPrevious")
        GM_setValue("ctrl", previousButton);
    if (e.ctrlKey && e.altKey && e.key == "." || e.key == "MediaTrackNext")
        GM_setValue("ctrl", skipButton);
}, false);
if (document.domain == "open.spotify.com") {
    setInterval(function () {
        let ctrl = GM_getValue("ctrl");
        if (!ctrl)
            return;
        if (ctrl == "stop"){
            if (document.title.includes(" · ")){
                document.querySelector(playpauseButton).click();
            }
        } else {
            document.querySelector(ctrl).click();
        }
        GM_setValue("ctrl", "");
    }, 100);
}
