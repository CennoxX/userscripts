# userscripts
Userscripts [published at greasyfork](https://greasyfork.org/de/users/21515-cesar-bernard). The userscripts listed here are only tested with [Firefox](https://www.mozilla.org/de/firefox/new/) and [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/).

###### [Spotify hotkeys](https://greasyfork.org/scripts/31978-spotify-hotkeys/)
Allows hotkeys and media keys to control the Spotify web player from any tab

<details>
<summary>details</summary>

<!-- START ./docs/Spotify hotkeys.md -->
This script adds hotkeys to control the Spotify webplayer from any tab. Note that you have to reload all tabs after installation. It can be used with keyboard hotkeys or with <a href="https://developer.mozilla.org/en-US/docs/Web/API/MediaKeys">MediaKeys</a>.

keyboard hotkeys:<br />
<kbd>ctrl</kbd> + <kbd>alt</kbd> + <kbd>p</kbd> – play/pause<br />
<kbd>ctrl</kbd> + <kbd>alt</kbd> + <kbd>s</kbd> – stop<br />
<kbd>ctrl</kbd> + <kbd>alt</kbd> + <kbd>,</kbd> – previous title<br />
<kbd>ctrl</kbd> + <kbd>alt</kbd> + <kbd>.</kbd> – next title<br />
<kbd>ctrl</kbd> + <kbd>alt</kbd> + <kbd>l</kbd> – love title<br />
<kbd>ctrl</kbd> + <kbd>alt</kbd> + <kbd>u</kbd> – unlove title

<!-- END ./docs/Spotify hotkeys.md -->

</details>

###### [Edit Last.fm Scrobbles](https://greasyfork.org/de/scripts/485278-edit-last-fm-scrobbles)
Adds an "Edit scrobble" entry to the context menu of Last.fm

<details>
<summary>details</summary>

<!-- START ./docs/Edit Last.fm Scrobbles.md -->
This script adds the ability to edit scrobbles on Last.fm, even if you don't have Last.fm PRO. It works as a combination of an authenticated Last.fm application to scrobble the corrected song – so you'll have to allow access to the Last.fm application (named "PlaylistLover") first – and JavaScript on the page to simulate a click on delete of the old song. This only works up to 14 days in the past.

<!-- END ./docs/Edit Last.fm Scrobbles.md -->

</details>

###### [Google tab paths](https://greasyfork.org/scripts/389426-google-tab-paths/)
Use tabs to choose the Google search results

<details>
<summary>details</summary>

<!-- START ./docs/Google tab paths.md -->
This script allows to use the <kbd>tab</kbd> key to switch between the Google results.
<!-- END ./docs/Google tab paths.md -->

</details>

###### [closeDoublePage](https://greasyfork.org/scripts/38471-closedoublepage/)
Closes the old tab, if a new one with the same URL emerges

<details>
<summary>details</summary>

<!-- START ./docs/closeDoublePage.md -->
This script closes the old tab, if a new one with the same URL emerges.
On Firefox you might need to open about:config and set allow_scripts_to_close_windows to true.<!-- END ./docs/closeDoublePage.md -->

</details>

###### [last.fm language redirect](https://greasyfork.org/scripts/385900-last-fm-language-redirect/)
Redirects to the last.fm page in the own language

<details>
<summary>details</summary>

<!-- START ./docs/last.fm language redirect.md -->
This script redirects to the last.fm-page of the own language, if it is available.<!-- END ./docs/last.fm language redirect.md -->

</details>

###### [JSON-LD from IMDb to QuickStatements](https://greasyfork.org/scripts/377488-json-ld-from-imdb-to-quickstatements/)
Gets data from JSON-LD of IMDb to QuickStatements, to publish it on Wikidata

<details>
<summary>details</summary>

<!-- START ./docs/JSON-LD from IMDb to QuickStatements.md -->
This script loads data from <a href="http://www.imdb.com/">IMDb</a> for using it in <a href="http://www.wikidata.org/">Wikidata</a>.

To do so, it loads the <a href="http://json-ld.org/">JSON-LD</a> of currently opened IMDb-sites, where some simple statements like actor, writer, date published, etc. (and their IMDb-IDs) are stored. From Wikidata the script loads the according Wikidata items with the help of the IMDb-IDs. The statements then are inserted to the form of <a href="https://tools.wmflabs.org/quickstatements/#/batch">QuickStatements</a> for an import to Wikidata. Source statements are also made. To work, you need to be logged in to QuickStatements and have the tab opened. To import the data click on the button <i>Import V1 commands</i>.

<!-- END ./docs/JSON-LD from IMDb to QuickStatements.md -->

</details>

###### [Get label from Fernsehserien.de](https://greasyfork.org/scripts/429117-get-label-from-fernsehserien-de/)
Offers Fernsehserien.de labels based on the episode number or title as Wikidata label

<details>
<summary>details</summary>

<!-- START ./docs/Get label from Fernsehserien.de.md -->
This script shows possible labels for Wikidata items of TV episodes, which can be added with one click after verifying them. The titles come from Fernsehserien.de and are determined by the original title of the episode and the episode number. The Fernsehserien.de ID of the series is determined from the corresponding TV series Wikidata item. If there is no ID, the script tries to guess one. The reliability of the label is expressed in colors (red, yellow, green). The link to the Fernsehserien.de episode guide is also added.

<!-- END ./docs/Get label from Fernsehserien.de.md -->

</details>

###### [Wikidata Episode Generator](https://greasyfork.org/scripts/433232-wikidata-episode-generator/)
Creates QuickStatements for Wikidata episode items from Wikipedia episode lists

<details>
<summary>details</summary>

<!-- START ./docs/Wikidata Episode Generator.md -->
This script creates missing season and episode items for Wikidata based on Wikipedia episode list articles, IMDb and Fernsehserien.de. It includes basic properties for seasons and episodes, screenwriter and director are identified via Wikipedia links within the episode list, the network, original language and country via the series item from Wikidata. The IMDb-ID and the German label are matched by the episode title and number. 

To generate the episode items, open a Wikipedia article with an episode list. After clicking on "Convert episode list for Wikidata" in the userscript menu, the web console (<kbd>F12</kbd>) shows the process of generating the items, including the text for <a href="https://quickstatements.toolforge.org/">QuickStatements</a>, which is also copied to the clipboard. All statements should be checked for correctness before execution.

<!-- END ./docs/Wikidata Episode Generator.md -->

</details>

### deutsche Scripte
##### [Gmail Calender Connector](https://greasyfork.org/scripts/33508-gmail-calender-connector/)
Füllt bei Anlage eines Kalendereintrages aus einer E-Mail heraus automatisch Datum und Uhrzeit aus

<details>
<summary>details</summary>

<!-- START ./docs/Gmail Calender Connector.md -->
Dieses Script ermittelt bei Anlage eines Kalendereintrages aus Googlemail über "Mehr" > "Termin erstellen" den Zeitpunkt entsprechend des Inhaltes der E-Mail. Dazu sucht es nach bekannten Datums- und Uhrzeitformaten und Wochentagen, füllt den Zeitpunkt, setzt die Dauer auf zwei Stunden und löscht alle Kalendertermin-Teilnehmer.<!-- END ./docs/Gmail Calender Connector.md -->

</details>

###### [Filmografie von IMDb nach Wikipedia](https://greasyfork.org/scripts/373171-filmografie-von-imdb-nach-wikipedia/)
Wandelt die Filmografie von IMDb mithilfe von Wikidata in Wikipedia-Quelltext um

<details>
<summary>details</summary>

<!-- START ./docs/Filmografie von IMDb nach Wikipedia.md -->
Dieses Skript wandelt die Filmografie der IMDb in Wiki-Quelltext einschließlich Wiki-Links um.

Dazu lädt es die Filmografie einer geöffneten IMDb-Seite und vergleicht die IMDb-IDs mit bestehenden Einträgen auf Wikidata. Falls vorhanden, werden die deutschen Titel der Einträge aus dem entsprechenden deutschen Wikipedia-Artikel, der zugehörigen Wikidata-Bezeichnung oder aus der IMDb übernommen. Für den Originaltitel wird zunächst Wikidata konsultiert. Sind dort keine Informationen hinterlegt, wird der Titel aus der IMDb verwendet. Wiki-Links für bestehende Artikel werden automatisch entsprechend den Angaben auf Wikidata gesetzt.

Um die Filmografie zu generieren, muss im Menü des Benutzerskripts auf "Filmografie laden" geklickt werden. Nach ein paar Sekunden erscheint eine Meldung, dass die Filmografie kopiert wurde. Die Filmografie kann mit erweiterten Einstellungen in der Browserkonsole geladen werden. Durch die Angabe der Parameter in ```ladeFilmografie(showShort,episodeLabel);``` kann die Episodenbezeichnung (```"Folge"``` oder ```"Episode"```) gewählt werden, sowie entschieden werden, ob Kurzfilme angezeigt werden sollen oder nicht (```true``` oder ```false```). Die Angabe des Parameters entspricht dem name-Attribut des jeweiligen Abschnitt-Links der Filmografie auf IMDb.

<!-- END ./docs/Filmografie von IMDb nach Wikipedia.md -->

</details>

###### [Wikipedia Artikel Generator](https://greasyfork.org/scripts/430516-wikipedia-artikel-generator/)
Erstellt Grundgerüste für Wikipedia-Artikel von Personen aus Wikidata-Daten

<details>
<summary>details</summary>

<!-- START ./docs/Wikipedia Artikel Generator.md -->
Dieses Script erstellt auf Basis von Wikidata ein Grundgerüst für Wikipedia-Artikel und vereinfacht so die Anlage von Artikeln. Um ein Artikel-Grundgerüst zu generieren, muss ein Artikel mit dem Quelltext-Editor auf Wikipedia im Artikel-Namensraum erstellt werden (etwa durch Anklicken eines Rotlinks, zB [Keith Nobbs (Schauspieler)](https://de.wikipedia.org/wiki/Keith_Nobbs%20(Schauspieler)?action=edit)). Es erscheint eine Eingabeaufforderung mit möglichen auf Wikidata vorhandenen Einträgen. Nach Angabe einer der möglichen Nummern, wird das Grundgerüst geladen. Dies kann einige Zeit dauern. Alternativ kann in der Eingabeaufforderung auch der Bezeichner von Wikidata (Q…) angegeben werden. Derzeit werden nur Personen-Artikel unterstützt.

Das Script ist zurzeit vor allem für Schauspieler-Artikel angepasst, bei anderen Personen-Artikeln werden noch Teile des Artikels geladen, andere Arten von Artikeln führen zurzeit zu einer Fehlermeldung. Abhängig ist das Script dabei immer von der Datengrundlage auf Wikidata. Angelegt werden eine kurze Einleitung mit Bild, Geburtsdaten, Nationalität, Berufen, einige Sätze zum Bildungsweg und Familie, eine kurze Erwähnung wichtiger Filme und Serien, die Filmografie (unter Einbeziehen von Daten der IMDb), Kategorien und Personendaten.

Das Script befindet sich derzeit noch im Entwicklungszustand.

<!-- END ./docs/Wikipedia Artikel Generator.md -->

</details>
